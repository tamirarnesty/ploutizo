import type { MainContentLayout } from '@/lib/layout/main-content-layout';
import type { RouteNavStaticData } from '@/lib/navigation/nav-static-data';

declare module '@tanstack/react-router' {
  interface StaticDataRouteOption {
    mainContentLayout?: MainContentLayout;
    nav?: RouteNavStaticData;
  }
}
