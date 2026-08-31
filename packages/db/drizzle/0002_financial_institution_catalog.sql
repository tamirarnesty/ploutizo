CREATE TABLE "financial_institutions" (
	"id" text PRIMARY KEY NOT NULL
);
--> statement-breakpoint
INSERT INTO "financial_institutions" ("id") VALUES
	('amex'),
	('cibc'),
	('pc_financial'),
	('td'),
	('rbc'),
	('wealthsimple');
--> statement-breakpoint
ALTER TABLE "accounts" ADD COLUMN "institution_id" text;--> statement-breakpoint
ALTER TABLE "accounts" ADD CONSTRAINT "accounts_institution_id_financial_institutions_id_fk" FOREIGN KEY ("institution_id") REFERENCES "public"."financial_institutions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "accounts" DROP COLUMN "institution";--> statement-breakpoint
ALTER TABLE "import_batches" RENAME COLUMN "source" TO "detected_institution_id";--> statement-breakpoint
UPDATE "import_batches" SET "detected_institution_id" = NULL WHERE "detected_institution_id" = 'internal';--> statement-breakpoint
ALTER TABLE "import_batches" ALTER COLUMN "detected_institution_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "import_batches" ADD CONSTRAINT "import_batches_detected_institution_id_financial_institutions_id_fk" FOREIGN KEY ("detected_institution_id") REFERENCES "public"."financial_institutions"("id") ON DELETE no action ON UPDATE no action;
