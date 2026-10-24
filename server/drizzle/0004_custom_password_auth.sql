-- Refuse to rewrite legacy user records without an explicit data migration.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM public.users) THEN
    RAISE EXCEPTION 'users is not empty; migrate existing records and credentials explicitly before custom auth';
  END IF;
END $$;
--> statement-breakpoint
ALTER TABLE "users" ALTER COLUMN "id" DROP DEFAULT;
--> statement-breakpoint
ALTER TABLE "users" ALTER COLUMN "id" TYPE uuid USING gen_random_uuid();
--> statement-breakpoint
ALTER TABLE "users" ALTER COLUMN "id" SET DEFAULT gen_random_uuid();
--> statement-breakpoint
ALTER TABLE "users" ALTER COLUMN "full_name" TYPE varchar(150);
--> statement-breakpoint
ALTER TABLE "users" ALTER COLUMN "full_name" SET NOT NULL;
--> statement-breakpoint
ALTER TABLE "users" ALTER COLUMN "email" TYPE varchar(320);
--> statement-breakpoint
ALTER TABLE "users" ALTER COLUMN "email" SET NOT NULL;
--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "password_hash" text NOT NULL;
--> statement-breakpoint
ALTER TABLE "users" ALTER COLUMN "phone" TYPE varchar(32);
--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "created_at" timestamp with time zone DEFAULT now() NOT NULL;
--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_role_check" CHECK ("role" IN ('CLIENT', 'FREELANCER', 'ADMIN'));
--> statement-breakpoint
ALTER TABLE "users" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
REVOKE ALL ON TABLE public.users FROM anon, authenticated;
