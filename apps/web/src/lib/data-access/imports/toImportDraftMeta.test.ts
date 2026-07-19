import { describe, expect, it } from 'vitest';
import { makeImportDraft } from '@/components/imports/test-fixtures/importDraft';
import { toImportDraftMeta } from './toImportDraftMeta';

describe('toImportDraftMeta', () => {
  it('splits draft meta from rows for the slim review header query', () => {
    const draft = makeImportDraft({
      accountName: 'Visa',
      fileName: 'statement.csv',
    });

    const meta = toImportDraftMeta(draft);

    expect(meta).toMatchObject({
      id: draft.id,
      accountName: 'Visa',
      fileName: 'statement.csv',
      rowCount: draft.rowCount,
      invalidRowCount: draft.invalidRowCount,
    });
    expect(meta).not.toHaveProperty('rows');
  });
});
