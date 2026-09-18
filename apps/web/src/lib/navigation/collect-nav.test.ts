import { describe, expect, it } from 'vitest';
import { getRouter } from '@/router';
import { collectNav, collectSectionNav } from './collect-nav';
import { resolveNavIcon } from './nav-icons';

describe('collectNav', () => {
  const router = getRouter();

  it('builds primary sidebar tree with Import nested under Import History', () => {
    const { primary } = collectNav(router);

    expect(primary.map((item) => item.label)).toEqual([
      'Dashboard',
      'Transactions',
      'Import',
      'Accounts',
    ]);
    expect(primary.find((item) => item.label === 'Import')).toMatchObject({
      to: '/import',
      children: [{ label: 'Import History', to: '/import/history' }],
    });
    expect(
      primary.find((item) => item.label === 'Transactions')
    ).not.toHaveProperty('children');
  });

  it('keeps Settings as a flat footer link without sidebar children', () => {
    const { footer } = collectNav(router);

    expect(footer).toEqual([
      expect.objectContaining({
        label: 'Settings',
        to: '/settings',
      }),
    ]);
    expect(footer[0]).not.toHaveProperty('children');
  });

  it('groups searchable routes for the command palette', () => {
    const { commandGroups } = collectNav(router);

    expect(commandGroups.map((group) => group.heading)).toEqual([
      'Navigation',
      'Settings',
    ]);
    expect(commandGroups.flatMap((group) => group.commands)).toMatchObject([
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

  it('resolves icons for every collected route', () => {
    const { primary, footer, commandGroups } = collectNav(router);
    const routes = [
      ...primary,
      ...footer,
      ...commandGroups.flatMap((group) => group.commands),
    ];

    for (const route of routes) {
      const to = 'to' in route ? route.to : undefined;
      if (!to) continue;
      expect(resolveNavIcon(to)).toBeDefined();
    }
  });
});

describe('collectSectionNav', () => {
  const router = getRouter();

  it('returns settings child routes for section tabs', () => {
    expect(collectSectionNav(router, '/_layout/settings')).toMatchObject([
      { label: 'Categories & Tags', to: '/settings/categories' },
      { label: 'Merchant Rules', to: '/settings/merchant-rules' },
      { label: 'Household', to: '/settings/household' },
    ]);
  });
});
