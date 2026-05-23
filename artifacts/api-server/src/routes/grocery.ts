import { Router, type IRouter } from "express";
import { db, groceryListsTable, groceryItemsTable } from "@workspace/db";
import {
  CreateGroceryPlanBody,
  ToggleGroceryItemParams,
} from "@workspace/api-zod";
import { eq, desc } from "drizzle-orm";
import { openai } from "@workspace/integrations-openai-ai-server";

const router: IRouter = Router();

router.get("/grocery/list", async (_req, res): Promise<void> => {
  const [list] = await db.select().from(groceryListsTable).orderBy(desc(groceryListsTable.createdAt)).limit(1);

  if (!list) {
    res.json({
      id: 0,
      weekOf: new Date().toISOString().split("T")[0],
      items: [],
      totalItems: 0,
      checkedItems: 0,
    });
    return;
  }

  const items = await db.select().from(groceryItemsTable).where(eq(groceryItemsTable.listId, list.id));
  res.json({
    id: list.id,
    weekOf: list.weekOf,
    items,
    totalItems: items.length,
    checkedItems: items.filter(i => i.isChecked).length,
  });
});

router.post("/grocery/plan", async (req, res): Promise<void> => {
  const parsed = CreateGroceryPlanBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { goal, dietaryPreferences = [], budget } = parsed.data;

  const prompt = `Generate a healthy weekly grocery list for someone with the goal: "${goal}".
${dietaryPreferences.length > 0 ? `Dietary preferences: ${dietaryPreferences.join(", ")}.` : ""}
${budget ? `Budget: ₹${budget}.` : ""}

Respond ONLY with a JSON array of grocery items. Each item must have:
- name (string)
- category (string: Vegetables, Fruits, Proteins, Grains, Dairy, Pantry, Snacks, Beverages)
- quantity (string, e.g. "2", "500g", "1 dozen")
- unit (string, e.g. "kg", "pieces", "liters")
- nutritionNote (string, brief note about why this is good)

Return 12-16 items. Output ONLY the JSON array, no markdown.`;

  const completion = await openai.chat.completions.create({
    model: "gpt-5-mini",
    max_completion_tokens: 2000,
    messages: [{ role: "user", content: prompt }],
  });

  const rawText = completion.choices[0]?.message?.content ?? "[]";
  let parsedItems: Array<{ name: string; category: string; quantity: string; unit: string; nutritionNote?: string }> = [];

  try {
    const jsonMatch = rawText.match(/\[[\s\S]*\]/);
    parsedItems = JSON.parse(jsonMatch ? jsonMatch[0] : rawText);
  } catch {
    parsedItems = [];
  }

  const weekOf = new Date().toISOString().split("T")[0];
  const [list] = await db.insert(groceryListsTable).values({ weekOf }).returning();

  if (!list || parsedItems.length === 0) {
    res.status(201).json({
      id: list?.id ?? 0,
      weekOf,
      items: [],
      totalItems: 0,
      checkedItems: 0,
    });
    return;
  }

  const itemsToInsert = parsedItems.map(item => ({
    listId: list.id,
    name: item.name,
    category: item.category,
    quantity: item.quantity,
    unit: item.unit,
    isChecked: false,
    nutritionNote: item.nutritionNote ?? null,
  }));

  const items = await db.insert(groceryItemsTable).values(itemsToInsert).returning();

  res.status(201).json({
    id: list.id,
    weekOf: list.weekOf,
    items,
    totalItems: items.length,
    checkedItems: 0,
  });
});

router.patch("/grocery/items/:id/toggle", async (req, res): Promise<void> => {
  const params = ToggleGroceryItemParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [item] = await db.select().from(groceryItemsTable).where(eq(groceryItemsTable.id, params.data.id));
  if (!item) {
    res.status(404).json({ error: "Grocery item not found" });
    return;
  }

  const [updated] = await db
    .update(groceryItemsTable)
    .set({ isChecked: !item.isChecked })
    .where(eq(groceryItemsTable.id, params.data.id))
    .returning();

  res.json(updated);
});

export default router;
