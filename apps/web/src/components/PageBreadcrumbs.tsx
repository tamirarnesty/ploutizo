import { Fragment } from 'react';
import { Link, useMatches } from '@tanstack/react-router';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbSeparator,
} from '@ploutizo/ui/components/breadcrumb';
import { isAppNavRoutePath } from '@/lib/navigation/types';
import type { AppNavRoute } from '@/lib/navigation/types';

type Crumb = { key: string; label: string; to: AppNavRoute };

/**
 * Ancestor trail for the current page, derived from matched routes'
 * `staticData.nav`. The page header's title already names the leaf, so only
 * ancestors render here. Settings-group routes are skipped: settings pages
 * already show the "Settings" heading and tabs.
 */
export const PageBreadcrumbs = () => {
  const matches = useMatches();
  const leafPathname = matches.at(-1)?.pathname;
  const leafIndex = matches.length - 1;
  // Index routes report '/import/' while their layout parent reports '/import'.
  const stripTrailingSlash = (path?: string) =>
    path && path !== '/' ? path.replace(/\/+$/, '') : path;
  const leafPath = stripTrailingSlash(leafPathname);

  const crumbs: Crumb[] = matches.flatMap((match, index): Crumb[] => {
    const nav = match.staticData.nav;
    if (!nav || nav.group === 'settings' || index === leafIndex) return [];
    if (stripTrailingSlash(match.pathname) === leafPath) return [];
    if (!isAppNavRoutePath(match.pathname)) return [];
    return [
      {
        key: match.routeId,
        label: nav.label,
        to: match.pathname,
      },
    ];
  });

  if (crumbs.length === 0) return null;

  return (
    <Breadcrumb>
      {/* Trail renders at the page-title scale; clickability is the only
          difference from the current page, which the header title names. */}
      <BreadcrumbList className="font-heading text-xl leading-snug font-semibold text-foreground">
        {crumbs.map((crumb, index) => (
          <Fragment key={crumb.key}>
            {index > 0 ? (
              <BreadcrumbSeparator className="[&>svg]:size-5" />
            ) : null}
            <BreadcrumbItem>
              <BreadcrumbLink
                render={<Link to={crumb.to} />}
                className="hover:underline hover:underline-offset-4"
              >
                {crumb.label}
              </BreadcrumbLink>
            </BreadcrumbItem>
          </Fragment>
        ))}
        {/* Trailing separator: the trail continues into the page title. */}
        <BreadcrumbSeparator className="[&>svg]:size-5" />
      </BreadcrumbList>
    </Breadcrumb>
  );
};
