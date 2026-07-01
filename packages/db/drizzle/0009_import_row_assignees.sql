ALTER TABLE "import_batch_rows" ADD COLUMN "review_assignee_member_ids" jsonb DEFAULT '[]'::jsonb NOT NULL;
