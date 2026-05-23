import { Router } from "express";
import { requireAuth } from "../middlewares/authMiddleware";

const router = Router();

// GET /api/auth/me
// Returns the profile of the currently authenticated Supabase user.
router.get("/auth/me", requireAuth, async (req, res): Promise<void> => {
  try {
    const { password: _, verificationCode: __, ...profile } = req.user!;
    res.json({
      user: profile,
    });
  } catch (error) {
    console.error("GET /auth/me error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
