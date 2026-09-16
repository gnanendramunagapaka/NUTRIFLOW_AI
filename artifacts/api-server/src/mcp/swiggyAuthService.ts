import { DbService } from "../services/dbService";
import { swiggyConfig } from "../lib/swiggyConfig";
import {
  createOAuthTransaction,
  getAndConsumeOAuthTransaction,
  buildAuthorizationUrl,
  OAuthTransaction,
} from "./oauthStore";

export interface TokenExchangeResponse {
  access_token: string;
  token_type?: string;
  expires_in?: number;
  refresh_token?: string;
  scope?: string;
}

export interface SwiggyConnectionStatus {
  connected: boolean;
  status: "DISCONNECTED" | "AUTHORIZING" | "AUTHORIZED" | "CONNECTED" | "TOKEN_EXPIRED" | "AUTH_FAILED" | "MCP_UNAVAILABLE";
  linkedAt?: string;
  expiresAt?: string;
  scope?: string;
}

export interface SwiggyDcrResponse {
  client_id?: string;
  client_secret?: string;
  client_name?: string;
  redirect_uris?: string[];
  grant_types?: string[];
}

let registeredClientId: string | null = null;

/**
 * TASK-002 & DCR: Performs Dynamic Client Registration (RFC 7591) with Swiggy OAuth.
 * Sends POST request to https://mcp.swiggy.com/auth/register with client metadata.
 * Caches and returns the dynamic client_id.
 */
export async function getOrRegisterSwiggyClientId(): Promise<string> {
  if (process.env.SWIGGY_CLIENT_ID) {
    return process.env.SWIGGY_CLIENT_ID;
  }

  if (registeredClientId) {
    return registeredClientId;
  }

  try {
    const response = await fetch(swiggyConfig.registerUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({
        client_name: "NutriFlow AI",
        redirect_uris: [swiggyConfig.redirectUri],
        grant_types: ["authorization_code"],
        response_types: ["code"],
        token_endpoint_auth_method: "none",
      }),
    });

    if (response.ok) {
      const data = (await response.json()) as SwiggyDcrResponse;
      if (data && data.client_id) {
        registeredClientId = data.client_id;
        console.log(`[SwiggyOAuth] Dynamic Client Registration successful. client_id: ${data.client_id}`);
        return data.client_id;
      }
    } else {
      const errText = await response.text().catch(() => "");
      console.warn(`[SwiggyOAuth] DCR registration HTTP ${response.status}:`, errText);
    }
  } catch (err: any) {
    console.warn("[SwiggyOAuth] DCR registration network exception:", err?.message || err);
  }

  return swiggyConfig.clientId;
}

/**
 * TASK-008: Begins the Swiggy OAuth 2.1 flow by registering/retrieving dynamic client_id,
 * generating PKCE verifier/challenge, creating an OAuth transaction bound to user, and returning auth URL.
 */
export async function startSwiggyAuth(userId: number): Promise<{ authorizationUrl: string; state: string }> {
  const clientId = await getOrRegisterSwiggyClientId();
  const transaction = createOAuthTransaction(userId, clientId);
  const authorizationUrl = buildAuthorizationUrl(transaction);
  return { authorizationUrl, state: transaction.state };
}

/**
 * TASK-009 & TASK-010: Processes the OAuth callback.
 * 1. Validates the OAuth state and retrieves the server-side PKCE verifier.
 * 2. Performs server-side authorization-code exchange with Swiggy Token endpoint.
 * 3. Persists the access token securely in the database bound to the user.
 * 
 * SECURITY: Access tokens are handled server-side ONLY and never sent to browser storage.
 */
