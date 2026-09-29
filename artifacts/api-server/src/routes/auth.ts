import { Router } from "express";
import { requireAuth } from "../middlewares/authMiddleware";
import { SESSION_COOKIE_NAME, verifySessionToken } from "../lib/session";
import { db, userProfilesTable } from "@workspace/db";
import { eq } from "drizzle-orm";

const router = Router();

// GET /api/auth/me
// Returns the profile of the currently authenticated NutriFlow session user.
router.get("/auth/me", async (req, res): Promise<void> => {
  try {
    let token = req.cookies?.[SESSION_COOKIE_NAME];
    if (!token && req.headers.authorization?.startsWith("Bearer ")) {
      token = req.headers.authorization.substring(7).trim();
    }

    if (!token) {
      res.json({ authenticated: false, user: null });
      return;
    }

    const payload = verifySessionToken(token);
    if (!payload || !payload.userId) {
      res.clearCookie(SESSION_COOKIE_NAME, { path: "/" });
      res.json({ authenticated: false, user: null });
      return;
    }

    const [user] = await db
      .select()
      .from(userProfilesTable)
      .where(eq(userProfilesTable.id, payload.userId))
      .limit(1);

    if (!user) {
      res.clearCookie(SESSION_COOKIE_NAME, { path: "/" });
      res.json({ authenticated: false, user: null });
      return;
    }

    res.json({
      authenticated: true,
      user,
    });
  } catch (error) {
    console.error("[Auth] GET /auth/me error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// POST /api/auth/logout
// Clears the NutriFlow session cookie.
router.post("/auth/logout", async (_req, res): Promise<void> => {
  res.clearCookie(SESSION_COOKIE_NAME, { path: "/" });
  res.json({ success: true, authenticated: false });
});

export default router;
