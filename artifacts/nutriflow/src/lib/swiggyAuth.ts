import { supabase } from "./supabaseClient";

export async function connectSwiggyAccount(): Promise<boolean> {
  try {
    // Persist local flags immediately so hooks/guards can react synchronously
    localStorage.setItem("swiggy_mcp_connected", "true");
    localStorage.setItem("nutriflow_guest_session", "true");

    // Attempt Supabase anonymous sign in if no session exists
    const { data: { session: existingSession } } = await supabase.auth.getSession();

    if (!existingSession) {
      const { data, error } = await supabase.auth.signInAnonymously();
      if (error) {
        console.warn("Supabase anonymous auth disabled/failed. Operating on local guest session:", error.message);
      } else if (data?.session) {
        await supabase.auth.updateUser({
          data: { swiggy_connected: true, swiggy_linked_at: new Date().toISOString() }
        });
      }
    } else {
      await supabase.auth.updateUser({
        data: { swiggy_connected: true, swiggy_linked_at: new Date().toISOString() }
      });
    }

    return true;
  } catch (err) {
    console.error("Swiggy connection error:", err);
    // Ensure local fallback is set so the app can continue as guest
    localStorage.setItem("swiggy_mcp_connected", "true");
    localStorage.setItem("nutriflow_guest_session", "true");
    return true;
  }
}

export function isSwiggyConnected(): boolean {
  return localStorage.getItem("swiggy_mcp_connected") === "true";
}
