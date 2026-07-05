import type { LucideIcon } from 'lucide-react';

import type { FileRouteTypes } from '../../routeTree.gen';

/** Top-level and command-palette navigable routes (typed against the generated route tree). */
export type AppNavRoute =
  | Extract<
      FileRouteTypes['to'],
      '/dashboard' | '/transactions' | '/accounts' | '/settings'
    >
  | '/transactions/import';

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

export type SidebarSettingsNavItem = {
  label: string;
  to: '/settings';
  icon: LucideIcon;
};
