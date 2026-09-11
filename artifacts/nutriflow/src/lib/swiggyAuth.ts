import { supabase } from "./supabaseClient";

export async function connectSwiggyAccount(): Promise<boolean> {
  try {
    localStorage.setItem("swiggy_mcp_connected", "true");
    
    // Check if an active session exists
    let { data: { session } } = await supabase.auth.getSession();

    // If unauthenticated, sign in anonymously or create a guest session
    if (!session) {
      const { data, error } = await supabase.auth.signInAnonymously();
      if (!error && data.session) {
        session = data.session;
      }
    }

    if (session) {
      await supabase.auth.updateUser({
        data: { swiggy_connected: true, swiggy_linked_at: new Date().toISOString() }
      });
    }

    return true;
  } catch (err) {
    console.error("Failed to connect Swiggy account:", err);
    // Still allow local fallback so user isn't blocked
    localStorage.setItem("swiggy_mcp_connected", "true");
    return true;
  }
}

export function isSwiggyConnected(): boolean {
  return localStorage.getItem("swiggy_mcp_connected") === "true";
}
