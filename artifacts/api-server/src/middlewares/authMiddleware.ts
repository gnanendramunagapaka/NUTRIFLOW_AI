import type { Request, Response, NextFunction } from "express";
import { db, userProfilesTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { createClient } from "@supabase/supabase-js";

declare global {
  namespace Express {
    interface Request {
      user?: typeof userProfilesTable.$inferSelect;
    }
  }
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;

function getSupabaseClient() {
  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error("FATAL: Supabase URL and Anon Key must be provided in environment variables.");
  }
  return createClient(supabaseUrl, supabaseAnonKey);
}

const supabase = (supabaseUrl && supabaseAnonKey)
  ? createClient(supabaseUrl, supabaseAnonKey)
  : (new Proxy({} as ReturnType<typeof createClient>, {
      get() {
        return getSupabaseClient();
      },
    }));

export async function requireAuth(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      res.status(401).json({ error: "Unauthorized: Missing or invalid token" });
      return;
    }

    const token = authHeader.substring(7);
    if (!token) {
      res.status(401).json({ error: "Unauthorized: Token not provided" });
      return;
    }

    // 1. Verify token with Supabase Auth API
    const { data: { user: supabaseUser }, error } = await supabase.auth.getUser(token);
    if (error || !supabaseUser || !supabaseUser.email) {
      res.status(401).json({ error: "Unauthorized: Invalid or expired session" });
      return;
    }

    const email = supabaseUser.email.toLowerCase().trim();

    // 2. Fetch or auto-provision local database profile
    let [user] = await db
      .select()
      .from(userProfilesTable)
      .where(eq(userProfilesTable.id, supabaseUser.id))
      .limit(1);

    if (!user) {
      // Fallback query by email if created prior
      [user] = await db
        .select()
        .from(userProfilesTable)
        .where(eq(userProfilesTable.email, email))
        .limit(1);
    }

    if (!user) {
      // Auto-provision user profile with Supabase user UUID
      const defaultName = supabaseUser.user_metadata?.name || email.split("@")[0].charAt(0).toUpperCase() + email.split("@")[0].slice(1);
      
      const [created] = await db
        .insert(userProfilesTable)
        .values({
          id: supabaseUser.id,
          name: defaultName,
          email: email,
          onboardingCompleted: false,
          goal: "Stay Healthy",
          dietaryPreferences: [],
          allergies: [],
          wellnessScore: 72,
          streak: 0,
        })
        .returning();
      user = created;
      console.log(`[Auth] Auto-provisioned user profile in database: ${email} (${user.id})`);
    }

    req.user = user;
    next();
  } catch (error) {
    console.error("Auth middleware error:", error);
    next(error);
  }
}

