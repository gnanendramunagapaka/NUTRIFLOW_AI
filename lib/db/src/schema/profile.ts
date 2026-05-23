import { pgTable, text, serial, timestamp, integer, real } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const userProfilesTable = pgTable("user_profiles", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  age: integer("age"),
  weight: real("weight"),
  height: real("height"),
  goal: text("goal").notNull().default("Stay Healthy"),
  dietaryPreferences: text("dietary_preferences").array().notNull().default([]),
  wellnessScore: integer("wellness_score").notNull().default(72),
  streak: integer("streak").notNull().default(0),
  avatarUrl: text("avatar_url"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const wellnessTrackingTable = pgTable("wellness_tracking", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => userProfilesTable.id),
  date: text("date").notNull(),
  proteinIntake: real("protein_intake").notNull().default(0),
  waterIntake: real("water_intake").notNull().default(0),
  caloriesConsumed: integer("calories_consumed").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertUserProfileSchema = createInsertSchema(userProfilesTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertUserProfile = z.infer<typeof insertUserProfileSchema>;
export type UserProfile = typeof userProfilesTable.$inferSelect;

export const insertWellnessTrackingSchema = createInsertSchema(wellnessTrackingTable).omit({ id: true, createdAt: true });
export type InsertWellnessTracking = z.infer<typeof insertWellnessTrackingSchema>;
export type WellnessTracking = typeof wellnessTrackingTable.$inferSelect;
