import { describe, expect, it } from 'vitest';
import type { ImportDraftSummary } from '@ploutizo/types';
import { getCommandGroups } from './getCommandGroups';

const draft: ImportDraftSummary = {
  id: 'draft_123',
  account: {
    id: 'account_123',
    name: 'Visa',
    institutionId: null,
    lastFour: '1234',
  },
  contentProfileId: null,
  status: 'draft',
  fileName: 'august.csv',
  rowCount: 12,
  validRowCount: 12,
  invalidRowCount: 0,
  importedAt: '2026-09-09T00:00:00.000Z',
  completedAt: null,
  discardedAt: null,
  createdAt: '2026-09-09T00:00:00.000Z',
  updatedAt: '2026-09-09T00:00:00.000Z',
};

describe('getCommandGroups', () => {
  it('places Continue Import first when drafts exist and omits it otherwise', () => {
    expect(getCommandGroups().map((group) => group.heading)).toEqual([
      'Navigation',
      'Settings',
    ]);

    const groups = getCommandGroups([draft]);

    expect(groups.map((group) => group.heading)).toEqual([
      'Continue Import',
      'Navigation',
      'Settings',
    ]);
    expect(groups[0]?.commands).toMatchObject([
      {
        type: 'import-draft',
        draftId: draft.id,
        label: 'Visa · ••1234 — august.csv',
      },
    ]);
  });
});
