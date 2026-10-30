CREATE TABLE "account_recovery" (
	"profile_id" uuid PRIMARY KEY NOT NULL,
	"code_hash" text NOT NULL,
	"claimed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "account_recovery_code_hash_unique" UNIQUE("code_hash")
);
--> statement-breakpoint
ALTER TABLE "account_recovery" ADD CONSTRAINT "account_recovery_profile_id_profiles_id_fk" FOREIGN KEY ("profile_id") REFERENCES "public"."profiles"("id") ON DELETE no action ON UPDATE no action;