import type { CommandGroupDefinition, NavCommand } from '@/lib/command/types';
import { navIcons } from '@/lib/navigation/nav-icons';
import type {
  NavGroup,
  NavPlacement,
  RouteNavStaticData,
} from '@/lib/navigation/nav-static-data';
import { normalizePathname } from '@/lib/navigation/normalizePathname';
import type {
  AppNavRoute,
  SidebarNavChild,
  SidebarNavItem,
} from '@/lib/navigation/types';
import { isAppNavRoutePath } from '@/lib/navigation/types';
import type { LucideIcon } from 'lucide-react';

type NavRoute = {
  id: string;
  fullPath: string;
  options: { staticData?: { nav?: RouteNavStaticData } };
  parentRoute?: { id: string } | null | undefined;
};

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
};

export type CollectedNav = {
  primary: SidebarNavItem[];
  footer: SidebarNavItem[];
  commandGroups: CommandGroupDefinition[];
};

const NAV_GROUP_HEADINGS: Record<NavGroup, string> = {
  navigation: 'Navigation',
  settings: 'Settings',
};

const toAppNavRoute = (fullPath: string): AppNavRoute | null => {
  const path = normalizePathname(fullPath);
  return isAppNavRoutePath(path) ? path : null;
};

const resolveNavRoute = (route: NavRoute): ResolvedNavRoute | null => {
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
    icon: navIcons[to],
    sidebar: nav.sidebar ?? true,
    searchable: nav.searchable ?? true,
    group: nav.group ?? 'navigation',
    placement: nav.placement ?? 'primary',
    order: nav.order,
  };
};

const compareNavRoutes = (
  left: ResolvedNavRoute,
  right: ResolvedNavRoute
): number => {
  const leftOrder = left.order ?? Number.POSITIVE_INFINITY;
  const rightOrder = right.order ?? Number.POSITIVE_INFINITY;
  if (leftOrder !== rightOrder) return leftOrder - rightOrder;
  return left.to.localeCompare(right.to);
};

const toSidebarNavChild = (route: ResolvedNavRoute): SidebarNavChild => ({
  label: route.nav.label,
  to: route.to,
  icon: route.icon,
  keywords: route.nav.keywords,
});

const toNavCommand = (route: ResolvedNavRoute): NavCommand => ({
  type: 'nav',
  id: `nav-${route.to.slice(1).replaceAll('/', '-')}`,
  ...toSidebarNavChild(route),
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
      ...toSidebarNavChild(route),
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

export type CollectNavRouter = {
  routesById: unknown;
};

const listResolvedNavRoutes = (router: CollectNavRouter): ResolvedNavRoute[] =>
  Object.values(router.routesById as Record<string, NavRoute>)
    .map((route) => resolveNavRoute(route))
    .filter((route): route is ResolvedNavRoute => route !== null);

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

export const collectSettingsSectionNav = (
  router: CollectNavRouter
): SidebarNavChild[] =>
  listResolvedNavRoutes(router)
    .filter((route) => route.group === 'settings' && !route.sidebar)
    .sort(compareNavRoutes)
    .map(toSidebarNavChild);
