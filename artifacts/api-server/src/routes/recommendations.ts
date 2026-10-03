import { Router, type IRouter } from "express";
import { requireAuth } from "../middlewares/authMiddleware";
import { buildProfileContextFromProfile } from "../lib/profileContext";
import {
  RecommendationRequestSchema,
  executeSharedRecommendation,
  FoodRecommendationRequestSchema,
  InstamartRecommendationRequestSchema,
  DineoutRecommendationRequestSchema,
} from "@workspace/api-zod";
import { executeFoodRecommendation } from "../lib/foodRecommendationService";
import { executeInstamartRecommendation } from "../lib/instamartRecommendationService";
import { executeDineoutRecommendation } from "../lib/dineoutRecommendationService";

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

/**
 * POST /recommendations/food (mounted under /api -> POST /api/recommendations/food)
 *
 * Authenticated endpoint for Live Swiggy Food Discovery & Personalized Recommendations.
 *
 * Flow:
 * 1. Authenticate user session strictly via requireAuth middleware.
 * 2. Validate request payload against FoodRecommendationRequestSchema.
 * 3. Invoke executeFoodRecommendation:
 *    - Resolves user's active Swiggy OAuth token (returns 401 requires_reauth if missing/expired)
 *    - Resolves user's delivery address via Swiggy MCP get_addresses (or prompts clarification)
 *    - Queries Swiggy Food MCP (search_restaurants, get_restaurant_menu, or search_menu)
 *    - Normalizes raw Swiggy items via Phase 3 Part 1 Swiggy Food Adapter
 *    - Executes Phase 2 Shared Recommendation Service (Safety -> Matching -> Ranking)
 * 4. Returns ranked, personalized food recommendations.
 */
router.post("/recommendations/food", requireAuth, async (req, res): Promise<void> => {
  try {
    const user = req.user;
    if (!user) {
      res.status(401).json({ error: "Unauthorized: Missing authenticated user" });
      return;
    }

    const parsed = FoodRecommendationRequestSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({
        error: "Invalid food recommendation request payload",
        details: parsed.error.errors.map((e) => `${e.path.join(".")}: ${e.message}`),
      });
      return;
    }

    const result = await executeFoodRecommendation(user, parsed.data);
    res.status(result.status).json(result.data);
  } catch (error: any) {
    console.error("[Food Recommendations Route] Execution error:", error?.message ?? error);
    res.status(500).json({ error: "Failed to generate food recommendations" });
  }
});

/**
 * POST /recommendations/instamart (mounted under /api -> POST /api/recommendations/instamart)
 *
 * Authenticated endpoint for Live Swiggy Instamart Discovery & Personalized Recommendations.
 *
 * Flow:
 * 1. Authenticate user session strictly via requireAuth middleware.
 * 2. Validate request payload against InstamartRecommendationRequestSchema.
 * 3. Invoke executeInstamartRecommendation:
 *    - Resolves user's active Swiggy OAuth token (returns 401 requires_reauth if missing/expired)
 *    - Resolves user's delivery address via Swiggy MCP get_addresses (or prompts clarification)
 *    - Queries Swiggy Instamart MCP (search_products or your_go_to_items)
 *    - Normalizes raw Swiggy items via Phase 3 Part 1 Swiggy Instamart Adapter
 *    - Executes Phase 2 Shared Recommendation Service (Safety -> Matching -> Ranking)
 * 4. Returns ranked, personalized Instamart recommendations.
 */
router.post("/recommendations/instamart", requireAuth, async (req, res): Promise<void> => {
  try {
    const user = req.user;
    if (!user) {
      res.status(401).json({ error: "Unauthorized: Missing authenticated user" });
      return;
    }

    const parsed = InstamartRecommendationRequestSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({
        error: "Invalid instamart recommendation request payload",
        details: parsed.error.errors.map((e) => `${e.path.join(".")}: ${e.message}`),
      });
      return;
    }

    const result = await executeInstamartRecommendation(user, parsed.data);
    res.status(result.status).json(result.data);
  } catch (error: any) {
    console.error("[Instamart Recommendations Route] Execution error:", error?.message ?? error);
    res.status(500).json({ error: "Failed to generate instamart recommendations" });
  }
});

/**
 * POST /recommendations/dineout (mounted under /api -> POST /api/recommendations/dineout)
 *
 * Authenticated endpoint for Live Swiggy Dineout Discovery & Personalized Recommendations.
 *
 * Flow:
 * 1. Authenticate user session strictly via requireAuth middleware.
 * 2. Validate request payload against DineoutRecommendationRequestSchema.
 * 3. Invoke executeDineoutRecommendation:
 *    - Resolves user's active Swiggy OAuth token (returns 401 requires_reauth if missing/expired)
 *    - Resolves user's Dineout location via get_saved_locations (or prompts clarification)
 *    - Queries Swiggy Dineout MCP search_restaurants_dineout
 *    - Normalizes raw Swiggy items via Phase 3 Part 1 Swiggy Dineout Adapter
 *    - Executes Phase 2 Shared Recommendation Service (Safety -> Matching -> Ranking)
 * 4. Returns ranked, personalized Dineout recommendations.
 */
router.post("/recommendations/dineout", requireAuth, async (req, res): Promise<void> => {
  try {
    const user = req.user;
    if (!user) {
      res.status(401).json({ error: "Unauthorized: Missing authenticated user" });
      return;
    }

    const parsed = DineoutRecommendationRequestSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({
        error: "Invalid dineout recommendation request payload",
        details: parsed.error.errors.map((e) => `${e.path.join(".")}: ${e.message}`),
      });
      return;
    }

    const result = await executeDineoutRecommendation(user, parsed.data);
    res.status(result.status).json(result.data);
  } catch (error: any) {
    console.error("[Dineout Recommendations Route] Execution error:", error?.message ?? error);
    res.status(500).json({ error: "Failed to generate dineout recommendations" });
  }
});

export default router;

