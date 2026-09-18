import { describe, expect, it } from 'vitest';
import { getRouter } from '@/router';
import { settingsLayoutRouteId } from '@/routes/_layout.settings/nav';
import { collectNav, collectSectionNav } from './collect-nav';
import { resolveNavIcon } from './nav-icons';
import { normalizePathname } from './normalizePathname';
import { APP_NAV_ROUTES, isAppNavRoutePath } from './types';
import type { AnyRoute } from '@tanstack/react-router';

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

  it('throws when staticData.nav is declared for a non-app-nav path', () => {
    const misconfiguredRouter = {
      routesById: {
        '/test': {
          id: '/test',
          fullPath: '/unknown-nav-route',
          options: { staticData: { nav: { label: 'Unknown' } } },
          parentRoute: undefined,
        } as AnyRoute,
      },
    };

    expect(() => collectNav(misconfiguredRouter)).toThrow(
      /not an app-nav route/
    );
  });

  it('resolves every route in the tree that declares staticData.nav', () => {
    const routes = Object.values(
      router.routesById as unknown as Record<string, AnyRoute>
    );
    const navRoutes = routes.filter((route) => route.options.staticData?.nav);

    expect(() => collectNav(router)).not.toThrow();
    expect(navRoutes).toHaveLength(APP_NAV_ROUTES.length);

    for (const route of navRoutes) {
      const normalized = normalizePathname(route.fullPath);
      const path =
        normalized.endsWith('/') && normalized !== '/'
          ? normalized.slice(0, -1)
          : normalized;

      if (!isAppNavRoutePath(path)) {
        throw new Error(
          `Route ${route.id} (${route.fullPath}) must be listed in APP_NAV_ROUTES`
        );
      }

      expect(resolveNavIcon(path)).toBeDefined();
    }
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
    expect(collectSectionNav(router, settingsLayoutRouteId)).toMatchObject([
      { label: 'Categories & Tags', to: '/settings/categories' },
      { label: 'Merchant Rules', to: '/settings/merchant-rules' },
      { label: 'Household', to: '/settings/household' },
    ]);
  });
});
