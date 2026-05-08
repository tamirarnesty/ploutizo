ALTER TABLE "accounts" ADD COLUMN "statement_due_day" integer;--> statement-breakpoint
CREATE INDEX "account_members_member_idx" ON "account_members" USING btree ("member_id");--> statement-breakpoint
CREATE INDEX "transaction_assignees_member_idx" ON "transaction_assignees" USING btree ("member_id");--> statement-breakpoint
ALTER TABLE "accounts" DROP COLUMN "each_person_pays_own";