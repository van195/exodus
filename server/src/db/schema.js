import { sql } from "drizzle-orm";
import {
  check,
  integer,
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

export const projects = pgTable("projects", {
  id: uuid("id").primaryKey().defaultRandom(),
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description"),
  clientId: uuid("client_id").notNull().references(() => users.id, { onDelete: "restrict" }),
  freelancerId: uuid("freelancer_id").references(() => users.id, { onDelete: "set null" }),
  status: varchar("status", { length: 32 }).notNull().default("DRAFT"),
  amount: integer("amount").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true, mode: "date" }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true, mode: "date" }).notNull().defaultNow(),
}, (table) => [
  check("projects_status_check", sql`${table.status} in ('DRAFT', 'ACTIVE', 'IN_ESCROW', 'COMPLETED', 'DISPUTED', 'CANCELLED')`),
]);

export const files = pgTable("files", {
  id: uuid("id").primaryKey().defaultRandom(),
  projectId: uuid("project_id").notNull().references(() => projects.id, { onDelete: "cascade" }),
  uploaderId: uuid("uploader_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  category: varchar("category", { length: 32 }).notNull(),
  originalFilename: varchar("original_filename", { length: 255 }).notNull(),
  cloudinaryAssetId: varchar("cloudinary_asset_id", { length: 255 }),
  cloudinaryPublicId: varchar("cloudinary_public_id", { length: 255 }).notNull(),
  resourceType: varchar("resource_type", { length: 32 }).notNull().default("raw"),
  deliveryType: varchar("delivery_type", { length: 32 }).notNull().default("authenticated"),
  mimeType: varchar("mime_type", { length: 128 }).notNull(),
  fileSize: integer("file_size").notNull(),
  checksum: varchar("checksum", { length: 64 }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true, mode: "date" }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true, mode: "date" }).notNull().defaultNow(),
}, (table) => [
  check("files_category_check", sql`${table.category} in ('PAYMENT_RECEIPT', 'DELIVERABLE', 'AGREEMENT', 'SUPPORTING_EVIDENCE')`),
]);

