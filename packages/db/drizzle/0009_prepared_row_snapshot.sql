-- Drop in-progress prepared staging. Completed imports already deleted their
-- sets; leftover rows cannot be transformed into { reviewedValues, provenance }.
TRUNCATE TABLE "import_prepared_outcomes", "import_prepared_sets";--> statement-breakpoint
DO $$ BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'import_prepared_outcomes'
      AND column_name = 'row_snapshot'
  ) THEN
    IF EXISTS (
      SELECT 1
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'import_prepared_outcomes'
        AND column_name = 'reviewed_values'
    ) THEN
      ALTER TABLE "import_prepared_outcomes" DROP COLUMN "reviewed_values";
    END IF;
  ELSIF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'import_prepared_outcomes'
      AND column_name = 'reviewed_values'
  ) THEN
    ALTER TABLE "import_prepared_outcomes" RENAME COLUMN "reviewed_values" TO "row_snapshot";
  ELSE
    RAISE EXCEPTION 'import_prepared_outcomes is missing reviewed_values and row_snapshot';
  END IF;
END $$;
