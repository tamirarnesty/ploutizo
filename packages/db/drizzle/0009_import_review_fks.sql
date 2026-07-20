ALTER TABLE "import_batch_rows" ADD COLUMN IF NOT EXISTS "review_category_id" uuid;--> statement-breakpoint
ALTER TABLE "import_batch_rows" ADD COLUMN IF NOT EXISTS "review_tag_ids" jsonb DEFAULT '[]'::jsonb NOT NULL;--> statement-breakpoint
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'import_batch_rows_review_category_id_categories_id_fk'
  ) THEN
    ALTER TABLE "import_batch_rows"
      ADD CONSTRAINT "import_batch_rows_review_category_id_categories_id_fk"
      FOREIGN KEY ("review_category_id") REFERENCES "public"."categories"("id")
      ON DELETE no action ON UPDATE no action;
  END IF;
END $$;--> statement-breakpoint
ALTER TABLE "import_batch_rows" DROP COLUMN IF EXISTS "review_category_name";--> statement-breakpoint
ALTER TABLE "import_batch_rows" DROP COLUMN IF EXISTS "review_assignee_hint";--> statement-breakpoint
ALTER TABLE "import_batch_rows" DROP COLUMN IF EXISTS "review_tags";
