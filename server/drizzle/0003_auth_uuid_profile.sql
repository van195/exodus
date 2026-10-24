ALTER TABLE "profiles" DROP CONSTRAINT "profiles_pkey";
--> statement-breakpoint
DROP INDEX "profiles_auth_user_id_unique";
--> statement-breakpoint
ALTER TABLE "profiles" DROP COLUMN "id";
--> statement-breakpoint
ALTER TABLE "profiles" RENAME COLUMN "auth_user_id" TO "id";
--> statement-breakpoint
ALTER TABLE "profiles" ALTER COLUMN "id" SET NOT NULL;
--> statement-breakpoint
ALTER TABLE "profiles" ADD CONSTRAINT "profiles_pkey" PRIMARY KEY ("id");
--> statement-breakpoint
ALTER TABLE "profiles" ALTER COLUMN "full_name" SET NOT NULL;
--> statement-breakpoint
ALTER TABLE "profiles" ALTER COLUMN "email" SET NOT NULL;
--> statement-breakpoint
ALTER TABLE "profiles" ADD CONSTRAINT "profiles_role_check" CHECK ("role" IN ('CLIENT', 'FREELANCER'));
