import { supabase } from "./supabaseClient";

/**
 * TASK-008: Initiates Swiggy OAuth 2.1 authorization by requesting authorization URL
 * and PKCE challenge from the backend API server.
 */
export async function initiateSwiggyOAuth(): Promise<void> {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    const token = session?.access_token || "";

    const response = await fetch("/api/swiggy/auth/start", {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    });

    if (!response.ok) {
      console.warn("Failed to retrieve Swiggy authorization URL from backend.");
      return;
    }

    const data = await response.json();
    if (data?.authorizationUrl && typeof window !== "undefined") {
      window.location.href = data.authorizationUrl;
    }
  } catch (err) {
    console.error("[SwiggyAuth] initiateSwiggyOAuth failed:", err);
  }
}

/**
 * Queries server-side connection status for the authenticated user.
 */
export async function fetchSwiggyConnectionStatus(): Promise<{ connected: boolean; status: string }> {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return { connected: false, status: "DISCONNECTED" };

    const response = await fetch("/api/swiggy/status", {
      headers: {
        Authorization: `Bearer ${session.access_token}`,
      },
    });

    if (!response.ok) return { connected: false, status: "DISCONNECTED" };
    return await response.json();
  } catch {
    return { connected: false, status: "DISCONNECTED" };
  }
}

export const connectSwiggyAccount = initiateSwiggyOAuth;

export async function isSwiggyConnected(): Promise<boolean> {
  const status = await fetchSwiggyConnectionStatus();
  return status.connected;
}

/**
 * TASK-040: Disconnects Swiggy account server-side.
 */
export async function disconnectSwiggyAccount(): Promise<boolean> {
  try {
    localStorage.removeItem("swiggy_access_token");
    localStorage.removeItem("swiggy_mcp_connected");
    
    const { data: { session } } = await supabase.auth.getSession();
    if (session) {
      await fetch("/api/swiggy/disconnect", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });
    }
    return true;
  } catch (err) {
    console.error("Disconnect error:", err);
    return false;
  }
}
