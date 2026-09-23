import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const drizzleDir = join(
  dirname(fileURLToPath(import.meta.url)),
  '../../drizzle'
);
const sqlFile = (name: string) => readFileSync(join(drizzleDir, name), 'utf8');

describe('SQL-only schema contracts', () => {
  it('keeps composite org FKs that Drizzle cannot declare without a schema cycle', () => {
    const baseline = sqlFile('0000_free_corsair.sql');
    const matchDecision = sqlFile('0004_harsh_tusk.sql');
    const preparedRevision = sqlFile('0005_dizzy_kang.sql');

    expect(baseline).toContain(
      'import_batch_rows_review_refund_of_org_id_transactions_id_org_id_fk'
    );
    expect(baseline).toContain('ON DELETE SET NULL ("review_refund_of")');
    expect(matchDecision).toContain(
      'import_batch_rows_review_matched_transaction_id_org_id_transactions_id_org_id_fk'
    );
    expect(matchDecision).toContain(
      'ON DELETE SET NULL ("review_matched_transaction_id")'
    );
    expect(preparedRevision).toContain(
      'import_batch_rows_review_refund_of_batch_row_id_org_id_fk'
    );
    expect(preparedRevision).toContain(
      'ON DELETE SET NULL ("review_refund_of_batch_row_id")'
    );
  });

  it('keeps the closed-history expression index Drizzle cannot declare', () => {
    const completedResult = sqlFile('0006_overjoyed_outlaw_kid.sql');
    expect(completedResult).toContain('import_batches_org_history_closed_idx');
    expect(completedResult).toContain(
      'COALESCE("completed_at", "discarded_at")'
    );
  });
});

describe('import review session schema migration', () => {
  const reviewSessionMigration = sqlFile(
    '0010_import_review_session_schema.sql'
  );

  it('drops prepared staging tables and durable selection columns', () => {
    expect(reviewSessionMigration).toContain(
      'DROP TABLE IF EXISTS "import_prepared_outcomes"'
    );
    expect(reviewSessionMigration).toContain(
      'DROP TABLE IF EXISTS "import_prepared_sets"'
    );
    expect(reviewSessionMigration).toContain(
      'DROP TYPE IF EXISTS "import_prepared_outcome"'
    );
    expect(reviewSessionMigration).toContain(
      'DROP COLUMN IF EXISTS "selected_for_import"'
    );
    expect(reviewSessionMigration).toContain(
      'DROP COLUMN IF EXISTS "revision"'
    );
    expect(reviewSessionMigration).toContain(
      'DROP COLUMN IF EXISTS "finalized_prepared_set_id"'
    );
  });
});

describe('prepared row snapshot cutover migration', () => {
  const snapshotCutoverMigration = sqlFile('0009_prepared_row_snapshot.sql');

  it('deletes existing prepared staging before the guarded rename', () => {
    const truncateAt = snapshotCutoverMigration.indexOf(
      'TRUNCATE TABLE "import_prepared_outcomes", "import_prepared_sets"'
    );
    const renameAt = snapshotCutoverMigration.indexOf(
      'RENAME COLUMN "reviewed_values" TO "row_snapshot"'
    );
    expect(truncateAt).toBeGreaterThan(-1);
    expect(renameAt).toBeGreaterThan(truncateAt);
  });

  it('renames reviewed_values only when that column still exists', () => {
    const guardAt = snapshotCutoverMigration.indexOf(
      "column_name = 'reviewed_values'"
    );
    const renameAt = snapshotCutoverMigration.indexOf(
      'RENAME COLUMN "reviewed_values" TO "row_snapshot"'
    );
    expect(guardAt).toBeGreaterThan(-1);
    expect(renameAt).toBeGreaterThan(guardAt);
    expect(snapshotCutoverMigration).toMatch(
      /IF EXISTS[\s\S]*RENAME COLUMN "reviewed_values" TO "row_snapshot"/
    );
  });

  it('no-ops when row_snapshot already exists and reviewed_values is gone', () => {
    expect(snapshotCutoverMigration).not.toContain('RAISE EXCEPTION');
    expect(snapshotCutoverMigration).not.toContain(
      'DROP COLUMN "reviewed_values"'
    );
    expect(snapshotCutoverMigration).not.toContain(
      "column_name = 'row_snapshot'"
    );
  });

  it('does not transform or retain the flat reviewed_values shape', () => {
    expect(snapshotCutoverMigration).not.toContain(
      'UPDATE "import_prepared_outcomes"'
    );
    expect(snapshotCutoverMigration).not.toContain('reviewed_values ->');
  });
});
