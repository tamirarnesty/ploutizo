CREATE TYPE "public"."import_prepared_outcome" AS ENUM('created', 'matched', 'skipped', 'invalid', 'unresolved', 'unprocessed');--> statement-breakpoint
CREATE TABLE "import_prepared_sets" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" text NOT NULL,
	"batch_id" uuid NOT NULL,
	"revision" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "import_prepared_outcomes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" text NOT NULL,
	"prepared_set_id" uuid NOT NULL,
	"batch_row_id" uuid NOT NULL,
	"outcome" "import_prepared_outcome" NOT NULL,
	"transaction_id" uuid,
	"reviewed_values" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "import_batch_rows" DROP CONSTRAINT "import_batch_rows_review_category_id_categories_id_fk";--> statement-breakpoint
ALTER TABLE "import_batch_rows" ADD COLUMN "review_counterpart_account_id" uuid;--> statement-breakpoint
ALTER TABLE "import_batch_rows" ADD COLUMN "review_refund_of" uuid;--> statement-breakpoint
ALTER TABLE "transactions" ADD COLUMN "external_id" text;--> statement-breakpoint
CREATE UNIQUE INDEX "categories_id_org_id_idx" ON "categories" USING btree ("id","org_id");--> statement-breakpoint
CREATE UNIQUE INDEX "import_batch_rows_id_org_id_idx" ON "import_batch_rows" USING btree ("id","org_id");--> statement-breakpoint
CREATE UNIQUE INDEX "import_prepared_sets_id_org_id_idx" ON "import_prepared_sets" USING btree ("id","org_id");--> statement-breakpoint
CREATE INDEX "import_prepared_sets_org_idx" ON "import_prepared_sets" USING btree ("org_id");--> statement-breakpoint
CREATE UNIQUE INDEX "import_prepared_sets_batch_revision_idx" ON "import_prepared_sets" USING btree ("batch_id","revision");--> statement-breakpoint
CREATE INDEX "import_prepared_outcomes_org_idx" ON "import_prepared_outcomes" USING btree ("org_id");--> statement-breakpoint
CREATE UNIQUE INDEX "import_prepared_outcomes_set_row_idx" ON "import_prepared_outcomes" USING btree ("prepared_set_id","batch_row_id");--> statement-breakpoint
CREATE UNIQUE INDEX "transactions_id_org_id_idx" ON "transactions" USING btree ("id","org_id");--> statement-breakpoint
CREATE UNIQUE INDEX "transactions_active_account_external_id_idx" ON "transactions" USING btree ("account_id","external_id") WHERE deleted_at IS NULL AND external_id IS NOT NULL;--> statement-breakpoint
ALTER TABLE "import_prepared_sets" ADD CONSTRAINT "import_prepared_sets_org_id_orgs_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."orgs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "import_prepared_sets" ADD CONSTRAINT "import_prepared_sets_batch_id_org_id_import_batches_id_org_id_fk" FOREIGN KEY ("batch_id","org_id") REFERENCES "public"."import_batches"("id","org_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "import_prepared_outcomes" ADD CONSTRAINT "import_prepared_outcomes_org_id_orgs_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."orgs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "import_prepared_outcomes" ADD CONSTRAINT "import_prepared_outcomes_prepared_set_id_org_id_import_prepared_sets_id_org_id_fk" FOREIGN KEY ("prepared_set_id","org_id") REFERENCES "public"."import_prepared_sets"("id","org_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "import_prepared_outcomes" ADD CONSTRAINT "import_prepared_outcomes_batch_row_id_org_id_import_batch_rows_id_org_id_fk" FOREIGN KEY ("batch_row_id","org_id") REFERENCES "public"."import_batch_rows"("id","org_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "import_prepared_outcomes" ADD CONSTRAINT "import_prepared_outcomes_transaction_id_org_id_transactions_id_org_id_fk" FOREIGN KEY ("transaction_id","org_id") REFERENCES "public"."transactions"("id","org_id") ON DELETE SET NULL ("transaction_id") ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "import_batch_rows" ADD CONSTRAINT "import_batch_rows_review_category_id_org_id_categories_id_org_id_fk" FOREIGN KEY ("review_category_id","org_id") REFERENCES "public"."categories"("id","org_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "import_batch_rows" ADD CONSTRAINT "import_batch_rows_review_counterpart_account_id_org_id_accounts_id_org_id_fk" FOREIGN KEY ("review_counterpart_account_id","org_id") REFERENCES "public"."accounts"("id","org_id") ON DELETE SET NULL ("review_counterpart_account_id") ON UPDATE no action;--> statement-breakpoint
-- SQL-only composite org FK: review_refund_of cannot be declared in
-- packages/db/src/schema/import-batches.ts without a transactions ↔ import_batches
-- cycle. Keep constraint name in sync with the reviewRefundOf schema comment.
ALTER TABLE "import_batch_rows" ADD CONSTRAINT "import_batch_rows_review_refund_of_org_id_transactions_id_org_id_fk" FOREIGN KEY ("review_refund_of","org_id") REFERENCES "public"."transactions"("id","org_id") ON DELETE SET NULL ("review_refund_of") ON UPDATE no action;
