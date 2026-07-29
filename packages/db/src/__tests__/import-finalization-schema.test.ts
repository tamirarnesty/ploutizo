import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const root = join(dirname(fileURLToPath(import.meta.url)), '../..');
const migration = readFileSync(
  join(root, 'drizzle/0010_import_finalization_foundation.sql'),
  'utf8'
);
const classificationMigration = readFileSync(
  join(root, 'drizzle/0011_import_classification_refund_links.sql'),
  'utf8'
);
const importDraftsMigration = readFileSync(
  join(root, 'drizzle/0007_import_drafts.sql'),
  'utf8'
);
const accountsSchema = readFileSync(
  join(root, 'src/schema/accounts.ts'),
  'utf8'
);
const categoriesSchema = readFileSync(
  join(root, 'src/schema/classification.ts'),
  'utf8'
);
const importBatchesSchema = readFileSync(
  join(root, 'src/schema/import-batches.ts'),
  'utf8'
);
const transactionsSchema = readFileSync(
  join(root, 'src/schema/transactions.ts'),
  'utf8'
);

describe('import finalization foundation schema contracts', () => {
  it('scopes external-id uniqueness to active rows only', () => {
    expect(transactionsSchema).toContain(
      'transactions_active_account_external_id_idx'
    );
    expect(transactionsSchema).toContain(
      'deleted_at IS NULL AND external_id IS NOT NULL'
    );
    expect(migration).toContain(
      'CREATE UNIQUE INDEX "transactions_active_account_external_id_idx"'
    );
    expect(migration).toContain(
      'WHERE deleted_at IS NULL AND external_id IS NOT NULL'
    );
  });

  it('uses composite org FKs for draft review category, funding, and refund', () => {
    expect(accountsSchema).toContain("uniqueIndex('accounts_id_org_id_idx')");
    expect(categoriesSchema).toContain(
      "uniqueIndex('categories_id_org_id_idx')"
    );
    expect(importBatchesSchema).toContain(
      'columns: [t.reviewCategoryId, t.orgId]'
    );
    expect(importBatchesSchema).toContain(
      'columns: [t.reviewCounterpartAccountId, t.orgId]'
    );
    expect(importBatchesSchema).toContain('reviewRefundOfBatchRowId');

    expect(importDraftsMigration).toContain(
      'CREATE UNIQUE INDEX "accounts_id_org_id_idx"'
    );
    expect(migration).toContain(
      'CREATE UNIQUE INDEX "categories_id_org_id_idx"'
    );
    expect(migration).toContain(
      'import_batch_rows_review_category_id_org_id_categories_id_org_id_fk'
    );
    expect(migration).toContain(
      'import_batch_rows_review_counterpart_account_id_org_id_accounts_id_org_id_fk'
    );
    expect(migration).toContain(
      'import_batch_rows_review_refund_of_org_id_transactions_id_org_id_fk'
    );
    expect(migration).toContain(
      'ON DELETE SET NULL ("review_counterpart_account_id")'
    );
    expect(migration).toContain('ON DELETE SET NULL ("review_refund_of")');
    expect(migration).toContain('ON DELETE SET NULL ("transaction_id")');
    expect(importBatchesSchema).toContain(
      'import_batch_rows_review_refund_of_org_id_transactions_id_org_id_fk'
    );
    expect(migration).toContain('SQL-only composite org FK');
  });

  it('uses composite FKs without redundant single-column constraints', () => {
    expect(migration).toContain(
      'import_prepared_sets_batch_id_org_id_import_batches_id_org_id_fk'
    );
    expect(migration).toContain(
      'import_prepared_outcomes_prepared_set_id_org_id_import_prepared_sets_id_org_id_fk'
    );
    expect(migration).toContain(
      'import_prepared_outcomes_batch_row_id_org_id_import_batch_rows_id_org_id_fk'
    );
    expect(migration).not.toContain(
      'import_prepared_sets_batch_id_import_batches_id_fk'
    );
    expect(migration).not.toContain(
      'import_prepared_outcomes_prepared_set_id_import_prepared_sets_id_fk'
    );
    expect(migration).not.toContain(
      'import_prepared_outcomes_batch_row_id_import_batch_rows_id_fk'
    );
    expect(migration).not.toContain(
      'CREATE INDEX "import_prepared_sets_batch_idx"'
    );
    expect(migration).not.toContain(
      'CREATE INDEX "import_prepared_outcomes_prepared_set_idx"'
    );
    expect(importDraftsMigration).toContain(
      'import_batches_account_id_org_id_accounts_id_org_id_fk'
    );
    expect(importDraftsMigration).toContain(
      'transactions_import_batch_id_org_id_import_batches_id_org_id_fk'
    );
    expect(importDraftsMigration).toContain(
      'ON DELETE SET NULL ("import_batch_id")'
    );
    expect(importDraftsMigration).not.toContain(
      'import_batch_rows_batch_id_import_batches_id_fk'
    );
    expect(importDraftsMigration).not.toContain(
      'import_batches_account_id_accounts_id_fk'
    );
    expect(importDraftsMigration).not.toContain(
      'transactions_import_batch_id_import_batches_id_fk'
    );
    expect(importDraftsMigration).not.toContain(
      'CREATE INDEX "import_batch_rows_batch_idx"'
    );
  });

  it('persists same-import refund link targets on draft rows', () => {
    expect(importBatchesSchema).toContain('review_refund_of_batch_row_id');
    expect(classificationMigration).toContain('review_refund_of_batch_row_id');
    expect(classificationMigration).toContain(
      'import_batch_rows_review_refund_of_batch_row_id_import_batch_rows_id_fk'
    );
  });
});
