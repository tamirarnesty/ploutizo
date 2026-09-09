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
  it('exposes Import as a peer of Transactions with Import History nested', () => {
    expect(sidebarPrimaryNav.map((item) => item.label)).toEqual([
      'Dashboard',
      'Transactions',
      'Import',
      'Accounts',
    ]);
    expect(
      sidebarPrimaryNav.find((item) => item.label === 'Transactions')?.children
    ).toBeUndefined();
    expect(
      sidebarPrimaryNav.find((item) => item.label === 'Import')
    ).toMatchObject({
      to: '/import',
      children: [{ label: 'Import History', to: '/import/history' }],
    });
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
      { to: '/import', label: 'Import' },
      { to: '/import/history' },
      { to: '/accounts' },
      { to: '/settings' },
      { to: '/settings/categories' },
      { to: '/settings/merchant-rules' },
      { to: '/settings/household' },
    ]);
  });

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
