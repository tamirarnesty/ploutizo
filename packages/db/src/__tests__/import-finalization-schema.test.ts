import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const root = join(dirname(fileURLToPath(import.meta.url)), '../..');
const journal = JSON.parse(
  readFileSync(join(root, 'drizzle/meta/_journal.json'), 'utf8')
) as { entries: { tag: string }[] };
const baselineMigration = readFileSync(
  join(root, `drizzle/${journal.entries.at(-1)?.tag}.sql`),
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
});
