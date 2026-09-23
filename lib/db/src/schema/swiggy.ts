import { pgTable, text, serial, timestamp, uuid } from "drizzle-orm/pg-core";
import { userProfilesTable } from "./profile";

export const userSwiggyTokensTable = pgTable("user_swiggy_tokens", {
  id: serial("id").primaryKey(),
  userId: uuid("user_id").notNull().references(() => userProfilesTable.id, { onDelete: "cascade" }).unique(),
  accessToken: text("access_token").notNull(),
  tokenType: text("token_type").notNull().default("Bearer"),
  scope: text("scope"),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const appSettingsTable = pgTable("app_settings", {
  key: text("key").primaryKey(),
  value: text("value").notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export type UserSwiggyToken = typeof userSwiggyTokensTable.$inferSelect;
export type AppSetting = typeof appSettingsTable.$inferSelect;
