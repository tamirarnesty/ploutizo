import { describe, expect, it } from 'vitest';
import {
  sidebarPrimaryNav,
  sidebarSettingsNav,
  staticCommandGroups,
} from './app-nav';

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

  it('derives command-palette destinations from the sidebar definition', () => {
    expect(staticCommandGroups.map((group) => group.heading)).toEqual([
      'Navigation',
      'Settings',
    ]);
    expect(
      staticCommandGroups.flatMap((group) => group.commands)
    ).toMatchObject([
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
});
