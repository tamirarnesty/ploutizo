import type { AppNavRoute } from '@/lib/navigation/types';

export const isAppNavRouteActive = (pathname: string, to: AppNavRoute) =>
  pathname === to || pathname.startsWith(`${to}/`);
