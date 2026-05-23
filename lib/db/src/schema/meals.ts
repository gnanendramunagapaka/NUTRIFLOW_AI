import { pgTable, text, serial, timestamp, integer, real, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { userProfilesTable } from "./profile";

export const restaurantsTable = pgTable("restaurants", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  cuisine: text("cuisine").notNull(),
  rating: real("rating").notNull().default(4.0),
  deliveryTime: text("delivery_time").notNull().default("25-35 min"),
  imageUrl: text("image_url"),
  isHealthy: boolean("is_healthy").notNull().default(true),
  tags: text("tags").array().notNull().default([]),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const mealsTable = pgTable("meals", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description").notNull(),
  imageUrl: text("image_url"),
  calories: integer("calories").notNull(),
  protein: real("protein").notNull(),
  carbs: real("carbs").notNull(),
  fat: real("fat").notNull(),
  healthScore: real("health_score").notNull(),
  cuisine: text("cuisine").notNull(),
  tags: text("tags").array().notNull().default([]),
  price: real("price").notNull(),
  isAiRecommended: boolean("is_ai_recommended").notNull().default(false),
  restaurantId: integer("restaurant_id").references(() => restaurantsTable.id),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const savedMealsTable = pgTable("saved_meals", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => userProfilesTable.id, { onDelete: "cascade" }),
  mealId: integer("meal_id").references(() => mealsTable.id, { onDelete: "set null" }),
  name: text("name").notNull(),
  description: text("description"),
  imageUrl: text("image_url"),
  calories: integer("calories"),
  protein: real("protein"),
  carbs: real("carbs"),
  fat: real("fat"),
  healthScore: real("health_score"),
  price: real("price"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertRestaurantSchema = createInsertSchema(restaurantsTable).omit({ id: true, createdAt: true });
export type InsertRestaurant = z.infer<typeof insertRestaurantSchema>;
export type Restaurant = typeof restaurantsTable.$inferSelect;

export const insertMealSchema = createInsertSchema(mealsTable).omit({ id: true, createdAt: true });
export type InsertMeal = z.infer<typeof insertMealSchema>;
export type Meal = typeof mealsTable.$inferSelect;

export const insertSavedMealSchema = createInsertSchema(savedMealsTable).omit({ id: true, createdAt: true });
export type InsertSavedMeal = z.infer<typeof insertSavedMealSchema>;
export type SavedMeal = typeof savedMealsTable.$inferSelect;
