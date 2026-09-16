import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { config as loadDotenv } from "./dotenv";

loadDotenv();

const supabaseUrl =
  process.env.SUPABASE_URL ||
  process.env.NEXT_PUBLIC_SUPABASE_URL ||
  process.env.VITE_SUPABASE_URL;

const supabaseKey =
  process.env.SUPABASE_SECRET_KEY ||
  process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl) {
  throw new Error(
    "FATAL: Supabase URL must be provided in environment variables (SUPABASE_URL).",
  );
}

if (!supabaseKey) {
  throw new Error(
    "FATAL: Server-only Supabase secret key must be provided in environment variables (SUPABASE_SECRET_KEY or SUPABASE_SERVICE_ROLE_KEY). Public browser keys (ANON_KEY) are prohibited for server admin client.",
  );
}

export const supabaseAdmin: SupabaseClient = createClient(
  supabaseUrl,
  supabaseKey,
  {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  },
);

export default supabaseAdmin;
