-- PLO-33: Replace detected_institution_id with content_profile_id on import_batches.
-- This is a breaking change with no compatibility path.
--> statement-breakpoint
ALTER TABLE "import_batches" DROP CONSTRAINT IF EXISTS "import_batches_detected_institution_id_financial_institutions_id_fk";
--> statement-breakpoint
ALTER TABLE "import_batches" ADD COLUMN "content_profile_id" text;
--> statement-breakpoint
ALTER TABLE "import_batches" DROP COLUMN "detected_institution_id";
