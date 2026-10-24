import { sql } from "drizzle-orm";
import {
  boolean,
  check,
  integer,
  numeric,
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
  amount: numeric("amount", { precision: 12, scale: 2 }).notNull().default("0.00"),
  currency: varchar("currency", { length: 10 }).notNull().default("ETB"),
  revisionCount: integer("revision_count").notNull().default(0),
  maxRevisions: integer("max_revisions").notNull().default(3),
  agreedAt: timestamp("agreed_at", { withTimezone: true, mode: "date" }),
  fundedAt: timestamp("funded_at", { withTimezone: true, mode: "date" }),
  completedAt: timestamp("completed_at", { withTimezone: true, mode: "date" }),
  createdAt: timestamp("created_at", { withTimezone: true, mode: "date" }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true, mode: "date" }).notNull().defaultNow(),
}, (table) => [
  check(
    "projects_status_check",
    sql`${table.status} in (
      'DRAFT',
      'AGREEMENT_PENDING',
      'AWAITING_PAYMENT',
      'PAYMENT_PENDING',
      'FUNDED',
      'ACTIVE',
      'IN_ESCROW',
      'IN_PROGRESS',
      'DELIVERABLE_SUBMITTED',
      'CLIENT_REVIEW',
      'REVISION_REQUESTED',
      'RELEASE_APPROVED',
      'PAYOUT_PENDING',
      'PAID_OUT',
      'COMPLETED',
      'DISPUTED',
      'REFUNDED',
      'CANCELLED'
    )`
  ),
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

export const payments = pgTable("payments", {
  id: uuid("id").primaryKey().defaultRandom(),
  projectId: uuid("project_id").notNull().references(() => projects.id, { onDelete: "restrict" }),
  payerId: uuid("payer_id").notNull().references(() => users.id, { onDelete: "restrict" }),
  txRef: varchar("tx_ref", { length: 100 }).notNull().unique(),
  chapaReference: varchar("chapa_reference", { length: 100 }),
  amount: numeric("amount", { precision: 12, scale: 2 }).notNull(),
  currency: varchar("currency", { length: 10 }).notNull().default("ETB"),
  status: varchar("status", { length: 32 }).notNull().default("PENDING"),
  checkoutUrl: text("checkout_url"),
  paymentMethod: varchar("payment_method", { length: 50 }),
  verifiedAt: timestamp("verified_at", { withTimezone: true, mode: "date" }),
  rawVerificationData: text("raw_verification_data"),
  createdAt: timestamp("created_at", { withTimezone: true, mode: "date" }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true, mode: "date" }).notNull().defaultNow(),
}, (table) => [
  check("payments_status_check", sql`${table.status} in ('PENDING', 'SUCCESSFUL', 'FAILED')`),
]);

export const payoutProfiles = pgTable("payout_profiles", {
  id: uuid("id").primaryKey().defaultRandom(),
  freelancerId: uuid("freelancer_id").notNull().unique().references(() => users.id, { onDelete: "cascade" }),
  bankCode: varchar("bank_code", { length: 20 }).notNull(),
  bankName: varchar("bank_name", { length: 100 }).notNull(),
  accountNumber: varchar("account_number", { length: 50 }).notNull(),
  accountName: varchar("account_name", { length: 150 }).notNull(),
  isVerified: boolean("is_verified").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true, mode: "date" }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true, mode: "date" }).notNull().defaultNow(),
});

export const payouts = pgTable("payouts", {
  id: uuid("id").primaryKey().defaultRandom(),
  projectId: uuid("project_id").notNull().references(() => projects.id, { onDelete: "restrict" }),
  freelancerId: uuid("freelancer_id").notNull().references(() => users.id, { onDelete: "restrict" }),
  reference: varchar("reference", { length: 100 }).notNull().unique(),
  chapaTransferId: varchar("chapa_transfer_id", { length: 100 }),
  amount: numeric("amount", { precision: 12, scale: 2 }).notNull(),
  currency: varchar("currency", { length: 10 }).notNull().default("ETB"),
  bankCode: varchar("bank_code", { length: 20 }).notNull(),
  accountNumber: varchar("account_number", { length: 50 }).notNull(),
  accountName: varchar("account_name", { length: 150 }).notNull(),
  status: varchar("status", { length: 32 }).notNull().default("PENDING"),
  processedAt: timestamp("processed_at", { withTimezone: true, mode: "date" }),
  failureReason: text("failure_reason"),
  rawResponse: text("raw_response"),
  createdAt: timestamp("created_at", { withTimezone: true, mode: "date" }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true, mode: "date" }).notNull().defaultNow(),
}, (table) => [
  check("payouts_status_check", sql`${table.status} in ('PENDING', 'SUCCESSFUL', 'FAILED', 'CANCELLED')`),
]);

export const webhookEvents = pgTable("webhook_events", {
  id: uuid("id").primaryKey().defaultRandom(),
  eventId: varchar("event_id", { length: 150 }).notNull().unique(),
  eventType: varchar("event_type", { length: 50 }).notNull(),
  txRef: varchar("tx_ref", { length: 100 }),
  status: varchar("status", { length: 32 }).notNull().default("PROCESSED"),
  payload: text("payload").notNull(),
  processedAt: timestamp("processed_at", { withTimezone: true, mode: "date" }).notNull().defaultNow(),
});

export const projectActivities = pgTable("project_activities", {
  id: uuid("id").primaryKey().defaultRandom(),
  projectId: uuid("project_id").notNull().references(() => projects.id, { onDelete: "cascade" }),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  action: varchar("action", { length: 50 }).notNull(),
  fromStatus: varchar("from_status", { length: 32 }),
  toStatus: varchar("to_status", { length: 32 }),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true, mode: "date" }).notNull().defaultNow(),
});


