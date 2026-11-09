import { Fragment } from 'react';
import { Link, useMatches } from '@tanstack/react-router';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@ploutizo/ui/components/breadcrumb';
import { isAppNavRoutePath } from '@/lib/navigation/types';
import type { AppNavRoute } from '@/lib/navigation/types';

type Crumb =
  | { key: string; label: string; current: true }
  | { key: string; label: string; current: false; to: AppNavRoute };

/**
 * Breadcrumb trail for the current page, derived from matched routes'
 * `staticData.nav`. Ancestors render as links; a labeled leaf renders as the
 * current page. Renders only on nested routes — a page with no labeled
 * ancestor gets no breadcrumb. Settings-group routes are skipped: settings
 * pages already show the "Settings" heading and tabs.
 */
export const PageBreadcrumbs = () => {
  const matches = useMatches();
  const leafPathname = matches.at(-1)?.pathname;
  const leafIndex = matches.length - 1;

  const crumbs: Crumb[] = matches.flatMap((match, index): Crumb[] => {
    const nav = match.staticData.nav;
    if (!nav || nav.group === 'settings') return [];
    if (index === leafIndex) {
      return [{ key: match.routeId, label: nav.label, current: true }];
    }
    if (match.pathname === leafPathname) return [];
    if (!isAppNavRoutePath(match.pathname)) return [];
    return [
      {
        key: match.routeId,
        label: nav.label,
        current: false,
        to: match.pathname,
      },
    ];
  });

  if (!crumbs.some((crumb) => !crumb.current)) return null;

  return (
    <Breadcrumb>
      <BreadcrumbList>
        {crumbs.map((crumb, index) => (
          <Fragment key={crumb.key}>
            {index > 0 ? <BreadcrumbSeparator /> : null}
            <BreadcrumbItem>
              {crumb.current ? (
                <BreadcrumbPage>{crumb.label}</BreadcrumbPage>
              ) : (
                <BreadcrumbLink render={<Link to={crumb.to} />}>
                  {crumb.label}
                </BreadcrumbLink>
              )}
            </BreadcrumbItem>
          </Fragment>
        ))}
      </BreadcrumbList>
    </Breadcrumb>
  );
};
