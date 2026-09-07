import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { FINANCIAL_INSTITUTION_IDS } from '@ploutizo/types';
import { buildFinancialInstitutionCatalogInsertSql } from '../financial-institution-catalog-seed';

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
  it('seeds every catalog id from FINANCIAL_INSTITUTION_IDS', () => {
    expect(financialInstitutionMigration).toContain(
      'CREATE TABLE "financial_institutions"'
    );
    expect(financialInstitutionMigration).not.toContain('"name"');
    expect(financialInstitutionMigration).toContain(
      buildFinancialInstitutionCatalogInsertSql()
    );
    for (const id of FINANCIAL_INSTITUTION_IDS) {
      expect(financialInstitutionMigration).toContain(`('${id}')`);
    }
  });

  it('stores detected import institutions by catalog id', () => {
    expect(financialInstitutionMigration).toContain(
      'RENAME COLUMN "source" TO "detected_institution_id"'
    );
    expect(financialInstitutionMigration).toContain(
      'ALTER TABLE "import_batches" ALTER COLUMN "detected_institution_id" DROP NOT NULL'
    );
    expect(financialInstitutionMigration).toContain(
      'import_batches_detected_institution_id_financial_institutions_id_fk'
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

describe('import match decision migration', () => {
  const matchDecisionMigration = readFileSync(
    join(root, 'drizzle/0004_harsh_tusk.sql'),
    'utf8'
  );

  it('adds the accepted-match decision columns', () => {
    expect(matchDecisionMigration).toContain(
      'ADD COLUMN "review_matched_transaction_id" uuid'
    );
    expect(matchDecisionMigration).toContain(
      'ADD COLUMN "review_match_dismissed" boolean DEFAULT false NOT NULL'
    );
  });

  it('keeps the SQL-only matched-transaction composite org FK', () => {
    expect(matchDecisionMigration).toContain(
      'import_batch_rows_review_matched_transaction_id_org_id_transactions_id_org_id_fk'
    );
    expect(matchDecisionMigration).toContain(
      'ON DELETE SET NULL ("review_matched_transaction_id")'
    );
  });
});

describe('prepared revision binding migration', () => {
  const preparedRevisionMigration = readFileSync(
    join(root, 'drizzle/0005_dizzy_kang.sql'),
    'utf8'
  );

  it('adds draft revision and same-import refund target columns', () => {
    expect(preparedRevisionMigration).toContain(
      'ADD COLUMN "review_refund_of_batch_row_id" uuid'
    );
    expect(preparedRevisionMigration).toContain(
      'ADD COLUMN "revision" integer DEFAULT 1 NOT NULL'
    );
  });

  it('keeps the SQL-only same-import refund composite org FK', () => {
    expect(preparedRevisionMigration).toContain(
      'import_batch_rows_review_refund_of_batch_row_id_org_id_fk'
    );
    expect(preparedRevisionMigration).toContain(
      'ON DELETE SET NULL ("review_refund_of_batch_row_id")'
    );
  });
});

describe('completed import result migration', () => {
  const completedResultMigration = readFileSync(
    join(root, 'drizzle/0006_overjoyed_outlaw_kid.sql'),
    'utf8'
  );

  it('adds completed-result count columns and claimed prepared-set id', () => {
    expect(completedResultMigration).toContain(
      'ADD COLUMN "finalized_prepared_set_id" uuid'
    );
    expect(completedResultMigration).toContain(
      'ADD COLUMN "created_count" integer'
    );
    expect(completedResultMigration).toContain(
      'ADD COLUMN "matched_count" integer'
    );
    expect(completedResultMigration).toContain(
      'ADD COLUMN "skipped_count" integer'
    );
    expect(completedResultMigration).toContain(
      'ADD COLUMN "invalid_count" integer'
    );
  });

  it('stores created and matched links separately from transaction provenance', () => {
    expect(completedResultMigration).toContain(
      'CREATE TABLE "import_transaction_links"'
    );
    expect(completedResultMigration).toContain(
      '"outcome" "import_transaction_link_outcome" NOT NULL'
    );
    expect(completedResultMigration).toContain(
      'import_transaction_links_transaction_id_org_id_transactions_id_org_id_fk'
    );
  });

  it('reconciles completed counts to row_count and indexes history by closed time', () => {
    expect(completedResultMigration).toContain(
      'created_count + matched_count + skipped_count + invalid_count'
    );
    expect(completedResultMigration).toContain('= row_count');
    expect(completedResultMigration).toContain(
      'import_batches_org_history_closed_idx'
    );
    expect(completedResultMigration).toContain(
      'COALESCE("completed_at", "discarded_at")'
    );
  });
});
