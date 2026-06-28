CREATE TYPE "public"."import_batch_status" AS ENUM('draft', 'completed', 'discarded');--> statement-breakpoint
CREATE TYPE "public"."import_row_status" AS ENUM('ready', 'needs_review', 'invalid', 'skipped');--> statement-breakpoint
CREATE TABLE "import_batch_rows" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"batch_id" uuid NOT NULL,
	"org_id" text NOT NULL,
	"row_number" integer NOT NULL,
	"status" "import_row_status" NOT NULL,
	"invalid_reason" text,
	"raw_data" jsonb NOT NULL,
	"external_id" text,
	"source_date" text,
	"source_amount" text,
	"source_description" text,
	"source_type" text,
	"parsed_date" date,
	"parsed_amount" integer,
	"parsed_type" "transaction_type",
	"parsed_description" text,
	"review_date" date,
	"review_amount" integer,
	"review_type" "transaction_type",
	"review_description" text,
	"review_category_name" text,
	"review_assignee_hint" text,
	"review_refund_link_hint" text,
	"review_notes" text,
	"review_tags" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "import_batches" ADD COLUMN "account_id" uuid;--> statement-breakpoint
ALTER TABLE "import_batches" ADD COLUMN "status" "import_batch_status" DEFAULT 'completed' NOT NULL;--> statement-breakpoint
ALTER TABLE "import_batches" ADD COLUMN "file_name" text;--> statement-breakpoint
ALTER TABLE "import_batches" ADD COLUMN "valid_row_count" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "import_batches" ADD COLUMN "invalid_row_count" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "import_batches" ADD COLUMN "completed_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "import_batches" ADD COLUMN "discarded_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "import_batches" ADD COLUMN "updated_at" timestamp with time zone DEFAULT now() NOT NULL;--> statement-breakpoint
UPDATE "import_batches" SET "completed_at" = "imported_at", "valid_row_count" = "row_count" WHERE "account_id" IS NULL;--> statement-breakpoint
UPDATE "import_batches" ib
SET "account_id" = (
  SELECT t."account_id"
  FROM "transactions" t
  WHERE t."import_batch_id" = ib."id"
  ORDER BY t."created_at"
  LIMIT 1
)
WHERE ib."account_id" IS NULL
  AND EXISTS (
    SELECT 1 FROM "transactions" t WHERE t."import_batch_id" = ib."id"
  );--> statement-breakpoint
ALTER TABLE "import_batches" ALTER COLUMN "status" SET DEFAULT 'draft';--> statement-breakpoint
ALTER TABLE "import_batch_rows" ADD CONSTRAINT "import_batch_rows_batch_id_import_batches_id_fk" FOREIGN KEY ("batch_id") REFERENCES "public"."import_batches"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "import_batches_id_org_id_idx" ON "import_batches" USING btree ("id","org_id");--> statement-breakpoint
ALTER TABLE "import_batch_rows" ADD CONSTRAINT "import_batch_rows_batch_org_fk" FOREIGN KEY ("batch_id","org_id") REFERENCES "public"."import_batches"("id","org_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "import_batch_rows" ADD CONSTRAINT "import_batch_rows_org_id_orgs_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."orgs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "import_batch_rows_batch_idx" ON "import_batch_rows" USING btree ("batch_id");--> statement-breakpoint
CREATE INDEX "import_batch_rows_org_idx" ON "import_batch_rows" USING btree ("org_id");--> statement-breakpoint
CREATE UNIQUE INDEX "import_batch_rows_batch_row_number_idx" ON "import_batch_rows" USING btree ("batch_id","row_number");--> statement-breakpoint
ALTER TABLE "import_batches" ADD CONSTRAINT "import_batches_account_id_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."accounts"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "import_batches_org_status_idx" ON "import_batches" USING btree ("org_id","status");--> statement-breakpoint
CREATE INDEX "import_batches_org_account_idx" ON "import_batches" USING btree ("org_id","account_id");--> statement-breakpoint
CREATE UNIQUE INDEX "import_batches_one_active_draft_per_account_idx" ON "import_batches" USING btree ("org_id","account_id") WHERE status = 'draft';