export async function handleSwiggyOAuthCallback(
  code: string | undefined,
  state: string | undefined,
  error: string | undefined,
  errorDescription?: string
): Promise<{ success: boolean; userId?: number; error?: string }> {
  // Handle explicit OAuth error from provider
  if (error) {
    console.warn(`[SwiggyOAuth] Authorization denied or error returned: ${error} - ${errorDescription || ""}`);
    return { success: false, error: errorDescription || `OAuth Error: ${error}` };
  }

  if (!code) {
    return { success: false, error: "Missing authorization code" };
  }

  // TASK-007 & TASK-009: Validate state and retrieve PKCE verifier
  const transaction = getAndConsumeOAuthTransaction(state);
  if (!transaction) {
    console.warn("[SwiggyOAuth] State validation failed or transaction expired.");
    return { success: false, error: "Invalid or expired OAuth state parameter" };
  }

  // TASK-010: Server-side Token Exchange using PKCE verifier & transaction client_id
  try {
    const tokenData = await exchangeAuthorizationCode(code, transaction.codeVerifier, transaction.clientId);
    
    if (!tokenData || !tokenData.access_token) {
      return { success: false, error: "Token exchange failed: no access token returned" };
    }

    // Default expiration: 5 days (432,000s) as per REQ-TOKEN-005 unless specified by provider
    const expiresIn = tokenData.expires_in || 5 * 24 * 60 * 60;

    // TASK-011 & TASK-012: Save Swiggy connection in DB bound to user
    await saveSwiggyConnection(
      transaction.userId,
      tokenData.access_token,
      expiresIn,
      tokenData.scope || swiggyConfig.scope,
      tokenData.refresh_token
    );

    console.log(`[SwiggyOAuth] Successfully authorized and stored Swiggy credentials for user ${transaction.userId}`);
    return { success: true, userId: transaction.userId };
  } catch (err: any) {
    console.error("[SwiggyOAuth] Token exchange exception:", err?.message || err);
    return { success: false, error: err?.message || "Token exchange failed" };
  }
}

/**
 * TASK-010: Performs POST request to Swiggy Token Endpoint with PKCE verifier.
 * Server-side ONLY.
 */
export async function exchangeAuthorizationCode(
  code: string,
  codeVerifier: string,
  clientId?: string
): Promise<TokenExchangeResponse> {
  const bodyParams: Record<string, string> = {
    grant_type: "authorization_code",
    code,
    redirect_uri: swiggyConfig.redirectUri,
    client_id: clientId || swiggyConfig.clientId,
    code_verifier: codeVerifier,
  };

  if (swiggyConfig.clientSecret) {
    bodyParams.client_secret = swiggyConfig.clientSecret;
  }

  const response = await fetch(swiggyConfig.tokenUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify(bodyParams),
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => "");
    console.warn(`[SwiggyOAuth] Token endpoint HTTP ${response.status}:`, errorText);
    
    // REQ-TOKEN-006: NO FAKE TOKENS ON FAILURE
    throw new Error(`Swiggy token endpoint rejected authorization code (HTTP ${response.status})`);
  }

  const data = (await response.json()) as TokenExchangeResponse;
  if (!data.access_token) {
    throw new Error("Swiggy token endpoint returned invalid JSON (missing access_token)");
  }

  return data;
}

/**
 * TASK-011 & TASK-012: Persists Swiggy connection in database.
 * Associated with exact NutriFlow user ID.
 */
export async function saveSwiggyConnection(
  userId: number,
  accessToken: string,
  expiresInSeconds: number,
  scope: string = "mcp:tools",
  refreshToken?: string
): Promise<void> {
  const expiresAt = new Date(Date.now() + expiresInSeconds * 1000);
  await DbService.saveSwiggyConnection(userId, accessToken, expiresAt, scope, refreshToken);
}

/**
 * TASK-012: Retrieves Swiggy connection for user.
 * Strictly enforces user isolation (User A cannot access User B's connection).
 */
export async function getSwiggyConnectionForUser(userId: number) {
  const conn = await DbService.getSwiggyConnectionByUserId(userId);
  return conn || null;
}

/**
 * Checks if a user has a valid (non-expired) Swiggy connection.
 */
export async function getSwiggyStatusForUser(userId: number): Promise<SwiggyConnectionStatus> {
  const conn = await getSwiggyConnectionForUser(userId);
  if (!conn) {
    return { connected: false, status: "DISCONNECTED" };
  }

  const isExpired = new Date() > conn.expiresAt;
  if (isExpired) {
    return {
      connected: false,
      status: "TOKEN_EXPIRED",
      linkedAt: conn.createdAt.toISOString(),
      expiresAt: conn.expiresAt.toISOString(),
      scope: conn.scope,
    };
  }

  return {
    connected: true,
    status: "CONNECTED",
    linkedAt: conn.createdAt.toISOString(),
    expiresAt: conn.expiresAt.toISOString(),
    scope: conn.scope,
  };
}

/**
 * Checks if a user has a valid (non-expired) Swiggy connection.
 */
export async function isSwiggyConnected(userId: number): Promise<boolean> {
  const status = await getSwiggyStatusForUser(userId);
  return status.connected;
}

export const isSwiggyConnectionValid = isSwiggyConnected;

/**
 * TASK-040: Disconnects Swiggy account by removing stored database credentials for user.
 */
export async function disconnectSwiggyUser(userId: number): Promise<boolean> {
  return await DbService.deleteSwiggyConnection(userId);
}
