import { sql } from "drizzle-orm";
import {
  check,
  pgTable,
  text,
  timestamp,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";

// Retain the legacy table in the Drizzle schema so future generations do not drop it.
export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  fullName: varchar("full_name", { length: 150 }).notNull(),
  email: varchar("email", { length: 320 }).notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  phone: varchar("phone", { length: 32 }),
  role: varchar("role", { length: 32 }).notNull().default("CLIENT"),
  createdAt: timestamp("created_at", { withTimezone: true, mode: "date" }).notNull().defaultNow(),
  // Retained for compatibility with the previous Supabase Auth integration.
  authUserId: uuid("auth_user_id").unique(),
}, (table) => [
  check("users_role_check", sql`${table.role} in ('CLIENT', 'FREELANCER', 'ADMIN')`),
]).enableRLS();

export const profiles = pgTable("profiles", {
  id: uuid("id").primaryKey(),
  fullName: text("full_name").notNull(),
  email: text("email").notNull().unique(),
  phone: varchar("phone", { length: 256 }),
  role: varchar("role", { length: 32 }).notNull().default("CLIENT"),
}, (table) => [
  check("profiles_role_check", sql`${table.role} in ('CLIENT', 'FREELANCER')`),
]);
