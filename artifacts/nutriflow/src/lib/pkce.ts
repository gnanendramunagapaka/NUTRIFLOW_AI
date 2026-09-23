/**
 * PKCE (Proof Key for Code Exchange) utility for Swiggy OAuth 2.1
 *
 * Generates a code_verifier (32 random bytes, base64url encoded) and
 * code_challenge (SHA-256 hash of verifier, base64url encoded) per the
 * Swiggy Builders Club OAuth specification.
 *
 * Values are stored in sessionStorage so they survive the redirect
 * to Swiggy's authorize endpoint but don't persist across tabs/sessions.
 */

function base64urlEncode(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export interface PKCEChallenge {
  codeVerifier: string;
  codeChallenge: string;
  state: string;
}

/**
 * Generate PKCE challenge parameters using Web Crypto API.
 * - code_verifier: 32 random bytes → base64url (43 chars)
 * - code_challenge: SHA-256(code_verifier) → base64url
 * - state: 16 random bytes → base64url (for CSRF protection)
 */
export async function generatePKCE(): Promise<PKCEChallenge> {
  // Generate code_verifier: 32 random bytes → base64url
  const verifierBytes = new Uint8Array(32);
  crypto.getRandomValues(verifierBytes);
  const codeVerifier = base64urlEncode(verifierBytes.buffer);

  // Generate code_challenge: SHA-256(code_verifier) → base64url
  const encoder = new TextEncoder();
  const data = encoder.encode(codeVerifier);
  const digest = await crypto.subtle.digest("SHA-256", data);
  const codeChallenge = base64urlEncode(digest);

  // Generate state for CSRF protection: 16 random bytes → base64url
  const stateBytes = new Uint8Array(16);
  crypto.getRandomValues(stateBytes);
  const state = base64urlEncode(stateBytes.buffer);

  return { codeVerifier, codeChallenge, state };
}

/**
 * Store PKCE values in sessionStorage for retrieval after redirect.
 */
export function storePKCE(verifier: string, state: string): void {
  sessionStorage.setItem("swiggy_pkce_verifier", verifier);
  sessionStorage.setItem("swiggy_pkce_state", state);
}

/**
 * Retrieve and clear stored PKCE values from sessionStorage.
 */
export function retrievePKCE(): { codeVerifier: string | null; state: string | null } {
  const codeVerifier = sessionStorage.getItem("swiggy_pkce_verifier");
  const state = sessionStorage.getItem("swiggy_pkce_state");
  return { codeVerifier, state };
}

/**
 * Clear PKCE values from sessionStorage.
 */
export function clearPKCE(): void {
  sessionStorage.removeItem("swiggy_pkce_verifier");
  sessionStorage.removeItem("swiggy_pkce_state");
}
