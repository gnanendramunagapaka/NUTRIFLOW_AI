import type { Request, Response, NextFunction } from "express";
import { DbService, type UserProfileModel } from "../services/dbService";
import { createClient } from "@supabase/supabase-js";

declare global {
  namespace Express {
    interface Request {
      user?: UserProfileModel;
    }
  }
}

const supabaseUrl =
  process.env.SUPABASE_URL ||
  process.env.NEXT_PUBLIC_SUPABASE_URL ||
  process.env.VITE_SUPABASE_URL;

const supabaseAnonKey =
  process.env.SUPABASE_SECRET_KEY ||
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error("FATAL: Supabase URL and Key must be provided in environment variables.");
}

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

    // 2. Fetch or auto-provision user profile via Supabase Data API
    let user = await DbService.getUserByEmail(email);

    if (!user) {
      // Auto-provision user profile
      const defaultName = supabaseUser.user_metadata?.name || email.split("@")[0].charAt(0).toUpperCase() + email.split("@")[0].slice(1);
      
      user = await DbService.createUserProfile({
        name: defaultName,
        email: email,
        password: "supabase_auth",
        isEmailVerified,
        onboardingCompleted: false,
        goal: "Stay Healthy",
        dietaryPreferences: [],
        allergies: [],
        wellnessScore: 72,
        streak: 0,
      });
      console.log(`[Auth] Auto-provisioned user profile in database via Data API: ${email}`);
    } else {
      // Update email verified status if it changed
      if (user.isEmailVerified !== isEmailVerified) {
        user = await DbService.updateUserProfile(user.id, { isEmailVerified });
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
