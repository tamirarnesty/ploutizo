ALTER TABLE "org_members" ADD COLUMN "external_id" text;--> statement-breakpoint
ALTER TABLE "org_members" ADD COLUMN "membership_created_at" timestamp with time zone;
