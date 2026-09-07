ALTER TABLE "import_batch_rows" ADD COLUMN "review_refund_of_batch_row_id" uuid;--> statement-breakpoint
ALTER TABLE "import_batches" ADD COLUMN "revision" integer DEFAULT 1 NOT NULL;--> statement-breakpoint
-- SQL-only composite org FK: SET NULL only the nullable column so org_id remains.
ALTER TABLE "import_batch_rows" ADD CONSTRAINT "import_batch_rows_review_refund_of_batch_row_id_org_id_fk" FOREIGN KEY ("review_refund_of_batch_row_id","org_id") REFERENCES "public"."import_batch_rows"("id","org_id") ON DELETE SET NULL ("review_refund_of_batch_row_id") ON UPDATE no action;