import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const root = join(dirname(fileURLToPath(import.meta.url)), '../..');
const journal = JSON.parse(
  readFileSync(join(root, 'drizzle/meta/_journal.json'), 'utf8')
) as { entries: { tag: string }[] };
const baselineMigration = readFileSync(
  join(root, `drizzle/${journal.entries[0]?.tag}.sql`),
  'utf8'
);
const deriveOnReadMigration = readFileSync(
  join(root, 'drizzle/0001_import_derive_on_read_facts.sql'),
  'utf8'
);
const financialInstitutionMigration = readFileSync(
  join(root, 'drizzle/0002_financial_institution_catalog.sql'),
  'utf8'
);

describe('baseline migration contracts', () => {
  it('scopes external-id uniqueness to active rows only', () => {
    expect(baselineMigration).toContain(
      'CREATE UNIQUE INDEX "transactions_active_account_external_id_idx"'
    );
    expect(baselineMigration).toContain(
      'WHERE deleted_at IS NULL AND external_id IS NOT NULL'
    );
  });

  it('keeps the SQL-only review_refund_of composite org FK', () => {
    expect(baselineMigration).toContain(
      'import_batch_rows_review_refund_of_org_id_transactions_id_org_id_fk'
    );
    expect(baselineMigration).toContain(
      'ON DELETE SET NULL ("review_refund_of")'
    );
  });

  it('uses composite org FKs without legacy single-column fallbacks', () => {
    expect(baselineMigration).toContain(
      'import_batch_rows_review_category_id_org_id_categories_id_org_id_fk'
    );
    expect(baselineMigration).toContain(
      'import_prepared_sets_batch_id_org_id_import_batches_id_org_id_fk'
    );
    expect(baselineMigration).not.toContain(
      'import_batch_rows_batch_id_import_batches_id_fk'
    );
    expect(baselineMigration).not.toContain(
      'import_batches_account_id_accounts_id_fk'
    );
    expect(baselineMigration).not.toContain(
      'transactions_import_batch_id_import_batches_id_fk'
    );
  });

  it('retains upload source facts, reviewed values, selection, and batch lifecycle', () => {
    expect(baselineMigration).toContain('"row_count" integer NOT NULL');
    expect(baselineMigration).toContain('"selected_for_import"');
    expect(baselineMigration).toContain('"review_date"');
    expect(baselineMigration).toContain('"review_amount"');
    expect(baselineMigration).toContain('"external_id"');
    expect(baselineMigration).toContain('"completed_at"');
    expect(baselineMigration).toContain('"discarded_at"');
    expect(baselineMigration).toContain('"imported_at"');
  });
});

describe('derive-on-read facts cleanup migration', () => {
  it('drops persisted review status, invalid reasons, and upload-time counts', () => {
    expect(deriveOnReadMigration).toContain(
      'ALTER TABLE "import_batch_rows" DROP COLUMN "status"'
    );
    expect(deriveOnReadMigration).toContain(
      'ALTER TABLE "import_batch_rows" DROP COLUMN "invalid_reason"'
    );
    expect(deriveOnReadMigration).toContain(
      'ALTER TABLE "import_batches" DROP COLUMN "valid_row_count"'
    );
    expect(deriveOnReadMigration).toContain(
      'ALTER TABLE "import_batches" DROP COLUMN "invalid_row_count"'
    );
    expect(deriveOnReadMigration).toContain(
      'DROP TYPE "public"."import_row_status"'
    );
  });

  it('does not drop source, lifecycle, or reviewed-value columns', () => {
    expect(deriveOnReadMigration).not.toContain('DROP COLUMN "row_count"');
    expect(deriveOnReadMigration).not.toContain(
      'DROP COLUMN "selected_for_import"'
    );
    expect(deriveOnReadMigration).not.toContain('DROP COLUMN "review_date"');
    expect(deriveOnReadMigration).not.toContain('DROP COLUMN "completed_at"');
    expect(deriveOnReadMigration).not.toContain('DROP COLUMN "discarded_at"');
    expect(deriveOnReadMigration).not.toContain('DROP COLUMN "external_id"');
  });
});

describe('financial institution catalog migration', () => {
  it('seeds the fixed Financial institution catalog', () => {
    expect(financialInstitutionMigration).toContain(
      'CREATE TABLE "financial_institutions"'
    );
    expect(financialInstitutionMigration).toContain("('amex', 'Amex')");
    expect(financialInstitutionMigration).toContain("('cibc', 'CIBC')");
    expect(financialInstitutionMigration).toContain(
      "('pc_financial', 'PC Financial')"
    );
    expect(financialInstitutionMigration).toContain("('td', 'TD')");
    expect(financialInstitutionMigration).toContain("('rbc', 'RBC')");
    expect(financialInstitutionMigration).toContain(
      "('wealthsimple', 'Wealthsimple')"
    );
  });

  it('replaces the free-text institution column without a data-clearing UPDATE', () => {
    const addAt = financialInstitutionMigration.indexOf(
      'ADD COLUMN "institution_id"'
    );
    const dropAt = financialInstitutionMigration.indexOf(
      'DROP COLUMN "institution"'
    );
    expect(addAt).toBeGreaterThan(-1);
    expect(dropAt).toBeGreaterThan(addAt);
    expect(financialInstitutionMigration).not.toContain(
      'UPDATE "accounts" SET "institution"'
    );
    expect(financialInstitutionMigration).not.toContain(
      'SET "institution_id" ='
    );
  });
});
