DROP TABLE IF EXISTS "import_prepared_outcomes";--> statement-breakpoint
DROP TABLE IF EXISTS "import_prepared_sets";--> statement-breakpoint
DROP TYPE IF EXISTS "import_prepared_outcome";--> statement-breakpoint
ALTER TABLE "import_batch_rows" DROP COLUMN IF EXISTS "selected_for_import";--> statement-breakpoint
ALTER TABLE "import_batches" DROP COLUMN IF EXISTS "revision";--> statement-breakpoint
ALTER TABLE "import_batches" DROP COLUMN IF EXISTS "finalized_prepared_set_id";--> statement-breakpoint
ALTER TABLE "import_batches" DROP CONSTRAINT IF EXISTS "import_batches_lifecycle_result_check";--> statement-breakpoint
ALTER TABLE "import_batches" ADD CONSTRAINT "import_batches_lifecycle_result_check" CHECK (
        (
          status = 'draft'
          AND completed_at IS NULL
          AND discarded_at IS NULL
          AND created_count IS NULL
          AND matched_count IS NULL
          AND skipped_count IS NULL
          AND invalid_count IS NULL
        )
        OR (
          status = 'discarded'
          AND discarded_at IS NOT NULL
          AND completed_at IS NULL
          AND created_count IS NULL
          AND matched_count IS NULL
          AND skipped_count IS NULL
          AND invalid_count IS NULL
        )
        OR (
          status = 'completed'
          AND completed_at IS NOT NULL
          AND discarded_at IS NULL
          AND created_count IS NOT NULL
          AND matched_count IS NOT NULL
          AND skipped_count IS NOT NULL
          AND invalid_count IS NOT NULL
          AND created_count + matched_count + skipped_count + invalid_count
            = row_count
        )
      );
