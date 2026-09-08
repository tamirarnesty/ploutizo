-- Drop in-progress prepared staging. Completed imports already deleted their
-- sets; leftover rows cannot be transformed into { reviewedValues, provenance }.
TRUNCATE TABLE "import_prepared_outcomes", "import_prepared_sets";--> statement-breakpoint
ALTER TABLE "import_prepared_outcomes" RENAME COLUMN "reviewed_values" TO "row_snapshot";