ALTER TABLE "transactions" DROP CONSTRAINT "transactions_to_account_id_accounts_id_fk";
--> statement-breakpoint
ALTER TABLE "transactions" DROP CONSTRAINT "transactions_settled_account_id_accounts_id_fk";
--> statement-breakpoint
ALTER TABLE "transactions" ADD COLUMN "counterpart_account_id" uuid;
--> statement-breakpoint
ALTER TABLE "transactions" ADD COLUMN "raw_description" text;
--> statement-breakpoint
ALTER TABLE "transactions" ADD COLUMN "notes" text;
--> statement-breakpoint
UPDATE "transactions" SET "counterpart_account_id" = "to_account_id" WHERE type = 'transfer' AND "to_account_id" IS NOT NULL;
--> statement-breakpoint
UPDATE "transactions" SET "counterpart_account_id" = "settled_account_id" WHERE type = 'settlement' AND "settled_account_id" IS NOT NULL;
--> statement-breakpoint
UPDATE "transactions" SET "description" = COALESCE("merchant", '<no description>') WHERE "description" IS NULL;
--> statement-breakpoint
UPDATE "transactions" SET "raw_description" = "merchant" WHERE "import_batch_id" IS NOT NULL AND "merchant" IS NOT NULL;
--> statement-breakpoint
ALTER TABLE "transactions" ALTER COLUMN "description" SET NOT NULL;
--> statement-breakpoint
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_counterpart_account_id_accounts_id_fk" FOREIGN KEY ("counterpart_account_id") REFERENCES "public"."accounts"("id") ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "transactions" DROP COLUMN "merchant";
--> statement-breakpoint
ALTER TABLE "transactions" DROP COLUMN "income_source";
--> statement-breakpoint
ALTER TABLE "transactions" DROP COLUMN "to_account_id";
--> statement-breakpoint
ALTER TABLE "transactions" DROP COLUMN "settled_account_id";
--> statement-breakpoint
ALTER TABLE "transactions" DROP COLUMN "investment_type";
