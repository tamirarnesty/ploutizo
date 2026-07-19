ALTER TABLE "import_batch_rows" ADD COLUMN IF NOT EXISTS "review_category_id" uuid;--> statement-breakpoint
ALTER TABLE "import_batch_rows" ADD COLUMN IF NOT EXISTS "review_tag_ids" jsonb DEFAULT '[]'::jsonb NOT NULL;--> statement-breakpoint
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'import_batch_rows'
      AND column_name = 'review_category_name'
  ) THEN
    UPDATE "import_batch_rows" AS r
    SET "review_category_id" = c.id
    FROM "categories" AS c
    WHERE r."review_category_name" IS NOT NULL
      AND r."org_id" = c."org_id"
      AND lower(trim(r."review_category_name")) = lower(trim(c."name"))
      AND c."archived_at" IS NULL;
  END IF;
END $$;--> statement-breakpoint
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'import_batch_rows'
      AND column_name = 'review_tags'
  ) THEN
    UPDATE "import_batch_rows" AS r
    SET "review_tag_ids" = COALESCE(
      (
        SELECT jsonb_agg(DISTINCT t.id)
        FROM jsonb_array_elements_text(r."review_tags") AS tag_name(value)
        INNER JOIN "tags" AS t
          ON t."org_id" = r."org_id"
          AND lower(trim(tag_name.value)) = lower(trim(t."name"))
          AND t."archived_at" IS NULL
      ),
      '[]'::jsonb
    );
  END IF;
END $$;--> statement-breakpoint
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
