import { Router, type IRouter } from "express";
import { requireAuth } from "../middlewares/authMiddleware";
import { buildProfileContextFromProfile } from "../lib/profileContext";
import {
  RecommendationRequestSchema,
  executeSharedRecommendation,
} from "@workspace/api-zod";

const router: IRouter = Router();

/**
 * POST /recommendations (mounted under /api -> POST /api/recommendations)
 *
 * Authenticated endpoint for the Shared Recommendation Service.
 *
 * Flow:
 * 1. Authenticate user session strictly via requireAuth middleware.
 * 2. Load authenticated user's ProfileContext from database record (cannot be overridden by client).
 * 3. Validate request payload against RecommendationRequestSchema.
 * 4. Execute deterministic recommendation pipeline (Safety -> Matching -> Ranking).
 * 5. Return structured, transparent recommendations and exclusions.
 */
router.post("/recommendations", requireAuth, async (req, res): Promise<void> => {
  try {
    const user = req.user;
    if (!user) {
      res.status(401).json({ error: "Unauthorized: Missing authenticated user" });
      return;
    }

    // Build authoritative ProfileContext from verified DB record
    const profileContext = buildProfileContextFromProfile(user);

    // Validate request payload
    const parsed = RecommendationRequestSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({
        error: "Invalid recommendation request payload",
        details: parsed.error.errors.map((e) => `${e.path.join(".")}: ${e.message}`),
      });
      return;
    }

    // Execute deterministic recommendation orchestration
    const recommendationResult = executeSharedRecommendation(profileContext, parsed.data);

    res.json(recommendationResult);
  } catch (error) {
    console.error("[Recommendations Route] Execution error:", error);
    res.status(500).json({ error: "Failed to generate recommendations" });
  }
});

export default router;
