import { createClient } from "@supabase/supabase-js";

const supabaseUrl = (import.meta.env.VITE_SUPABASE_URL as string) || "https://tnjnvsimwjsyewbshhsx.supabase.co";
const supabaseAnonKey = (import.meta.env.VITE_SUPABASE_ANON_KEY as string) || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRuam52c2ltd2pzeWV3YnNoaHN4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk1MjY1NDgsImV4cCI6MjA5NTEwMjU0OH0.0P37ulhMU0bs9BoOq0GMAxrX5k6x3hsIYuoNhg1hkzU";

if (!import.meta.env.VITE_SUPABASE_URL || !import.meta.env.VITE_SUPABASE_ANON_KEY) {
  console.warn(
    "VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY missing in runtime environment. Utilizing standard project fallbacks."
  );
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});
