import { describe, expect, it } from 'vitest';
import { sidebarPrimaryNav, sidebarSettingsNav } from './app-nav';

describe('app navigation', () => {
  it('exposes Import as a peer of Transactions with Import History nested', () => {
    expect(sidebarPrimaryNav.map((item) => item.label)).toEqual([
      'Dashboard',
      'Transactions',
      'Import',
      'Accounts',
    ]);
    expect(
      sidebarPrimaryNav.find((item) => item.label === 'Transactions')
    ).not.toHaveProperty('children');
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
});
