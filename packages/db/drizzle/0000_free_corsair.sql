CREATE TYPE "public"."account_type" AS ENUM('chequing', 'savings', 'credit_card', 'prepaid_cash', 'e_transfer', 'investment');--> statement-breakpoint
CREATE TYPE "public"."budget_period_type" AS ENUM('monthly', 'weekly', 'bi_weekly', 'yearly', 'custom');--> statement-breakpoint
CREATE TYPE "public"."import_batch_status" AS ENUM('draft', 'completed', 'discarded');--> statement-breakpoint
CREATE TYPE "public"."import_prepared_outcome" AS ENUM('created', 'matched', 'skipped', 'invalid', 'unresolved', 'unprocessed');--> statement-breakpoint
CREATE TYPE "public"."import_row_status" AS ENUM('ready', 'needs_review', 'invalid', 'skipped');--> statement-breakpoint
CREATE TYPE "public"."income_type" AS ENUM('direct_deposit', 'e_transfer', 'cash', 'cheque', 'other');--> statement-breakpoint
CREATE TYPE "public"."investment_type" AS ENUM('tfsa', 'rrsp', 'fhsa', 'resp', 'non_registered', 'other');--> statement-breakpoint
CREATE TYPE "public"."member_role" AS ENUM('admin');--> statement-breakpoint
CREATE TYPE "public"."merchant_match_type" AS ENUM('exact', 'contains', 'starts_with', 'ends_with', 'regex');--> statement-breakpoint
CREATE TYPE "public"."notification_type" AS ENUM('budget_caution', 'budget_over', 'settlement_reminder', 'contribution_over', 'contribution_room_refresh', 'invitation_received');--> statement-breakpoint
CREATE TYPE "public"."recurring_frequency" AS ENUM('daily', 'weekly', 'bi_weekly', 'monthly', 'yearly');--> statement-breakpoint
CREATE TYPE "public"."recurring_status" AS ENUM('active', 'stopped');--> statement-breakpoint
CREATE TYPE "public"."transaction_type" AS ENUM('expense', 'refund', 'income', 'transfer', 'settlement', 'contribution');--> statement-breakpoint
CREATE TABLE "org_members" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" text NOT NULL,
	"user_id" uuid NOT NULL,
	"role" "member_role" DEFAULT 'admin' NOT NULL,
	"display_name" text NOT NULL,
	"birth_year" integer,
	"settlementThreshold" integer,
	"joined_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "orgs" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text,
	"image_url" text,
	"settlementThreshold" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"external_id" text NOT NULL,
	"email" text NOT NULL,
	"full_name" text,
	"image_url" text,
	"first_name" text,
	"last_name" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_external_id_unique" UNIQUE("external_id"),
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "categories" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" text NOT NULL,
	"name" text NOT NULL,
	"icon" text,
	"colour" text,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"archived_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "merchant_rule_tags" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"rule_id" uuid NOT NULL,
	"tag_id" uuid NOT NULL
);
--> statement-breakpoint
CREATE TABLE "merchant_rules" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" text NOT NULL,
	"pattern" text NOT NULL,
	"match_type" "merchant_match_type" NOT NULL,
	"rename_to" text,
	"category_id" uuid,
	"assignee_id" uuid,
	"priority" integer DEFAULT 100 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tags" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" text NOT NULL,
	"name" text NOT NULL,
	"colour" text,
	"archived_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "account_members" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"account_id" uuid NOT NULL,
	"member_id" uuid NOT NULL
);
--> statement-breakpoint
CREATE TABLE "accounts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" text NOT NULL,
	"name" text NOT NULL,
	"type" "account_type" NOT NULL,
	"institution" text,
	"last_four" text,
	"statement_due_day" integer,
	"archived_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
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
	"review_category_id" uuid,
	"review_assignee_member_ids" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"review_counterpart_account_id" uuid,
	"review_refund_of" uuid,
	"review_refund_link_hint" text,
	"review_notes" text,
	"review_tag_ids" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"selected_for_import" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "import_batches" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" text NOT NULL,
	"account_id" uuid,
	"source" text NOT NULL,
	"status" "import_batch_status" DEFAULT 'draft' NOT NULL,
	"file_name" text,
	"imported_at" timestamp with time zone NOT NULL,
	"row_count" integer NOT NULL,
	"valid_row_count" integer DEFAULT 0 NOT NULL,
	"invalid_row_count" integer DEFAULT 0 NOT NULL,
	"completed_at" timestamp with time zone,
	"discarded_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "transaction_assignees" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"transaction_id" uuid NOT NULL,
	"member_id" uuid NOT NULL,
	"amount_cents" integer NOT NULL,
	"percentage" numeric(6, 3)
);
--> statement-breakpoint
CREATE TABLE "transaction_tags" (
	"transaction_id" uuid NOT NULL,
	"tag_id" uuid NOT NULL,
	CONSTRAINT "transaction_tags_transaction_id_tag_id_pk" PRIMARY KEY("transaction_id","tag_id")
);
--> statement-breakpoint
CREATE TABLE "transactions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" text NOT NULL,
	"account_id" uuid NOT NULL,
	"type" "transaction_type" NOT NULL,
	"amount" integer NOT NULL,
	"date" date NOT NULL,
	"description" text NOT NULL,
	"category_id" uuid,
	"refund_of" uuid,
	"income_type" "income_type",
	"counterpart_account_id" uuid,
	"raw_description" text,
	"notes" text,
	"import_batch_id" uuid,
	"external_id" text,
	"recurring_template_id" uuid,
	"deleted_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
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
CREATE TABLE "import_prepared_sets" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" text NOT NULL,
	"batch_id" uuid NOT NULL,
	"revision" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX "org_members_org_user_idx" ON "org_members" USING btree ("org_id","user_id");--> statement-breakpoint
