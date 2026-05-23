import { Router, type IRouter } from "express";
import { db, cartItemsTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { requireAuth } from "../middlewares/authMiddleware";

const router: IRouter = Router();

// GET /cart: Fetch all cart items for user
router.get("/cart", requireAuth, async (req, res): Promise<void> => {
  try {
    const items = await db.select().from(cartItemsTable).where(eq(cartItemsTable.userId, req.user!.id));
    res.json(items);
  } catch (error) {
    console.error("[Cart API] Fetch error:", error);
    res.status(500).json({ error: "Failed to fetch cart items" });
  }
});

// POST /cart: Add or update quantity
router.post("/cart", requireAuth, async (req, res): Promise<void> => {
  try {
    const { itemId, name, price, quantity = 1, type, calories, protein, carbs, fat, healthScore, imageUrl, cuisine, category, unit, description } = req.body;
    
    if (!itemId || !name || price === undefined || !type) {
      res.status(400).json({ error: "Missing required cart fields" });
      return;
    }

    // Check if item already in cart
    const [existing] = await db
      .select()
      .from(cartItemsTable)
      .where(and(eq(cartItemsTable.userId, req.user!.id), eq(cartItemsTable.itemId, itemId)))
      .limit(1);

    if (existing) {
      const [updated] = await db
        .update(cartItemsTable)
        .set({ quantity: existing.quantity + quantity })
        .where(eq(cartItemsTable.id, existing.id))
        .returning();
      res.json(updated);
    } else {
      const [inserted] = await db
        .insert(cartItemsTable)
        .values({
          userId: req.user!.id,
          itemId,
          name,
          price,
          quantity,
          type,
          calories,
          protein,
          carbs,
          fat,
          healthScore,
          imageUrl,
          cuisine,
          category,
          unit,
          description
        })
        .returning();
      res.status(201).json(inserted);
    }
  } catch (error) {
    console.error("[Cart API] Insert error:", error);
    res.status(500).json({ error: "Failed to insert cart item" });
  }
});

// PUT /cart/:itemId: Update quantity directly
router.put("/cart/:itemId", requireAuth, async (req, res): Promise<void> => {
  try {
    const { quantity } = req.body;
    const itemId = req.params.itemId as string;

    if (quantity === undefined || quantity <= 0) {
      // Remove if quantity is <= 0
      await db
        .delete(cartItemsTable)
        .where(and(eq(cartItemsTable.userId, req.user!.id), eq(cartItemsTable.itemId, itemId)));
      res.json({ success: true, removed: true });
      return;
    }

    const [updated] = await db
      .update(cartItemsTable)
      .set({ quantity })
      .where(and(eq(cartItemsTable.userId, req.user!.id), eq(cartItemsTable.itemId, itemId)))
      .returning();

    if (!updated) {
      res.status(404).json({ error: "Cart item not found" });
      return;
    }

    res.json(updated);
  } catch (error) {
    console.error("[Cart API] Update error:", error);
    res.status(500).json({ error: "Failed to update cart item" });
  }
});

// DELETE /cart/:itemId: Remove individual item
router.delete("/cart/:itemId", requireAuth, async (req, res): Promise<void> => {
  try {
    const itemId = req.params.itemId as string;
    await db
      .delete(cartItemsTable)
      .where(and(eq(cartItemsTable.userId, req.user!.id), eq(cartItemsTable.itemId, itemId)));
    res.sendStatus(204);
  } catch (error) {
    console.error("[Cart API] Delete error:", error);
    res.status(500).json({ error: "Failed to delete cart item" });
  }
});

// DELETE /cart: Clear all items
router.delete("/cart", requireAuth, async (req, res): Promise<void> => {
  try {
    await db.delete(cartItemsTable).where(eq(cartItemsTable.userId, req.user!.id));
    res.sendStatus(204);
  } catch (error) {
    console.error("[Cart API] Clear error:", error);
    res.status(500).json({ error: "Failed to clear cart" });
  }
});

export default router;
