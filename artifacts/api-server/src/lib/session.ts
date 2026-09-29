import crypto from "node:crypto";

export interface NutriFlowSessionPayload {
  userId: string;
  swiggyUserId?: string;
  iat: number;
  exp: number;
}

export const SESSION_COOKIE_NAME = "nutriflow_session";
export const SESSION_MAX_AGE_SECONDS = 5 * 24 * 60 * 60; // 5 days (matches Swiggy token lifetime)
export const SESSION_MAX_AGE_MS = SESSION_MAX_AGE_SECONDS * 1000;

function getSessionSecret(): string {
  const secret = process.env.SESSION_SECRET || process.env.NUTRIFLOW_SESSION_SECRET;
  if (secret && secret.trim().length >= 16) {
    return secret.trim();
  }

  // Strictly block missing secret in production or Vercel deployment
  if (process.env.NODE_ENV === "production" || process.env.VERCEL) {
    throw new Error(
      "FATAL: SESSION_SECRET or NUTRIFLOW_SESSION_SECRET environment variable must be configured in production!"
    );
  }

  // Explicit development-only fallback that cannot be used in production
  return "nutriflow_dev_only_session_secret_do_not_use_in_production_32chars!";
}

/**
 * Creates a signed stateless session token using HMAC-SHA256.
 */
export function createSessionToken(payload: { userId: string; swiggyUserId?: string }): string {
  const secret = getSessionSecret();
  const now = Math.floor(Date.now() / 1000);
  const sessionData: NutriFlowSessionPayload = {
    userId: payload.userId,
    swiggyUserId: payload.swiggyUserId,
    iat: now,
    exp: now + SESSION_MAX_AGE_SECONDS,
  };

  const headerB64 = Buffer.from(JSON.stringify({ alg: "HS256", typ: "JWT" })).toString("base64url");
  const payloadB64 = Buffer.from(JSON.stringify(sessionData)).toString("base64url");
  const dataToSign = `${headerB64}.${payloadB64}`;

  const signature = crypto
    .createHmac("sha256", secret)
    .update(dataToSign)
    .digest("base64url");

  return `${dataToSign}.${signature}`;
}

/**
 * Verifies a signed session token and returns the payload if valid and unexpired.
 */
export function verifySessionToken(token: string): NutriFlowSessionPayload | null {
  if (!token || typeof token !== "string") return null;

  const parts = token.split(".");
  if (parts.length !== 3) return null;

  const [headerB64, payloadB64, signature] = parts;
  const dataToSign = `${headerB64}.${payloadB64}`;

  try {
    const secret = getSessionSecret();
    const expectedSignature = crypto
      .createHmac("sha256", secret)
      .update(dataToSign)
      .digest("base64url");

    // Timing-safe comparison to prevent timing attacks
    const sigBuf = Buffer.from(signature);
    const expBuf = Buffer.from(expectedSignature);
    if (sigBuf.length !== expBuf.length || !crypto.timingSafeEqual(sigBuf, expBuf)) {
      return null;
    }

    const payload: NutriFlowSessionPayload = JSON.parse(
      Buffer.from(payloadB64, "base64url").toString("utf-8")
    );

    const now = Math.floor(Date.now() / 1000);
    if (payload.exp && payload.exp < now) {
      return null; // Expired
    }

    if (!payload.userId) {
      return null;
    }

    return payload;
  } catch {
    return null;
  }
}

/**
 * Extracts and structurally validates the authenticated Swiggy user ID from a Swiggy access token JWT.
 *
 * SECURITY & ARCHITECTURAL NOTES:
 * 1. Transport Security:
 *    The access token is received directly from Swiggy's token endpoint (POST https://mcp.swiggy.com/auth/token)
 *    over an encrypted HTTPS connection during the server-to-server OAuth 2.1 authorization-code + PKCE exchange.
 * 2. Structural Parsing vs. Cryptographic Verification:
 *    The application structurally validates and parses the returned JWT to obtain the identity claim (`sub`).
 *    Cryptographic JWT signature verification is NOT independently performed by NutriFlow because Swiggy does
 *    not publish or document a public JWKS (JSON Web Key Set) or signing-key endpoint in the available integration
 *    documentation.
 * 3. Downstream Enforcement:
 *    The raw token is stored securely server-side and presented back as the bearer credential to Swiggy's MCP
 *    resource servers (e.g. https://mcp.swiggy.com/{food,im,dineout}), where Swiggy's own infrastructure authoritatively
 *    authenticates, cryptographically validates, and enforces access control and revocation on every API request.
 */
export function extractSwiggyUserIdFromToken(accessToken: string): string {
  if (!accessToken || typeof accessToken !== "string") {
    throw new Error("Swiggy access token is missing or not a string");
  }

  const parts = accessToken.split(".");
  // Require exactly 3 JWT segments (header, payload, signature)
  if (parts.length !== 3) {
    throw new Error(
      `Invalid Swiggy access token format: expected exactly 3 period-delimited segments, received ${parts.length}`
    );
  }

  const [headerB64, payloadB64, signatureB64] = parts;

  // Require non-empty header, payload, and signature segments
  if (!headerB64 || !headerB64.trim()) {
    throw new Error("Invalid Swiggy access token: JWT header segment is empty");
  }
  if (!payloadB64 || !payloadB64.trim()) {
    throw new Error("Invalid Swiggy access token: JWT payload segment is empty");
  }
  if (!signatureB64 || !signatureB64.trim()) {
    throw new Error("Invalid Swiggy access token: JWT signature segment is empty");
  }

  // Decode and parse JWT header
  let header: any;
  try {
    const headerJson = Buffer.from(headerB64, "base64url").toString("utf-8");
    header = JSON.parse(headerJson);
  } catch (err: any) {
    throw new Error(`Failed to decode or parse Swiggy access token header: ${err.message}`);
  }

  if (!header || typeof header !== "object") {
    throw new Error("Invalid Swiggy access token header: expected JSON object");
  }

  // Decode and parse JWT payload
  let payload: any;
  try {
    const payloadJson = Buffer.from(payloadB64, "base64url").toString("utf-8");
    payload = JSON.parse(payloadJson);
  } catch (err: any) {
    throw new Error(`Failed to decode or parse Swiggy access token payload: ${err.message}`);
  }

  if (!payload || typeof payload !== "object") {
    throw new Error("Invalid Swiggy access token payload: expected JSON object");
  }

  // Require payload.sub to be a non-empty string
  const sub = payload.sub;
  if (!sub || typeof sub !== "string" || !sub.trim()) {
    throw new Error("Swiggy access token does not contain a valid non-empty 'sub' (Subject) identity claim");
  }

  // If payload.exp exists, verify it is numeric and has not expired
  if (payload.exp !== undefined && payload.exp !== null) {
    const expNum = Number(payload.exp);
    if (isNaN(expNum)) {
      throw new Error("Invalid Swiggy access token: 'exp' claim is not numeric");
    }
    const nowSec = Math.floor(Date.now() / 1000);
    if (expNum <= nowSec) {
      throw new Error(`Swiggy access token is expired according to 'exp' claim (exp=${expNum}, now=${nowSec})`);
    }
  }

  return sub.trim();
}
