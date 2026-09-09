/** Strip a trailing slash except for the root path. */
export const normalizePathname = (pathname: string) =>
  pathname !== '/' && pathname.endsWith('/') ? pathname.slice(0, -1) : pathname;
