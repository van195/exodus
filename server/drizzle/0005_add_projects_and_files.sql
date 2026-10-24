CREATE TABLE IF NOT EXISTS "projects" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" varchar(255) NOT NULL,
	"description" text,
	"client_id" uuid NOT NULL,
	"freelancer_id" uuid,
	"status" varchar(32) DEFAULT 'DRAFT' NOT NULL,
	"amount" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "projects_status_check" CHECK ("status" IN ('DRAFT', 'ACTIVE', 'IN_ESCROW', 'COMPLETED', 'DISPUTED', 'CANCELLED')),
	CONSTRAINT "projects_client_id_users_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action,
	CONSTRAINT "projects_freelancer_id_users_id_fk" FOREIGN KEY ("freelancer_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "projects_client_id_idx" ON "projects" ("client_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "projects_freelancer_id_idx" ON "projects" ("freelancer_id");
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "files" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"uploader_id" uuid NOT NULL,
	"category" varchar(32) NOT NULL,
	"original_filename" varchar(255) NOT NULL,
	"cloudinary_asset_id" varchar(255),
	"cloudinary_public_id" varchar(255) NOT NULL,
	"resource_type" varchar(32) DEFAULT 'raw' NOT NULL,
	"delivery_type" varchar(32) DEFAULT 'authenticated' NOT NULL,
	"mime_type" varchar(128) NOT NULL,
	"file_size" integer NOT NULL,
	"checksum" varchar(64) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "files_category_check" CHECK ("category" IN ('PAYMENT_RECEIPT', 'DELIVERABLE', 'AGREEMENT', 'SUPPORTING_EVIDENCE')),
	CONSTRAINT "files_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action,
	CONSTRAINT "files_uploader_id_users_id_fk" FOREIGN KEY ("uploader_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "files_project_id_idx" ON "files" ("project_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "files_uploader_id_idx" ON "files" ("uploader_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "files_category_idx" ON "files" ("category");
