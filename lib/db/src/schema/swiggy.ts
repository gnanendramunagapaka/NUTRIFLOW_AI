import { pgTable, text, serial, timestamp, integer } from "drizzle-orm/pg-core";
import { userProfilesTable } from "./profile";
import { createInsertSchema } from "drizzle-zod";

export const swiggyConnectionsTable = pgTable("swiggy_connections", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().unique().references(() => userProfilesTable.id, { onDelete: "cascade" }),
  accessToken: text("access_token").notNull(),
  refreshToken: text("refresh_token"),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  scope: text("scope").notNull().default("mcp:tools"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertSwiggyConnectionSchema = createInsertSchema(swiggyConnectionsTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertSwiggyConnection = typeof swiggyConnectionsTable.$inferInsert;
export type SwiggyConnection = typeof swiggyConnectionsTable.$inferSelect;
