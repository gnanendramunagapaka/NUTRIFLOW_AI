import { pgTable, text, serial, timestamp, integer, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { userProfilesTable } from "./profile";

export const groceryListsTable = pgTable("grocery_lists", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => userProfilesTable.id, { onDelete: "cascade" }),
  weekOf: text("week_of").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const groceryItemsTable = pgTable("grocery_items", {
  id: serial("id").primaryKey(),
  listId: integer("list_id").notNull().references(() => groceryListsTable.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  category: text("category").notNull(),
  quantity: text("quantity").notNull(),
  unit: text("unit").notNull(),
  isChecked: boolean("is_checked").notNull().default(false),
  nutritionNote: text("nutrition_note"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertGroceryListSchema = createInsertSchema(groceryListsTable).omit({ id: true, createdAt: true });
export type InsertGroceryList = z.infer<typeof insertGroceryListSchema>;
export type GroceryList = typeof groceryListsTable.$inferSelect;

export const insertGroceryItemSchema = createInsertSchema(groceryItemsTable).omit({ id: true, createdAt: true });
export type InsertGroceryItem = z.infer<typeof insertGroceryItemSchema>;
export type GroceryItem = typeof groceryItemsTable.$inferSelect;
