import { supabase } from "./supabaseClient";

export async function connectSwiggyAccount(): Promise<boolean> {
  try {
    localStorage.setItem("swiggy_mcp_connected", "true");
    
    const { data: { session } } = await supabase.auth.getSession();
    if (session) {
      await supabase.auth.updateUser({
        data: { swiggy_connected: true, swiggy_linked_at: new Date().toISOString() }
      });
    }
    return true;
  } catch (err) {
    console.error("Failed to mark Swiggy as connected:", err);
    return false;
  }
}

export function isSwiggyConnected(): boolean {
  return localStorage.getItem("swiggy_mcp_connected") === "true";
}
