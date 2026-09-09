import { describe, expect, it } from 'vitest';
import type { ImportDraftSummary } from '@ploutizo/types';
import {
  getCommandGroups,
  sidebarPrimaryNav,
  sidebarSettingsNav,
} from './app-nav';

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

describe('app navigation', () => {
  it('exposes stable child destinations in the sidebar', () => {
    expect(
      sidebarPrimaryNav.find((item) => item.label === 'Transactions')?.children
    ).toMatchObject([
      { label: 'Import', to: '/transactions/import' },
      { label: 'Import History', to: '/transactions/import/history' },
    ]);
    expect(sidebarSettingsNav.children).toMatchObject([
      { label: 'Categories & Tags', to: '/settings/categories' },
      { label: 'Merchant Rules', to: '/settings/merchant-rules' },
      { label: 'Household', to: '/settings/household' },
    ]);
  });

  it('groups stable destinations for command-palette navigation', () => {
    const groups = getCommandGroups();

    expect(groups.map((group) => group.heading)).toEqual([
      'Navigation',
      'Settings',
    ]);
    expect(groups.flatMap((group) => group.commands)).toMatchObject([
      { to: '/dashboard' },
      { to: '/transactions' },
      { to: '/transactions/import' },
      { to: '/transactions/import/history' },
      { to: '/accounts' },
      { to: '/settings' },
      { to: '/settings/categories' },
      { to: '/settings/merchant-rules' },
      { to: '/settings/household' },
    ]);
  });

  it('adds active drafts as resumable commands', () => {
    const groups = getCommandGroups([draft]);
    const continueImport = groups.find(
      (group) => group.heading === 'Continue Import'
    );

    expect(continueImport?.commands).toMatchObject([
      {
        type: 'import-draft',
        draftId: draft.id,
        label: 'Visa · ••1234 — august.csv',
      },
    ]);
  });
});
