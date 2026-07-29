ALTER TABLE "import_batch_rows" ADD COLUMN "review_refund_of_batch_row_id" uuid;--> statement-breakpoint
CREATE INDEX "import_batch_rows_review_refund_of_batch_row_id_idx" ON "import_batch_rows" USING btree ("review_refund_of_batch_row_id");--> statement-breakpoint
-- Same-table self FK for same-import refund targets. ON DELETE SET NULL keeps
-- the refund row when the target expense row is removed.
ALTER TABLE "import_batch_rows" ADD CONSTRAINT "import_batch_rows_review_refund_of_batch_row_id_import_batch_rows_id_fk" FOREIGN KEY ("review_refund_of_batch_row_id") REFERENCES "public"."import_batch_rows"("id") ON DELETE SET NULL ON UPDATE no action;
