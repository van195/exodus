CREATE TABLE "profiles" (
	"id" serial PRIMARY KEY NOT NULL,
	"auth_user_id" uuid,
	"full_name" text,
	"email" text,
	"phone" varchar(256),
	"role" varchar(32) DEFAULT 'CLIENT' NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX "profiles_auth_user_id_unique" ON "profiles" USING btree ("auth_user_id");
--> statement-breakpoint
CREATE UNIQUE INDEX "profiles_email_unique" ON "profiles" USING btree ("email");
