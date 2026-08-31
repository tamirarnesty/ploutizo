CREATE TABLE "financial_institutions" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL
);
--> statement-breakpoint
INSERT INTO "financial_institutions" ("id", "name") VALUES
	('amex', 'Amex'),
	('cibc', 'CIBC'),
	('pc_financial', 'PC Financial'),
	('td', 'TD'),
	('rbc', 'RBC'),
	('wealthsimple', 'Wealthsimple');
--> statement-breakpoint
ALTER TABLE "accounts" ADD COLUMN "institution_id" text;--> statement-breakpoint
ALTER TABLE "accounts" ADD CONSTRAINT "accounts_institution_id_financial_institutions_id_fk" FOREIGN KEY ("institution_id") REFERENCES "public"."financial_institutions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "accounts" DROP COLUMN "institution";
