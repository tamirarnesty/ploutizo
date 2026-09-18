import type { CommandGroupDefinition, NavCommand } from '@/lib/command/types';
import { resolveNavIcon } from '@/lib/navigation/nav-icons';
import type {
  NavGroup,
  NavPlacement,
  RouteNavStaticData,
} from '@/lib/navigation/nav-static-data';
import { normalizePathname } from '@/lib/navigation/normalizePathname';
import type { AppNavRoute, SidebarNavItem } from '@/lib/navigation/types';
import { isAppNavRoutePath } from '@/lib/navigation/types';
import type { LucideIcon } from 'lucide-react';
import type { AnyRoute } from '@tanstack/react-router';

type ResolvedNavRoute = {
  routeId: string;
  parentRouteId: string | undefined;
  to: AppNavRoute;
  nav: RouteNavStaticData;
  icon: LucideIcon;
  sidebar: boolean;
  searchable: boolean;
  group: NavGroup;
  placement: NavPlacement;
  order: number | undefined;
  treeOrder: number;
};

export type CollectedNav = {
  primary: SidebarNavItem[];
  footer: SidebarNavItem[];
  commandGroups: CommandGroupDefinition[];
};

export type SectionNavItem = {
  label: string;
  to: AppNavRoute;
  icon: LucideIcon;
  keywords?: readonly string[];
};

const NAV_GROUP_HEADINGS: Record<NavGroup, string> = {
  navigation: 'Navigation',
  settings: 'Settings',
};

const toAppNavRoute = (fullPath: string): AppNavRoute | null => {
  const normalized = normalizePathname(fullPath);
  const withoutTrailingSlash =
    normalized.endsWith('/') && normalized !== '/'
      ? normalized.slice(0, -1)
      : normalized;

  return isAppNavRoutePath(withoutTrailingSlash) ? withoutTrailingSlash : null;
};

const resolveNavRoute = (
  route: AnyRoute,
  treeOrder: number
): ResolvedNavRoute | null => {
  const nav = route.options.staticData?.nav;
  if (!nav) return null;

  const to = toAppNavRoute(route.fullPath);
  if (!to) {
    throw new Error(
      `Route "${route.id}" (${route.fullPath}) declares staticData.nav but is not an app-nav route. Add it to APP_NAV_ROUTES in types.ts.`
    );
  }

  return {
    routeId: route.id,
    parentRouteId: route.parentRoute?.id,
    to,
    nav,
    icon: resolveNavIcon(to),
    sidebar: nav.sidebar ?? true,
    searchable: nav.searchable ?? true,
    group: nav.group ?? 'navigation',
    placement: nav.placement ?? 'primary',
    order: nav.order,
    treeOrder,
  };
};

const compareNavRoutes = (
  left: ResolvedNavRoute,
  right: ResolvedNavRoute
): number => {
  const leftOrder = left.order ?? Number.POSITIVE_INFINITY;
  const rightOrder = right.order ?? Number.POSITIVE_INFINITY;
  if (leftOrder !== rightOrder) return leftOrder - rightOrder;
  if (left.treeOrder !== right.treeOrder)
    return left.treeOrder - right.treeOrder;
  return left.to.localeCompare(right.to);
};

const toSidebarNavItem = (route: ResolvedNavRoute): SidebarNavItem => ({
  label: route.nav.label,
  to: route.to,
  icon: route.icon,
  keywords: route.nav.keywords,
});

const toNavCommand = (route: ResolvedNavRoute): NavCommand => ({
  type: 'nav',
  id: `nav-${route.to.slice(1).replaceAll('/', '-')}`,
  label: route.nav.label,
  to: route.to,
  icon: route.icon,
  keywords: route.nav.keywords,
});

