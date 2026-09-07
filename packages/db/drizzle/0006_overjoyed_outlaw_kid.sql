CREATE TYPE "public"."import_transaction_link_outcome" AS ENUM('created', 'matched');--> statement-breakpoint
CREATE TABLE "import_transaction_links" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" text NOT NULL,
	"batch_id" uuid NOT NULL,
	"batch_row_id" uuid NOT NULL,
	"transaction_id" uuid NOT NULL,
	"outcome" "import_transaction_link_outcome" NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "import_batches" ADD COLUMN "finalized_prepared_set_id" uuid;--> statement-breakpoint
ALTER TABLE "import_batches" ADD COLUMN "created_count" integer;--> statement-breakpoint
ALTER TABLE "import_batches" ADD COLUMN "matched_count" integer;--> statement-breakpoint
ALTER TABLE "import_batches" ADD COLUMN "skipped_count" integer;--> statement-breakpoint
ALTER TABLE "import_batches" ADD COLUMN "invalid_count" integer;--> statement-breakpoint
ALTER TABLE "import_transaction_links" ADD CONSTRAINT "import_transaction_links_org_id_orgs_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."orgs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "import_transaction_links" ADD CONSTRAINT "import_transaction_links_batch_id_org_id_import_batches_id_org_id_fk" FOREIGN KEY ("batch_id","org_id") REFERENCES "public"."import_batches"("id","org_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "import_transaction_links" ADD CONSTRAINT "import_transaction_links_batch_row_id_org_id_import_batch_rows_id_org_id_fk" FOREIGN KEY ("batch_row_id","org_id") REFERENCES "public"."import_batch_rows"("id","org_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "import_transaction_links" ADD CONSTRAINT "import_transaction_links_transaction_id_org_id_transactions_id_org_id_fk" FOREIGN KEY ("transaction_id","org_id") REFERENCES "public"."transactions"("id","org_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "import_transaction_links_org_idx" ON "import_transaction_links" USING btree ("org_id");--> statement-breakpoint
CREATE INDEX "import_transaction_links_org_batch_outcome_idx" ON "import_transaction_links" USING btree ("org_id","batch_id","outcome");--> statement-breakpoint
CREATE UNIQUE INDEX "import_transaction_links_batch_row_idx" ON "import_transaction_links" USING btree ("batch_id","batch_row_id");--> statement-breakpoint
CREATE UNIQUE INDEX "import_transaction_links_id_org_id_idx" ON "import_transaction_links" USING btree ("id","org_id");--> statement-breakpoint
CREATE UNIQUE INDEX "import_transaction_links_batch_transaction_idx" ON "import_transaction_links" USING btree ("batch_id","transaction_id");--> statement-breakpoint
ALTER TABLE "import_batches" ADD CONSTRAINT "import_batches_lifecycle_result_check" CHECK (
        (
          status = 'draft'
          AND completed_at IS NULL
          AND discarded_at IS NULL
          AND finalized_prepared_set_id IS NULL
          AND created_count IS NULL
          AND matched_count IS NULL
          AND skipped_count IS NULL
          AND invalid_count IS NULL
        )
        OR (
          status = 'discarded'
          AND discarded_at IS NOT NULL
          AND completed_at IS NULL
          AND finalized_prepared_set_id IS NULL
          AND created_count IS NULL
          AND matched_count IS NULL
          AND skipped_count IS NULL
          AND invalid_count IS NULL
        )
        OR (
          status = 'completed'
          AND completed_at IS NOT NULL
          AND discarded_at IS NULL
          AND finalized_prepared_set_id IS NOT NULL
          AND created_count IS NOT NULL
          AND matched_count IS NOT NULL
          AND skipped_count IS NOT NULL
          AND invalid_count IS NOT NULL
          AND created_count + matched_count + skipped_count + invalid_count
            = row_count
        )
      );--> statement-breakpoint
CREATE INDEX "import_batches_org_history_closed_idx" ON "import_batches" USING btree (
  "org_id",
  (COALESCE("completed_at", "discarded_at")) DESC,
  "id" DESC
) WHERE "status" IN ('completed', 'discarded');