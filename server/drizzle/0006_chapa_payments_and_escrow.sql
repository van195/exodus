ALTER TABLE "projects" DROP CONSTRAINT IF EXISTS "projects_status_check";
--> statement-breakpoint
ALTER TABLE "projects" ALTER COLUMN "amount" TYPE numeric(12, 2) USING amount::numeric(12, 2);
--> statement-breakpoint
ALTER TABLE "projects" ALTER COLUMN "amount" SET DEFAULT 0.00;
--> statement-breakpoint
ALTER TABLE "projects" ADD COLUMN IF NOT EXISTS "currency" varchar(10) DEFAULT 'ETB' NOT NULL;
--> statement-breakpoint
ALTER TABLE "projects" ADD COLUMN IF NOT EXISTS "revision_count" integer DEFAULT 0 NOT NULL;
--> statement-breakpoint
ALTER TABLE "projects" ADD COLUMN IF NOT EXISTS "max_revisions" integer DEFAULT 3 NOT NULL;
--> statement-breakpoint
ALTER TABLE "projects" ADD COLUMN IF NOT EXISTS "agreed_at" timestamp with time zone;
--> statement-breakpoint
ALTER TABLE "projects" ADD COLUMN IF NOT EXISTS "funded_at" timestamp with time zone;
--> statement-breakpoint
ALTER TABLE "projects" ADD COLUMN IF NOT EXISTS "completed_at" timestamp with time zone;
--> statement-breakpoint
ALTER TABLE "projects" ADD CONSTRAINT "projects_status_check" CHECK ("status" IN (
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
));
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "payments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"payer_id" uuid NOT NULL,
	"tx_ref" varchar(100) NOT NULL UNIQUE,
	"chapa_reference" varchar(100),
	"amount" numeric(12, 2) NOT NULL,
	"currency" varchar(10) DEFAULT 'ETB' NOT NULL,
	"status" varchar(32) DEFAULT 'PENDING' NOT NULL,
	"checkout_url" text,
	"payment_method" varchar(50),
	"verified_at" timestamp with time zone,
	"raw_verification_data" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "payments_status_check" CHECK ("status" IN ('PENDING', 'SUCCESSFUL', 'FAILED')),
	CONSTRAINT "payments_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE restrict ON UPDATE no action,
	CONSTRAINT "payments_payer_id_users_id_fk" FOREIGN KEY ("payer_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "payments_project_id_idx" ON "payments" ("project_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "payments_payer_id_idx" ON "payments" ("payer_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "payments_tx_ref_idx" ON "payments" ("tx_ref");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "payments_status_idx" ON "payments" ("status");
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "payout_profiles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"freelancer_id" uuid NOT NULL UNIQUE,
	"bank_code" varchar(20) NOT NULL,
	"bank_name" varchar(100) NOT NULL,
	"account_number" varchar(50) NOT NULL,
	"account_name" varchar(150) NOT NULL,
	"is_verified" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "payout_profiles_freelancer_id_users_id_fk" FOREIGN KEY ("freelancer_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "payouts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"freelancer_id" uuid NOT NULL,
	"reference" varchar(100) NOT NULL UNIQUE,
	"chapa_transfer_id" varchar(100),
	"amount" numeric(12, 2) NOT NULL,
	"currency" varchar(10) DEFAULT 'ETB' NOT NULL,
	"bank_code" varchar(20) NOT NULL,
	"account_number" varchar(50) NOT NULL,
	"account_name" varchar(150) NOT NULL,
	"status" varchar(32) DEFAULT 'PENDING' NOT NULL,
	"processed_at" timestamp with time zone,
	"failure_reason" text,
	"raw_response" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "payouts_status_check" CHECK ("status" IN ('PENDING', 'SUCCESSFUL', 'FAILED', 'CANCELLED')),
	CONSTRAINT "payouts_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE restrict ON UPDATE no action,
	CONSTRAINT "payouts_freelancer_id_users_id_fk" FOREIGN KEY ("freelancer_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "payouts_project_id_idx" ON "payouts" ("project_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "payouts_reference_idx" ON "payouts" ("reference");
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "webhook_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"event_id" varchar(150) NOT NULL UNIQUE,
	"event_type" varchar(50) NOT NULL,
	"tx_ref" varchar(100),
	"status" varchar(32) DEFAULT 'PROCESSED' NOT NULL,
	"payload" text NOT NULL,
	"processed_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "project_activities" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"action" varchar(50) NOT NULL,
	"from_status" varchar(32),
	"to_status" varchar(32),
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "project_activities_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action,
	CONSTRAINT "project_activities_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "project_activities_project_id_idx" ON "project_activities" ("project_id");
