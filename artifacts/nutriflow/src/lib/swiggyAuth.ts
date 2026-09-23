/**
 * Swiggy Builders Club OAuth 2.1 + PKCE Authentication
 *
 * Based strictly on official Swiggy MCP documentation:
 * - Authorization: GET https://mcp.swiggy.com/auth/authorize
 * - Token exchange: POST https://mcp.swiggy.com/auth/token (server-side)
 * - Scope: mcp:tools
 * - No client_secret required (public PKCE client)
 * - Exact Redirect URI: https://nutriflow-ai.vercel.app/auth/callback (NO trailing slash)
 */

import { generatePKCE, storePKCE } from "./pkce";
import { supabase } from "./supabaseClient";

// ─── Configuration ────────────────────────────────────────────────────────────

export const EXACT_SWIGGY_REDIRECT_URI = "https://nutriflow-ai.vercel.app/auth/callback";

export function getRedirectUri(): string {
  const envUri = import.meta.env.VITE_SWIGGY_REDIRECT_URI as string;
  if (envUri) return envUri;

  if (typeof window !== "undefined") {
    return `${window.location.origin}/auth/callback`;
  }
  return EXACT_SWIGGY_REDIRECT_URI;
}

/**
 * Fetch dynamic or configured Swiggy client configuration from the backend.
 */
export async function getSwiggyConfig(): Promise<{
  clientId: string;
  redirectUri: string;
  authUrl: string;
}> {
  try {
    const res = await fetch("/api/swiggy/config");
    if (res.ok) {
      const data = await res.json();
      if (data.clientId) {
        return data;
      }
    }
  } catch (e) {
    console.warn("[Swiggy Auth] Failed to fetch config from backend:", e);
  }

  const fallbackClientId = (import.meta.env.VITE_SWIGGY_CLIENT_ID as string) || "";
  return {
    clientId: fallbackClientId,
    redirectUri: getRedirectUri(),
    authUrl: "https://mcp.swiggy.com/auth/authorize",
  };
}

// ─── OAuth 2.1 PKCE Flow ──────────────────────────────────────────────────────

/**
 * Initiate the Swiggy OAuth 2.1 PKCE authorization flow.
 * Generates PKCE challenge, stores verifier in sessionStorage,
 * and redirects to Swiggy's authorization endpoint.
 *
 * @param returnTo - Optional path to return to after successful auth (default: /profile)
 */
export async function initiateSwiggyOAuth(returnTo?: string): Promise<void> {
  const config = await getSwiggyConfig();
  if (!config.clientId) {
    throw new Error("Swiggy Client ID is not configured. Please ensure Dynamic Client Registration or SWIGGY_CLIENT_ID is set.");
  }

  const { codeVerifier, codeChallenge, state } = await generatePKCE();

  // Store PKCE values for retrieval after redirect
  storePKCE(codeVerifier, state);

  // Store return URL
  if (returnTo) {
    sessionStorage.setItem("swiggy_auth_return_to", returnTo);
  }

  const redirectUri = config.redirectUri || getRedirectUri();

  const params = new URLSearchParams({
    response_type: "code",
    client_id: config.clientId,
    redirect_uri: redirectUri,
    code_challenge: codeChallenge,
    code_challenge_method: "S256",
    state: state,
    scope: "mcp:tools",
  });

  const authUrl = `${config.authUrl || "https://mcp.swiggy.com/auth/authorize"}?${params.toString()}`;

  if (typeof window !== "undefined") {
    window.location.href = authUrl;
  }
}

export const connectSwiggyAccount = initiateSwiggyOAuth;

// ─── Connection Status (via backend API) ──────────────────────────────────────

async function getAuthHeader(): Promise<Record<string, string>> {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.access_token) {
      return { Authorization: `Bearer ${session.access_token}` };
    }
  } catch {
    // ignore
  }
  return {};
}

/**
 * Check Swiggy connection status from the backend for the current user.
 * Returns { connected, expiresAt } — never exposes raw tokens.
 */
export async function getSwiggyConnectionStatus(): Promise<{
  connected: boolean;
  expiresAt: string | null;
}> {
  try {
    const authHeaders = await getAuthHeader();
    if (!authHeaders.Authorization) {
      return { connected: false, expiresAt: null };
    }

    const response = await fetch("/api/swiggy/status", {
      headers: {
        ...authHeaders,
      },
    });

    if (!response.ok) {
      return { connected: false, expiresAt: null };
    }
    return await response.json();
  } catch {
    return { connected: false, expiresAt: null };
  }
}

/**
 * Disconnect Swiggy account via backend (revokes user's stored token in DB).
 */
export async function disconnectSwiggy(): Promise<boolean> {
  try {
    const authHeaders = await getAuthHeader();
    if (!authHeaders.Authorization) {
      return false;
    }

    const response = await fetch("/api/swiggy/disconnect", {
      method: "POST",
      headers: {
        ...authHeaders,
      },
    });
    return response.ok;
  } catch {
    return false;
  }
}

/**
 * Synchronous helper for initial render state. Returns false until verified by getSwiggyConnectionStatus().
 */
export function isSwiggyConnected(): boolean {
  return false;
}

