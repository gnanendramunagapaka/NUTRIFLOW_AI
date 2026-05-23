import { pgTable, text, serial, timestamp, integer, real, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const userProfilesTable = pgTable("user_profiles", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").unique().notNull(),
  password: text("password").notNull(),
  isEmailVerified: boolean("is_email_verified").notNull().default(false),
  verificationCode: text("verification_code"),
  sessionToken: text("session_token"),
  onboardingCompleted: boolean("onboarding_completed").notNull().default(false),
  age: integer("age"),
  weight: real("weight"),
  height: real("height"),
  goal: text("goal").notNull().default("Stay Healthy"),
  dietaryPreferences: text("dietary_preferences").array().notNull().default([]),
  allergies: text("allergies").array().notNull().default([]),
  workoutFrequency: text("workout_frequency"),
  waterIntake: text("water_intake"),
  mealHabits: text("meal_habits"),
  budget: text("budget"),
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

export const onboardingPreferencesTable = pgTable("onboarding_preferences", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => userProfilesTable.id, { onDelete: "cascade" }),
  goal: text("goal"),
  dietaryPreferences: text("dietary_preferences").array().notNull().default([]),
  allergies: text("allergies").array().notNull().default([]),
  workoutFrequency: text("workout_frequency"),
  waterIntake: text("water_intake"),
  mealHabits: text("meal_habits"),
  budget: text("budget"),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export const insertUserProfileSchema = createInsertSchema(userProfilesTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertUserProfile = z.infer<typeof insertUserProfileSchema>;
export type UserProfile = typeof userProfilesTable.$inferSelect;

export const insertWellnessTrackingSchema = createInsertSchema(wellnessTrackingTable).omit({ id: true, createdAt: true });
export type InsertWellnessTracking = z.infer<typeof insertWellnessTrackingSchema>;
export type WellnessTracking = typeof wellnessTrackingTable.$inferSelect;

export const insertOnboardingPreferencesSchema = createInsertSchema(onboardingPreferencesTable).omit({ id: true, updatedAt: true });
export type InsertOnboardingPreferences = z.infer<typeof insertOnboardingPreferencesSchema>;
export type OnboardingPreferences = typeof onboardingPreferencesTable.$inferSelect;

