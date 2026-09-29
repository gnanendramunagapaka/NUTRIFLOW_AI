import type { Request, Response, NextFunction } from "express";
import { db, userProfilesTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { verifySessionToken, SESSION_COOKIE_NAME } from "../lib/session";

declare global {
  namespace Express {
    interface Request {
      user?: typeof userProfilesTable.$inferSelect;
    }
  }
}

/**
 * Authentication middleware that verifies the server-managed NutriFlow session.
 * Reads the session token from HttpOnly cookie (or Bearer header) and strictly resolves
 * the database user profile matching the session's internal userId UUID.
 */
export async function requireAuth(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    // 1. Resolve session token from HttpOnly cookie (primary) or Authorization Bearer header (fallback)
    let token = req.cookies?.[SESSION_COOKIE_NAME];
    
    if (!token) {
      const authHeader = req.headers.authorization;
      if (authHeader && authHeader.startsWith("Bearer ")) {
        token = authHeader.substring(7).trim();
      }
    }

    if (!token) {
      res.status(401).json({ error: "Unauthorized: Missing or invalid session" });
      return;
    }

    // 2. Cryptographically verify NutriFlow session signature and expiration
    const payload = verifySessionToken(token);
    if (!payload || !payload.userId) {
      res.status(401).json({ error: "Unauthorized: Invalid or expired session" });
      return;
    }

    // 3. Resolve user profile strictly by internal UUID from verified session token
    const [user] = await db
      .select()
      .from(userProfilesTable)
      .where(eq(userProfilesTable.id, payload.userId))
      .limit(1);

    if (!user) {
      res.status(401).json({ error: "Unauthorized: User profile not found" });
      return;
    }

    req.user = user;
    next();
  } catch (error) {
    console.error("[Auth Middleware] Session verification error:", error);
    res.status(500).json({ error: "Authentication verification failed" });
  }
}