const buildSidebarTree = (routes: ResolvedNavRoute[]): SidebarNavItem[] => {
  const sidebarRoutes = routes.filter((route) => route.sidebar);
  const routesById = new Map(
    sidebarRoutes.map((route) => [route.routeId, route])
  );
  const childrenByParentId = new Map<string, ResolvedNavRoute[]>();

  for (const route of sidebarRoutes) {
    const parentRouteId = route.parentRouteId;
    const parentRoute =
      parentRouteId === undefined ? undefined : routesById.get(parentRouteId);

    if (!parentRouteId || !parentRoute) continue;

    const siblings = childrenByParentId.get(parentRouteId) ?? [];
    siblings.push(route);
    childrenByParentId.set(parentRouteId, siblings);
  }

  const roots = sidebarRoutes.filter((route) => {
    const parentRouteId = route.parentRouteId;
    if (!parentRouteId) return true;
    const parentRoute = routesById.get(parentRouteId);
    return !parentRoute;
  });

  const toSidebarItem = (route: ResolvedNavRoute): SidebarNavItem => {
    const children = (childrenByParentId.get(route.routeId) ?? [])
      .sort(compareNavRoutes)
      .map((child) => toSidebarItem(child));

    return {
      ...toSidebarNavItem(route),
      ...(children.length > 0 ? { children } : {}),
    };
  };

  return roots.sort(compareNavRoutes).map(toSidebarItem);
};

const flattenSidebarCommands = (
  items: SidebarNavItem[],
  routesByTo: Map<AppNavRoute, ResolvedNavRoute>
): NavCommand[] =>
  items.flatMap((item) => {
    const route = routesByTo.get(item.to);
    const parentCommand = route?.searchable ? [toNavCommand(route)] : [];

    const childCommands = (item.children ?? []).flatMap((child) => {
      const childRoute = routesByTo.get(child.to);
      return childRoute?.searchable ? [toNavCommand(childRoute)] : [];
    });

    return [...parentCommand, ...childCommands];
  });

const buildCommandGroups = (
  routes: ResolvedNavRoute[],
  primary: SidebarNavItem[]
): CommandGroupDefinition[] => {
  const routesByTo = new Map(routes.map((route) => [route.to, route]));
  const groups: CommandGroupDefinition[] = [];

  const navigationCommands = flattenSidebarCommands(primary, routesByTo);
  if (navigationCommands.length > 0) {
    groups.push({
      heading: NAV_GROUP_HEADINGS.navigation,
      commands: navigationCommands,
    });
  }

  const settingsCommands = routes
    .filter((route) => route.group === 'settings' && route.searchable)
    .sort(compareNavRoutes)
    .map(toNavCommand);

  if (settingsCommands.length > 0) {
    groups.push({
      heading: NAV_GROUP_HEADINGS.settings,
      commands: settingsCommands,
    });
  }

  return groups;
};

type CollectNavRouter = {
  routesById: unknown;
};

const listResolvedNavRoutes = (
  router: CollectNavRouter
): ResolvedNavRoute[] => {
  const routes = Object.values(router.routesById as Record<string, AnyRoute>);
  const sortedRoutes = [...routes].sort((left, right) =>
    left.fullPath.localeCompare(right.fullPath)
  );

  return sortedRoutes
    .map((route, treeOrder) => resolveNavRoute(route, treeOrder))
    .filter((route): route is ResolvedNavRoute => route !== null);
};

export const collectNav = (router: CollectNavRouter): CollectedNav => {
  const routes = listResolvedNavRoutes(router);
  const primaryRoutes = routes.filter((route) => route.placement === 'primary');
  const footerRoutes = routes.filter((route) => route.placement === 'footer');

  const primary = buildSidebarTree(primaryRoutes);
  const footer = buildSidebarTree(footerRoutes);

  return {
    primary,
    footer,
    commandGroups: buildCommandGroups(routes, primary),
  };
};

export const collectSectionNav = (
  router: CollectNavRouter,
  parentRouteId: string
): SectionNavItem[] =>
  listResolvedNavRoutes(router)
    .filter((route) => route.parentRouteId === parentRouteId)
    .sort(compareNavRoutes)
    .map((route) => ({
      label: route.nav.label,
      to: route.to,
      icon: route.icon,
      keywords: route.nav.keywords,
    }));
