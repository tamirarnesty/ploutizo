import { describe, expect, it } from 'vitest';
import { getRouter } from '@/router';
import { collectNav, collectSettingsSectionNav } from './collect-nav';
import { navIcons } from './nav-icons';
import { normalizePathname } from './normalizePathname';
import { APP_NAV_ROUTES, isAppNavRoutePath } from './types';

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
      { to: '/settings/categories' },
      { to: '/settings/merchant-rules' },
      { to: '/settings/household' },
    ]);
  });

  it('throws when staticData.nav is declared for a non-app-nav path', () => {
    const misconfiguredRouter = {
      routesById: {
        '/test': {
          id: '/test',
          fullPath: '/unknown-nav-route',
          options: { staticData: { nav: { label: 'Unknown' } } },
          parentRoute: undefined,
        },
      },
    };

    expect(() => collectNav(misconfiguredRouter)).toThrow(
      /not an app-nav route/
    );
  });

  it('resolves every route in the tree that declares staticData.nav', () => {
    const routes = Object.values(router.routesById);
    const navRoutes = routes.filter((route) => route.options.staticData?.nav);

    expect(() => collectNav(router)).not.toThrow();
    expect(navRoutes).toHaveLength(APP_NAV_ROUTES.length);

    for (const route of navRoutes) {
      const path = normalizePathname(route.fullPath);

      if (!isAppNavRoutePath(path)) {
        throw new Error(
          `Route ${route.id} (${route.fullPath}) must be listed in APP_NAV_ROUTES`
        );
      }

      expect(navIcons[path]).toBeDefined();
    }
  });
});

describe('collectSettingsSectionNav', () => {
  const router = getRouter();

  it('returns settings child routes for section tabs', () => {
    expect(collectSettingsSectionNav(router)).toMatchObject([
      { label: 'Categories & Tags', to: '/settings/categories' },
      { label: 'Merchant Rules', to: '/settings/merchant-rules' },
      { label: 'Household', to: '/settings/household' },
    ]);
  });

  it('collects section tabs from the settings route tree, not the settings command group', () => {
    const sectionRouter = {
      routesById: {
        '/_layout/settings/categories': {
          id: '/_layout/settings/categories',
          fullPath: '/settings/categories',
          options: {
            staticData: {
              nav: {
                label: 'Categories & Tags',
                group: 'navigation',
                sidebar: false,
                order: 1,
              },
            },
          },
          parentRoute: { id: '/_layout/settings' },
        },
        '/_layout/settings': {
          id: '/_layout/settings',
          fullPath: '/settings',
          options: {
            staticData: {
              nav: {
                label: 'Settings',
                group: 'settings',
                placement: 'footer',
              },
            },
          },
          parentRoute: { id: '/_layout' },
        },
        '/_layout/import/history': {
          id: '/_layout/import/history',
          fullPath: '/import/history',
          options: {
            staticData: {
              nav: {
                label: 'Import History',
                group: 'settings',
                sidebar: false,
                order: 2,
              },
            },
          },
          parentRoute: { id: '/_layout/import' },
        },
      },
    };

    expect(collectSettingsSectionNav(sectionRouter)).toEqual([
      expect.objectContaining({
        label: 'Categories & Tags',
        to: '/settings/categories',
      }),
    ]);
  });
});
