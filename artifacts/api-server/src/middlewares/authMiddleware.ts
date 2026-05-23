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

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://tnjnvsimwjsyewbshhsx.supabase.co";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRuam52c2ltd2pzeWV3YnNoaHN4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk1MjY1NDgsImV4cCI6MjA5NTEwMjU0OH0.0P37ulhMU0bs9BoOq0GMAxrX5k6x3hsIYuoNhg1hkzU";

const supabase = createClient(supabaseUrl, supabaseAnonKey);

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
    const isEmailVerified = !!supabaseUser.email_confirmed_at;

    // 2. Fetch or auto-provision local database profile
    let [user] = await db
      .select()
      .from(userProfilesTable)
      .where(eq(userProfilesTable.email, email))
      .limit(1);

    if (!user) {
      // Auto-provision user profile
      const defaultName = supabaseUser.user_metadata?.name || email.split("@")[0].charAt(0).toUpperCase() + email.split("@")[0].slice(1);
      
      const [created] = await db
        .insert(userProfilesTable)
        .values({
          name: defaultName,
          email: email,
          password: "supabase_auth", // Dummy password placeholder to satisfy db constraints
          isEmailVerified,
          onboardingCompleted: false,
          goal: "Stay Healthy",
          dietaryPreferences: [],
          allergies: [],
          wellnessScore: 72,
          streak: 0,
        })
        .returning();
      user = created;
      console.log(`[Auth] Auto-provisioned user profile in database: ${email}`);
    } else {
      // Update email verified status if it changed
      if (user.isEmailVerified !== isEmailVerified) {
        const [updated] = await db
          .update(userProfilesTable)
          .set({ isEmailVerified })
          .where(eq(userProfilesTable.id, user.id))
          .returning();
        user = updated;
        console.log(`[Auth] Updated verification status for user in database: ${email}`);
      }
    }

    req.user = user;
    next();
  } catch (error) {
    console.error("Auth middleware error:", error);
    next(error);
  }
}
