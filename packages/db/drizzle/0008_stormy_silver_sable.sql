ALTER TABLE "accounts" ALTER COLUMN "type" SET DATA TYPE text;--> statement-breakpoint
UPDATE "accounts" SET "type" = 'chequing' WHERE "type" = 'other';--> statement-breakpoint
DROP TYPE "public"."account_type";--> statement-breakpoint
CREATE TYPE "public"."account_type" AS ENUM('chequing', 'savings', 'credit_card', 'prepaid_cash', 'e_transfer', 'investment');--> statement-breakpoint
ALTER TABLE "accounts" ALTER COLUMN "type" SET DATA TYPE "public"."account_type" USING "type"::"public"."account_type";