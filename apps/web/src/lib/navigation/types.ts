import type { LucideIcon } from 'lucide-react';

import type { FileRouteTypes } from '../../routeTree.gen';

/** Top-level and command-palette navigable routes (typed against the generated route tree). */
export type AppNavRoute = Extract<
  FileRouteTypes['to'],
  | '/dashboard'
  | '/transactions'
  | '/transactions/import'
  | '/transactions/import/history'
  | '/accounts'
  | '/settings'
  | '/settings/categories'
  | '/settings/merchant-rules'
  | '/settings/household'
>;

export type SidebarNavChild = {
  label: string;
  to: AppNavRoute;
  icon: LucideIcon;
};

export type SidebarNavItem = {
  label: string;
  to: AppNavRoute;
  icon: LucideIcon;
  children?: readonly SidebarNavChild[];
};
