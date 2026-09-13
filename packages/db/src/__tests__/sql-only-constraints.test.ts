import { readFileSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const drizzleDir = join(
  dirname(fileURLToPath(import.meta.url)),
  '../../drizzle'
);
const allSql = readdirSync(drizzleDir)
  .filter((name) => name.endsWith('.sql'))
  .map((name) => readFileSync(join(drizzleDir, name), 'utf8'))
  .join('\n');

describe('SQL-only schema contracts', () => {
  it('keeps composite org FKs that Drizzle cannot declare without a schema cycle', () => {
    expect(allSql).toContain(
      'import_batch_rows_review_refund_of_org_id_transactions_id_org_id_fk'
    );
    expect(allSql).toContain('ON DELETE SET NULL ("review_refund_of")');
    expect(allSql).toContain(
      'import_batch_rows_review_matched_transaction_id_org_id_transactions_id_org_id_fk'
    );
    expect(allSql).toContain(
      'ON DELETE SET NULL ("review_matched_transaction_id")'
    );
    expect(allSql).toContain(
      'import_batch_rows_review_refund_of_batch_row_id_org_id_fk'
    );
    expect(allSql).toContain(
      'ON DELETE SET NULL ("review_refund_of_batch_row_id")'
    );
  });

  it('keeps the closed-history expression index Drizzle cannot declare', () => {
    expect(allSql).toContain('import_batches_org_history_closed_idx');
    expect(allSql).toContain('COALESCE("completed_at", "discarded_at")');
  });
});
