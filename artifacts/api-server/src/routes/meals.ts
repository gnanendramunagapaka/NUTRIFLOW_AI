import { Router, type IRouter } from "express";
import { DbService } from "../services/dbService";
import {
  ListMealsQueryParams,
  GetMealParams,
  GetMealPlanResponse,
} from "@workspace/api-zod";
import { requireAuth } from "../middlewares/authMiddleware";

const router: IRouter = Router();

router.get("/meals", requireAuth, async (req, res): Promise<void> => {
  const parsed = ListMealsQueryParams.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { filter, search } = parsed.data;

  const meals = await DbService.listMeals(filter, search, 30);
  res.json(meals.map(m => ({
    ...m,
    tags: m.tags ?? [],
  })));
});

router.get("/meals/:id", requireAuth, async (req, res): Promise<void> => {
  const params = GetMealParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const meal = await DbService.getMealById(params.data.id);
  if (!meal) {
    res.status(404).json({ error: "Meal not found" });
    return;
  }

  res.json({ ...meal, tags: meal.tags ?? [] });
});

router.get("/meal-plan", requireAuth, async (req, res): Promise<void> => {
  const profile = req.user!;
  const goalLower = (profile.goal || "").toLowerCase();

  let targetTag: string | undefined;
  if (goalLower.includes("loss") || goalLower.includes("lose") || goalLower.includes("slim") || goalLower.includes("cut")) {
    targetTag = "low-carb";
  } else if (goalLower.includes("muscle") || goalLower.includes("gain") || goalLower.includes("bulk") || goalLower.includes("gym")) {
    targetTag = "high-protein";
  } else if (goalLower.includes("diabetic") || goalLower.includes("sugar")) {
    targetTag = "diabetic-friendly";
  }

  let meals = targetTag ? await DbService.getMealsByTag(targetTag, 21) : [];

  if (meals.length < 5) {
    meals = await DbService.listMeals(undefined, undefined, 21);
  }

  const days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
  const planDays = days.map((day, i) => {
    const breakfast = meals[(i * 3) % meals.length] ?? meals[0];
    const lunch = meals[(i * 3 + 1) % meals.length] ?? meals[1];
    const dinner = meals[(i * 3 + 2) % meals.length] ?? meals[2];
    return {
      day,
      breakfast: { ...breakfast, tags: breakfast?.tags ?? [] },
      lunch: { ...lunch, tags: lunch?.tags ?? [] },
      dinner: { ...dinner, tags: dinner?.tags ?? [] },
      totalCalories: (breakfast?.calories ?? 0) + (lunch?.calories ?? 0) + (dinner?.calories ?? 0),
      totalProtein: (breakfast?.protein ?? 0) + (lunch?.protein ?? 0) + (dinner?.protein ?? 0),
    };
  });

  const plan = GetMealPlanResponse.parse({
    weekOf: new Date().toISOString().split("T")[0],
    days: planDays,
  });

  res.json(plan);
});

router.get("/restaurants", requireAuth, async (_req, res): Promise<void> => {
  const restaurants = await DbService.listRestaurants(20);
  res.json(restaurants.map(r => ({ ...r, tags: r.tags ?? [] })));
});

// GET /meals/saved: Fetch all saved meals for this user
router.get("/meals/saved", requireAuth, async (req, res): Promise<void> => {
  try {
    const saved = await DbService.getSavedMeals(req.user!.id);
    res.json(saved);
  } catch (error) {
    console.error("[Saved Meals API] GET error:", error);
    res.status(500).json({ error: "Failed to fetch saved meals" });
  }
});

// POST /meals/saved: Save a meal for this user
router.post("/meals/saved", requireAuth, async (req, res): Promise<void> => {
  try {
    const { mealId, name, description, imageUrl, calories, protein, carbs, fat, healthScore, price } = req.body;
    
    if (!name) {
      res.status(400).json({ error: "Meal name is required" });
      return;
    }

    // Check if already saved
    if (mealId) {
      const existing = await DbService.findSavedMeal(req.user!.id, mealId);
      if (existing) {
        res.json(existing);
        return;
      }
    }

    const saved = await DbService.saveMeal({
      userId: req.user!.id,
      mealId: mealId || null,
      name,
      description,
      imageUrl,
      calories,
      protein,
      carbs,
      fat,
      healthScore,
      price,
    });

    res.status(201).json(saved);
  } catch (error) {
    console.error("[Saved Meals API] POST error:", error);
    res.status(500).json({ error: "Failed to save meal" });
  }
});

// DELETE /meals/saved/:id: Delete a saved meal
router.delete("/meals/saved/:id", requireAuth, async (req, res): Promise<void> => {
  try {
    const id = parseInt(req.params.id as string);
    if (isNaN(id)) {
      res.status(400).json({ error: "Invalid saved meal ID" });
      return;
    }

    await DbService.deleteSavedMeal(id, req.user!.id);
    res.sendStatus(204);
  } catch (error) {
    console.error("[Saved Meals API] DELETE error:", error);
    res.status(500).json({ error: "Failed to delete saved meal" });
  }
});

export default router;
