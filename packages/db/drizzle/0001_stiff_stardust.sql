ALTER TABLE "invitations" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
DROP TABLE "invitations" CASCADE;--> statement-breakpoint
DROP INDEX "orgs_subdomain_idx";--> statement-breakpoint
ALTER TABLE "org_members" ALTER COLUMN "org_id" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "orgs" ALTER COLUMN "id" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "orgs" ALTER COLUMN "id" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "orgs" DROP COLUMN "display_name";--> statement-breakpoint
ALTER TABLE "orgs" DROP COLUMN "subdomain";--> statement-breakpoint
DROP TYPE "public"."invitation_status";