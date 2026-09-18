import type { LucideIcon } from 'lucide-react';

import type { FileRouteTypes } from '../../routeTree.gen';

type NavigableRoutePath = Extract<
  FileRouteTypes['to'],
  | '/dashboard'
  | '/transactions'
  | '/import'
  | '/import/history'
  | '/accounts'
  | '/settings'
  | '/settings/categories'
  | '/settings/merchant-rules'
  | '/settings/household'
>;

/** Canonical list of app-navigable route paths (sidebar, command palette, section tabs). */
export const APP_NAV_ROUTES = [
  '/dashboard',
  '/transactions',
  '/import',
  '/import/history',
  '/accounts',
  '/settings',
  '/settings/categories',
  '/settings/merchant-rules',
  '/settings/household',
] as const satisfies readonly NavigableRoutePath[];

/** Top-level and command-palette navigable routes (typed against the generated route tree). */
export type AppNavRoute = (typeof APP_NAV_ROUTES)[number];

const appNavRouteSet = new Set<string>(APP_NAV_ROUTES);

export const isAppNavRoutePath = (pathname: string): pathname is AppNavRoute =>
  appNavRouteSet.has(pathname);

export type SidebarNavChild = {
  label: string;
  to: AppNavRoute;
  icon: LucideIcon;
  keywords?: readonly string[];
};

export type SidebarNavItem = {
  label: string;
  to: AppNavRoute;
  icon: LucideIcon;
  keywords?: readonly string[];
  children?: readonly SidebarNavChild[];
};
