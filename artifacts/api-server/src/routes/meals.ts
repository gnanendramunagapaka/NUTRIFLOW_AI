import { Router, type IRouter } from "express";
import { db, mealsTable, restaurantsTable } from "@workspace/db";
import {
  ListMealsQueryParams,
  GetMealParams,
  GetMealPlanResponse,
} from "@workspace/api-zod";
import { eq, ilike, or, sql } from "drizzle-orm";

const router: IRouter = Router();

router.get("/meals", async (req, res): Promise<void> => {
  const parsed = ListMealsQueryParams.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { filter, search } = parsed.data;

  let query = db.select().from(mealsTable).$dynamic();

  if (filter) {
    query = query.where(sql`${mealsTable.tags} @> ARRAY[${filter}]::text[]`);
  }

  if (search) {
    query = query.where(
      or(
        ilike(mealsTable.name, `%${search}%`),
        ilike(mealsTable.cuisine, `%${search}%`)
      )
    );
  }

  const meals = await query.limit(30);
  res.json(meals.map(m => ({
    ...m,
    tags: m.tags ?? [],
  })));
});

router.get("/meals/:id", async (req, res): Promise<void> => {
  const params = GetMealParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [meal] = await db.select().from(mealsTable).where(eq(mealsTable.id, params.data.id));
  if (!meal) {
    res.status(404).json({ error: "Meal not found" });
    return;
  }

  res.json({ ...meal, tags: meal.tags ?? [] });
});

router.get("/meal-plan", async (_req, res): Promise<void> => {
  const meals = await db.select().from(mealsTable).limit(21);

  const days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
  const planDays = days.map((day, i) => {
    const breakfast = meals[i * 3] ?? meals[0];
    const lunch = meals[i * 3 + 1] ?? meals[1];
    const dinner = meals[i * 3 + 2] ?? meals[2];
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

router.get("/restaurants", async (_req, res): Promise<void> => {
  const restaurants = await db.select().from(restaurantsTable).limit(20);
  res.json(restaurants.map(r => ({ ...r, tags: r.tags ?? [] })));
});

export default router;
