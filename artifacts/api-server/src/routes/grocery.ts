import { Router, type IRouter } from "express";
import { db, groceryListsTable, groceryItemsTable } from "@workspace/db";
import {
  CreateGroceryPlanBody,
  ToggleGroceryItemParams,
} from "@workspace/api-zod";
import { eq, desc, and } from "drizzle-orm";
import { getGeminiModel } from "../lib/gemini";
import { requireAuth } from "../middlewares/authMiddleware";

const router: IRouter = Router();

router.get("/grocery/list", requireAuth, async (req, res): Promise<void> => {
  const [list] = await db.select().from(groceryListsTable)
    .where(eq(groceryListsTable.userId, req.user!.id))
    .orderBy(desc(groceryListsTable.createdAt)).limit(1);

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

router.post("/grocery/plan", requireAuth, async (req, res): Promise<void> => {
  // Support direct items insertion (e.g. from conversational UI confirmation actions)
  if (req.body.items && Array.isArray(req.body.items)) {
    try {
      const weekOf = new Date().toISOString().split("T")[0];
      const [list] = await db.insert(groceryListsTable).values({ weekOf, userId: req.user!.id }).returning();
      
      if (!list) {
        res.status(500).json({ error: "Failed to create grocery list" });
        return;
      }

      const itemsToInsert = req.body.items.map((item: any) => ({
        listId: list.id,
        name: typeof item === "string" ? item : item.name,
        category: item.category || "Pantry",
        quantity: item.quantity || "1",
        unit: item.unit || "unit",
        isChecked: false,
        nutritionNote: item.nutritionNote || null,
      }));

      const items = await db.insert(groceryItemsTable).values(itemsToInsert).returning();

      res.status(201).json({
        id: list.id,
        weekOf: list.weekOf,
        items,
        totalItems: items.length,
        checkedItems: 0,
      });
      return;
    } catch (error) {
      console.error("Custom grocery plan insert error:", error);
      res.status(500).json({ error: "Failed to insert custom grocery items" });
      return;
    }
  }

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


  let parsedItems: Array<{ name: string; category: string; quantity: string; unit: string; nutritionNote?: string }> = [];

  try {
    const model = getGeminiModel("You generate healthy weekly grocery lists in valid JSON array format.", true);
    const completion = await model.generateContent(prompt);
    const rawText = completion.response.text();
    console.log(`[Grocery] Gemini responded (${rawText.length} chars)`);

    const jsonMatch = rawText.match(/\[[\s\S]*\]/);
    parsedItems = JSON.parse(jsonMatch ? jsonMatch[0] : rawText);
  } catch (geminiError: any) {
    const isRateLimit = geminiError?.status === 429 || geminiError?.message?.includes("quota");
    console.error(`[Grocery] Gemini error (${geminiError?.status || "unknown"}):`, isRateLimit ? "Rate limited — using fallback" : geminiError?.message);

    // Intelligent fallback grocery list based on goal
    const goalLower = (goal || "").toLowerCase();
    const isWeightLoss = goalLower.includes("loss") || goalLower.includes("slim") || goalLower.includes("cut");
    const isVeg = dietaryPreferences.some(p => p.toLowerCase().includes("vegetarian") || p.toLowerCase().includes("vegan"));

    parsedItems = isVeg ? [
      { name: "Tofu", category: "Proteins", quantity: "400", unit: "g", nutritionNote: "High protein plant-based meat alternative" },
      { name: "Chickpeas", category: "Proteins", quantity: "400", unit: "g", nutritionNote: "Protein + fiber combo for satiety" },
      { name: "Paneer", category: "Proteins", quantity: "200", unit: "g", nutritionNote: "Complete protein for vegetarians" },
      { name: "Lentils (Dal)", category: "Proteins", quantity: "500", unit: "g", nutritionNote: "High protein, iron, and fiber" },
      { name: "Spinach", category: "Vegetables", quantity: "300", unit: "g", nutritionNote: "Iron, folate, and antioxidants" },
      { name: "Broccoli", category: "Vegetables", quantity: "300", unit: "g", nutritionNote: "Vitamin C and anti-cancer compounds" },
      { name: "Sweet Potato", category: "Vegetables", quantity: "500", unit: "g", nutritionNote: "Complex carbs with vitamin A" },
      { name: "Bell Peppers", category: "Vegetables", quantity: "3", unit: "pieces", nutritionNote: "Rich in vitamin C and antioxidants" },
      { name: "Banana", category: "Fruits", quantity: "6", unit: "pieces", nutritionNote: "Quick energy and potassium" },
      { name: "Quinoa", category: "Grains", quantity: "500", unit: "g", nutritionNote: "Complete protein grain with all amino acids" },
      { name: "Oats", category: "Grains", quantity: "500", unit: "g", nutritionNote: "Beta-glucan fiber for heart health" },
      { name: "Greek Yogurt", category: "Dairy", quantity: "500", unit: "g", nutritionNote: "Probiotics and protein" },
      { name: "Olive Oil", category: "Pantry", quantity: "500", unit: "ml", nutritionNote: "Heart-healthy monounsaturated fats" },
      { name: "Almonds", category: "Snacks", quantity: "200", unit: "g", nutritionNote: "Healthy fats, vitamin E, and magnesium" },
    ] : [
      { name: isWeightLoss ? "Chicken Breast (Skinless)" : "Chicken Breast", category: "Proteins", quantity: "500", unit: "g", nutritionNote: "Lean protein, 31g protein per 100g" },
      { name: "Salmon Fillet", category: "Proteins", quantity: "300", unit: "g", nutritionNote: "Omega-3 fatty acids for heart and brain" },
      { name: "Eggs", category: "Proteins", quantity: "12", unit: "pieces", nutritionNote: "Complete protein with essential amino acids" },
      { name: "Greek Yogurt", category: "Dairy", quantity: "500", unit: "g", nutritionNote: "Probiotics and 15g protein per cup" },
      { name: "Spinach", category: "Vegetables", quantity: "300", unit: "g", nutritionNote: "Iron, folate, and antioxidants" },
      { name: "Broccoli", category: "Vegetables", quantity: "300", unit: "g", nutritionNote: "High in vitamin C and fiber" },
      { name: "Sweet Potato", category: "Vegetables", quantity: "500", unit: "g", nutritionNote: isWeightLoss ? "Low GI complex carbs for sustained energy" : "Complex carbs with vitamin A" },
      { name: "Bell Peppers", category: "Vegetables", quantity: "3", unit: "pieces", nutritionNote: "Vitamin C and antioxidants" },
      { name: "Banana", category: "Fruits", quantity: "6", unit: "pieces", nutritionNote: "Pre/post workout energy source" },
      { name: "Blueberries", category: "Fruits", quantity: "200", unit: "g", nutritionNote: "Antioxidant powerhouse" },
      { name: isWeightLoss ? "Cauliflower Rice" : "Brown Rice", category: "Grains", quantity: "500", unit: "g", nutritionNote: isWeightLoss ? "Low-carb rice substitute" : "Whole grain with fiber and B vitamins" },
      { name: "Oats", category: "Grains", quantity: "500", unit: "g", nutritionNote: "Soluble fiber for cholesterol and gut health" },
      { name: "Olive Oil", category: "Pantry", quantity: "500", unit: "ml", nutritionNote: "Heart-healthy cooking fat" },
      { name: "Almonds", category: "Snacks", quantity: "200", unit: "g", nutritionNote: "Healthy fats and vitamin E" },
    ];
  }


  const weekOf = new Date().toISOString().split("T")[0];
  const [list] = await db.insert(groceryListsTable).values({ weekOf, userId: req.user!.id }).returning();

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

router.patch("/grocery/items/:id/toggle", requireAuth, async (req, res): Promise<void> => {
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

  // Enforce list ownership check
  const [list] = await db.select().from(groceryListsTable).where(
    and(eq(groceryListsTable.id, item.listId), eq(groceryListsTable.userId, req.user!.id))
  );
  if (!list) {
    res.status(403).json({ error: "Forbidden: You do not own this list" });
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
