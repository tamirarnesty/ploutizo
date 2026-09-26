ALTER TABLE "orgs" ADD COLUMN IF NOT EXISTS "auto_check_import_row_when_ready" boolean DEFAULT true NOT NULL;
