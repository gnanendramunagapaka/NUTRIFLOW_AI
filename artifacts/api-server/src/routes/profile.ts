import { Router, type IRouter } from "express";
import { DbService } from "../services/dbService";
import {
  UpdateProfileBody,
  GetProfileResponse,
  GetWellnessSummaryResponse,
} from "@workspace/api-zod";
import { getGeminiModel, generateGroqCompletion } from "../lib/gemini";
import { requireAuth } from "../middlewares/authMiddleware";

const router: IRouter = Router();

router.get("/profile", requireAuth, async (req, res): Promise<void> => {
  try {
    const profile = req.user!;
    res.json(GetProfileResponse.parse({
      ...profile,
      dietaryPreferences: profile.dietaryPreferences ?? [],
      allergies: profile.allergies ?? [],
    }));
  } catch (error) {
    console.error("GET /profile error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.patch("/profile", requireAuth, async (req, res): Promise<void> => {
  try {
    const parsed = UpdateProfileBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.message });
      return;
    }

    const profile = req.user!;
    const updated = await DbService.updateUserProfile(profile.id, parsed.data);

    // Sync onboardingPreferences Table for user-scoped onboarding preferences persistence
    try {
      await DbService.syncOnboardingPreferences(profile.id, {
        goal: updated.goal,
        dietaryPreferences: updated.dietaryPreferences,
        allergies: updated.allergies,
        workoutFrequency: updated.workoutFrequency ?? undefined,
        waterIntake: updated.waterIntake ?? undefined,
        mealHabits: updated.mealHabits ?? undefined,
        budget: updated.budget ?? undefined,
      });
    } catch (syncError) {
      console.error("[Profile Sync] Failed to sync onboarding preferences table:", syncError);
    }

    res.json(GetProfileResponse.parse({
      ...updated,
      dietaryPreferences: updated.dietaryPreferences ?? [],
      allergies: updated.allergies ?? [],
    }));
  } catch (error) {
    console.error("PATCH /profile error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/wellness/summary", requireAuth, async (req, res): Promise<void> => {
  try {
    const profile = req.user!;

    // Enforce dynamic personalization of goals based on onboarding choices
    const goalLower = (profile.goal || "").toLowerCase();
    
    let caloriesGoal = 2000;
    let proteinGoal = 120;
    let waterGoal = 3.0;

    if (goalLower.includes("loss") || goalLower.includes("lose") || goalLower.includes("slim") || goalLower.includes("cut")) {
      caloriesGoal = 1700;
      proteinGoal = 110;
      waterGoal = 2.7;
    } else if (goalLower.includes("muscle") || goalLower.includes("gain") || goalLower.includes("bulk") || goalLower.includes("gym")) {
      caloriesGoal = 2700;
      proteinGoal = 160;
      waterGoal = 3.5;
    } else if (goalLower.includes("diabetic") || goalLower.includes("blood sugar") || goalLower.includes("sugar")) {
      caloriesGoal = 1900;
      proteinGoal = 115;
      waterGoal = 3.0;
    }

    // Adjust based on weight if available
    if (profile.weight) {
      proteinGoal = Math.round(profile.weight * (goalLower.includes("muscle") ? 2.2 : 1.6));
      waterGoal = Number((profile.weight * 0.04).toFixed(1));
    }

    const today = new Date().toISOString().split("T")[0];
    const tracking = await DbService.getWellnessTracking(profile.id, today);
    const topMeals = await DbService.getTopRecommendedMeals(3);

    const aiPrompt = `Give a short, warm, encouraging wellness insight (1 sentence, max 15 words) for someone with ${profile.streak} day streak whose goal is "${profile.goal}". Be specific and positive.`;

    let aiInsight = "Great consistency! Keep up your healthy habits this week.";
    try {
      if (process.env.GROQ_API_KEY) {
        const text = await generateGroqCompletion([
          { role: "system", content: "You generate short, inspiring wellness insights." },
          { role: "user", content: aiPrompt }
        ]);
        aiInsight = text.trim() || aiInsight;
      }
    } catch {
      // use default
    }

    const summary = GetWellnessSummaryResponse.parse({
      proteinIntake: tracking?.proteinIntake ?? Math.round(proteinGoal * 0.6),
      proteinGoal,
      waterIntake: tracking?.waterIntake ?? Number((waterGoal * 0.65).toFixed(1)),
      waterGoal,
      caloriesConsumed: tracking?.caloriesConsumed ?? Math.round(caloriesGoal * 0.7),
      caloriesGoal,
      streak: profile.streak,
      wellnessScore: profile.wellnessScore,
      aiInsight,
      topMeals: topMeals.map(m => ({ ...m, tags: m.tags ?? [] })),
    });

    res.json(summary);
  } catch (error) {
    console.error("GET /wellness/summary error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
