import { Router, type IRouter } from "express";
import { db, userProfilesTable, wellnessTrackingTable, mealsTable } from "@workspace/db";
import {
  UpdateProfileBody,
  GetProfileResponse,
  GetWellnessSummaryResponse,
} from "@workspace/api-zod";
import { eq, desc } from "drizzle-orm";
import { openai } from "@workspace/integrations-openai-ai-server";

const router: IRouter = Router();

async function getOrCreateProfile() {
  const [profile] = await db.select().from(userProfilesTable).limit(1);
  if (profile) return profile;

  const [created] = await db.insert(userProfilesTable).values({
    name: "Alex",
    age: 28,
    weight: 72,
    height: 175,
    goal: "Build Muscle",
    dietaryPreferences: ["High Protein", "Low Carb"],
    wellnessScore: 78,
    streak: 5,
  }).returning();

  return created;
}

router.get("/profile", async (_req, res): Promise<void> => {
  const profile = await getOrCreateProfile();
  res.json(GetProfileResponse.parse({ ...profile, dietaryPreferences: profile.dietaryPreferences ?? [] }));
});

router.patch("/profile", async (req, res): Promise<void> => {
  const parsed = UpdateProfileBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const profile = await getOrCreateProfile();
  const [updated] = await db
    .update(userProfilesTable)
    .set(parsed.data)
    .where(eq(userProfilesTable.id, profile.id))
    .returning();

  res.json(GetProfileResponse.parse({ ...updated, dietaryPreferences: updated.dietaryPreferences ?? [] }));
});

router.get("/wellness/summary", async (_req, res): Promise<void> => {
  const profile = await getOrCreateProfile();

  const today = new Date().toISOString().split("T")[0];
  const [tracking] = await db
    .select()
    .from(wellnessTrackingTable)
    .where(eq(wellnessTrackingTable.date, today))
    .limit(1);

  const topMeals = await db.select().from(mealsTable)
    .where(eq(mealsTable.isAiRecommended, true))
    .limit(3);

  const aiPrompt = `Give a short, warm, encouraging wellness insight (1 sentence, max 15 words) for someone with ${profile.streak} day streak whose goal is "${profile.goal}". Be specific and positive.`;

  let aiInsight = "Great consistency! Keep up your healthy habits this week.";
  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-5-nano",
      max_completion_tokens: 60,
      messages: [{ role: "user", content: aiPrompt }],
    });
    aiInsight = completion.choices[0]?.message?.content?.trim() ?? aiInsight;
  } catch {
    // use default
  }

  const summary = GetWellnessSummaryResponse.parse({
    proteinIntake: tracking?.proteinIntake ?? 68,
    proteinGoal: 120,
    waterIntake: tracking?.waterIntake ?? 1.8,
    waterGoal: 3,
    caloriesConsumed: tracking?.caloriesConsumed ?? 1420,
    caloriesGoal: 2000,
    streak: profile.streak,
    wellnessScore: profile.wellnessScore,
    aiInsight,
    topMeals: topMeals.map(m => ({ ...m, tags: m.tags ?? [] })),
  });

  res.json(summary);
});

export default router;
