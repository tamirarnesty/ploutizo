ALTER TABLE "import_batches" DROP CONSTRAINT "import_batches_detected_institution_id_financial_institutions_id_fk";
--> statement-breakpoint
ALTER TABLE "import_batches" ADD COLUMN "content_profile_id" text;--> statement-breakpoint
ALTER TABLE "import_batches" DROP COLUMN "detected_institution_id";--> statement-breakpoint
ALTER TABLE "import_batches" ADD CONSTRAINT "import_batches_content_profile_id_check" CHECK (content_profile_id is null or content_profile_id in ('internal', 'amex', 'pc_financial', 'mdy_debit_credit_balance', 'iso_debit_credit_masked_card'));