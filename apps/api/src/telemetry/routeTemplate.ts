import { matchedRoutes, routePath } from 'hono/route';
import type { Context } from 'hono';

const UUID_SEGMENT =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const CLERK_STYLE_ID = /^[a-z]+_[A-Za-z0-9]+$/;
const NUMERIC_ID = /^\d+$/;

const isMiddlewarePath = (path: string): boolean =>
  path === '*' || path === '/*' || path.endsWith('/*');

/**
 * Best-effort normalized route template for telemetry.
 * Prefers Hono's registered route patterns; falls back to scrubbing raw path IDs.
 */
export const resolveNormalizedRoute = (c: Context): string => {
  try {
    // After handlers run, prefer the last non-middleware matched pattern.
    const routes = matchedRoutes(c);
    for (let i = routes.length - 1; i >= 0; i -= 1) {
      const route = routes[i];
      if (isMiddlewarePath(route.path)) continue;
      const path = route.path.startsWith('/') ? route.path : `/${route.path}`;
      // Nested mounts often expose only `/:id`; compose with earlier mount bases.
      if (path.includes(':') || path.startsWith('/api') || path === '/health') {
        const mount = routes
          .slice(0, i)
          .map((entry) => entry.path)
          .filter((candidate) => !isMiddlewarePath(candidate))
          .at(-1);
        if (mount && mount !== path && !path.startsWith(mount)) {
          const base = mount.endsWith('/') ? mount.slice(0, -1) : mount;
          const leaf = path.startsWith('/') ? path : `/${path}`;
          return `${base}${leaf}`;
        }
        return path;
      }
    }

    const current = routePath(c, -1);
    if (current && !isMiddlewarePath(current)) {
      return current.startsWith('/') ? current : `/${current}`;
    }
  } catch {
    // Fall through to scrubbed path.
  }

  return scrubPathToTemplate(c.req.path);
};

/** Replace opaque ID segments so fallback routes never export entity IDs. */
export const scrubPathToTemplate = (path: string): string => {
  const segments = path.split('/').map((segment) => {
    if (!segment) return segment;
    if (
      UUID_SEGMENT.test(segment) ||
      NUMERIC_ID.test(segment) ||
      CLERK_STYLE_ID.test(segment)
    ) {
      return ':id';
    }
    return segment;
  });
  const joined = segments.join('/');
  return joined.startsWith('/') ? joined : `/${joined}`;
};
