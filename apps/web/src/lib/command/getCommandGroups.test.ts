import { describe, expect, it } from 'vitest';
import { makeImportDraftSummary } from '@/components/imports/test-fixtures/importDraft';
import { getCommandGroups } from './getCommandGroups';

const draft = makeImportDraftSummary();

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