CREATE INDEX "org_members_org_idx" ON "org_members" USING btree ("org_id");--> statement-breakpoint
CREATE UNIQUE INDEX "categories_org_name_idx" ON "categories" USING btree ("org_id","name");--> statement-breakpoint
CREATE UNIQUE INDEX "categories_id_org_id_idx" ON "categories" USING btree ("id","org_id");--> statement-breakpoint
CREATE INDEX "categories_org_idx" ON "categories" USING btree ("org_id");--> statement-breakpoint
CREATE UNIQUE INDEX "merchant_rule_tags_rule_tag_idx" ON "merchant_rule_tags" USING btree ("rule_id","tag_id");--> statement-breakpoint
CREATE INDEX "merchant_rules_org_idx" ON "merchant_rules" USING btree ("org_id");--> statement-breakpoint
CREATE INDEX "merchant_rules_org_priority_idx" ON "merchant_rules" USING btree ("org_id","priority");--> statement-breakpoint
CREATE UNIQUE INDEX "tags_org_name_idx" ON "tags" USING btree ("org_id","name");--> statement-breakpoint
CREATE INDEX "tags_org_idx" ON "tags" USING btree ("org_id");--> statement-breakpoint
CREATE UNIQUE INDEX "account_members_account_member_idx" ON "account_members" USING btree ("account_id","member_id");--> statement-breakpoint
CREATE INDEX "account_members_account_idx" ON "account_members" USING btree ("account_id");--> statement-breakpoint
CREATE INDEX "account_members_member_idx" ON "account_members" USING btree ("member_id");--> statement-breakpoint
CREATE INDEX "accounts_org_idx" ON "accounts" USING btree ("org_id");--> statement-breakpoint
CREATE INDEX "accounts_org_statement_due_day_idx" ON "accounts" USING btree ("org_id","statement_due_day");--> statement-breakpoint
CREATE UNIQUE INDEX "accounts_id_org_id_idx" ON "accounts" USING btree ("id","org_id");--> statement-breakpoint
CREATE INDEX "import_batch_rows_org_idx" ON "import_batch_rows" USING btree ("org_id");--> statement-breakpoint
CREATE UNIQUE INDEX "import_batch_rows_batch_row_number_idx" ON "import_batch_rows" USING btree ("batch_id","row_number");--> statement-breakpoint
CREATE UNIQUE INDEX "import_batch_rows_id_org_id_idx" ON "import_batch_rows" USING btree ("id","org_id");--> statement-breakpoint
CREATE INDEX "import_batches_org_idx" ON "import_batches" USING btree ("org_id");--> statement-breakpoint
CREATE INDEX "import_batches_org_status_idx" ON "import_batches" USING btree ("org_id","status");--> statement-breakpoint
CREATE INDEX "import_batches_org_account_idx" ON "import_batches" USING btree ("org_id","account_id");--> statement-breakpoint
CREATE UNIQUE INDEX "import_batches_id_org_id_idx" ON "import_batches" USING btree ("id","org_id");--> statement-breakpoint
CREATE UNIQUE INDEX "import_batches_one_active_draft_per_account_idx" ON "import_batches" USING btree ("org_id","account_id") WHERE status = 'draft';--> statement-breakpoint
CREATE UNIQUE INDEX "transaction_assignees_tx_member_idx" ON "transaction_assignees" USING btree ("transaction_id","member_id");--> statement-breakpoint
CREATE INDEX "transaction_assignees_tx_idx" ON "transaction_assignees" USING btree ("transaction_id");--> statement-breakpoint
CREATE INDEX "transaction_assignees_member_idx" ON "transaction_assignees" USING btree ("member_id");--> statement-breakpoint
CREATE INDEX "transactions_org_account_idx" ON "transactions" USING btree ("org_id","account_id");--> statement-breakpoint
CREATE INDEX "transactions_org_date_idx" ON "transactions" USING btree ("org_id","date");--> statement-breakpoint
CREATE INDEX "transactions_active_idx" ON "transactions" USING btree ("deleted_at") WHERE deleted_at IS NULL;--> statement-breakpoint
CREATE INDEX "transactions_org_idx" ON "transactions" USING btree ("org_id");--> statement-breakpoint
CREATE UNIQUE INDEX "transactions_id_org_id_idx" ON "transactions" USING btree ("id","org_id");--> statement-breakpoint
CREATE UNIQUE INDEX "transactions_active_account_external_id_idx" ON "transactions" USING btree ("account_id","external_id") WHERE deleted_at IS NULL AND external_id IS NOT NULL;--> statement-breakpoint
CREATE INDEX "import_prepared_outcomes_org_idx" ON "import_prepared_outcomes" USING btree ("org_id");--> statement-breakpoint
CREATE UNIQUE INDEX "import_prepared_outcomes_set_row_idx" ON "import_prepared_outcomes" USING btree ("prepared_set_id","batch_row_id");--> statement-breakpoint
CREATE INDEX "import_prepared_sets_org_idx" ON "import_prepared_sets" USING btree ("org_id");--> statement-breakpoint
CREATE UNIQUE INDEX "import_prepared_sets_batch_revision_idx" ON "import_prepared_sets" USING btree ("batch_id","revision");--> statement-breakpoint
CREATE UNIQUE INDEX "import_prepared_sets_id_org_id_idx" ON "import_prepared_sets" USING btree ("id","org_id");--> statement-breakpoint
ALTER TABLE "org_members" ADD CONSTRAINT "org_members_org_id_orgs_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."orgs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "org_members" ADD CONSTRAINT "org_members_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "categories" ADD CONSTRAINT "categories_org_id_orgs_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."orgs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "merchant_rule_tags" ADD CONSTRAINT "merchant_rule_tags_rule_id_merchant_rules_id_fk" FOREIGN KEY ("rule_id") REFERENCES "public"."merchant_rules"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "merchant_rule_tags" ADD CONSTRAINT "merchant_rule_tags_tag_id_tags_id_fk" FOREIGN KEY ("tag_id") REFERENCES "public"."tags"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "merchant_rules" ADD CONSTRAINT "merchant_rules_org_id_orgs_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."orgs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "merchant_rules" ADD CONSTRAINT "merchant_rules_category_id_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."categories"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "merchant_rules" ADD CONSTRAINT "merchant_rules_assignee_id_org_members_id_fk" FOREIGN KEY ("assignee_id") REFERENCES "public"."org_members"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tags" ADD CONSTRAINT "tags_org_id_orgs_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."orgs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "account_members" ADD CONSTRAINT "account_members_account_id_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."accounts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "account_members" ADD CONSTRAINT "account_members_member_id_org_members_id_fk" FOREIGN KEY ("member_id") REFERENCES "public"."org_members"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "accounts" ADD CONSTRAINT "accounts_org_id_orgs_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."orgs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "import_batch_rows" ADD CONSTRAINT "import_batch_rows_org_id_orgs_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."orgs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "import_batch_rows" ADD CONSTRAINT "import_batch_rows_batch_id_org_id_import_batches_id_org_id_fk" FOREIGN KEY ("batch_id","org_id") REFERENCES "public"."import_batches"("id","org_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "import_batch_rows" ADD CONSTRAINT "import_batch_rows_review_category_id_org_id_categories_id_org_id_fk" FOREIGN KEY ("review_category_id","org_id") REFERENCES "public"."categories"("id","org_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "import_batch_rows" ADD CONSTRAINT "import_batch_rows_review_counterpart_account_id_org_id_accounts_id_org_id_fk" FOREIGN KEY ("review_counterpart_account_id","org_id") REFERENCES "public"."accounts"("id","org_id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
-- SQL-only composite org FK: review_refund_of cannot be declared in Drizzle without a schema cycle.
ALTER TABLE "import_batch_rows" ADD CONSTRAINT "import_batch_rows_review_refund_of_org_id_transactions_id_org_id_fk" FOREIGN KEY ("review_refund_of","org_id") REFERENCES "public"."transactions"("id","org_id") ON DELETE SET NULL ("review_refund_of") ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "import_batches" ADD CONSTRAINT "import_batches_org_id_orgs_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."orgs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "import_batches" ADD CONSTRAINT "import_batches_account_id_org_id_accounts_id_org_id_fk" FOREIGN KEY ("account_id","org_id") REFERENCES "public"."accounts"("id","org_id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transaction_assignees" ADD CONSTRAINT "transaction_assignees_transaction_id_transactions_id_fk" FOREIGN KEY ("transaction_id") REFERENCES "public"."transactions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transaction_assignees" ADD CONSTRAINT "transaction_assignees_member_id_org_members_id_fk" FOREIGN KEY ("member_id") REFERENCES "public"."org_members"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transaction_tags" ADD CONSTRAINT "transaction_tags_transaction_id_transactions_id_fk" FOREIGN KEY ("transaction_id") REFERENCES "public"."transactions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transaction_tags" ADD CONSTRAINT "transaction_tags_tag_id_tags_id_fk" FOREIGN KEY ("tag_id") REFERENCES "public"."tags"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_org_id_orgs_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."orgs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_account_id_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."accounts"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_category_id_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."categories"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_refund_of_transactions_id_fk" FOREIGN KEY ("refund_of") REFERENCES "public"."transactions"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_counterpart_account_id_accounts_id_fk" FOREIGN KEY ("counterpart_account_id") REFERENCES "public"."accounts"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_import_batch_id_org_id_import_batches_id_org_id_fk" FOREIGN KEY ("import_batch_id","org_id") REFERENCES "public"."import_batches"("id","org_id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "import_prepared_outcomes" ADD CONSTRAINT "import_prepared_outcomes_org_id_orgs_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."orgs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "import_prepared_outcomes" ADD CONSTRAINT "import_prepared_outcomes_prepared_set_id_org_id_import_prepared_sets_id_org_id_fk" FOREIGN KEY ("prepared_set_id","org_id") REFERENCES "public"."import_prepared_sets"("id","org_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "import_prepared_outcomes" ADD CONSTRAINT "import_prepared_outcomes_batch_row_id_org_id_import_batch_rows_id_org_id_fk" FOREIGN KEY ("batch_row_id","org_id") REFERENCES "public"."import_batch_rows"("id","org_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "import_prepared_outcomes" ADD CONSTRAINT "import_prepared_outcomes_transaction_id_org_id_transactions_id_org_id_fk" FOREIGN KEY ("transaction_id","org_id") REFERENCES "public"."transactions"("id","org_id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "import_prepared_sets" ADD CONSTRAINT "import_prepared_sets_org_id_orgs_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."orgs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "import_prepared_sets" ADD CONSTRAINT "import_prepared_sets_batch_id_org_id_import_batches_id_org_id_fk" FOREIGN KEY ("batch_id","org_id") REFERENCES "public"."import_batches"("id","org_id") ON DELETE cascade ON UPDATE no action;