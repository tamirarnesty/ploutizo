ALTER TABLE "import_batch_rows" DROP COLUMN "status";--> statement-breakpoint
ALTER TABLE "import_batch_rows" DROP COLUMN "invalid_reason";--> statement-breakpoint
ALTER TABLE "import_batches" DROP COLUMN "valid_row_count";--> statement-breakpoint
ALTER TABLE "import_batches" DROP COLUMN "invalid_row_count";--> statement-breakpoint
DROP TYPE "public"."import_row_status";