CREATE UNIQUE INDEX "transactions_id_org_id_idx" ON "transactions" USING btree ("id","org_id");--> statement-breakpoint
ALTER TABLE "import_prepared_outcomes" DROP CONSTRAINT "import_prepared_outcomes_transaction_id_transactions_id_fk";--> statement-breakpoint
ALTER TABLE "import_prepared_outcomes" ADD CONSTRAINT "import_prepared_outcomes_transaction_id_org_id_transactions_id_org_id_fk" FOREIGN KEY ("transaction_id","org_id") REFERENCES "public"."transactions"("id","org_id") ON DELETE set null ON UPDATE no action;
