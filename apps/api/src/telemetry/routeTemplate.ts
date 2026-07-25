import { matchedRoutes } from 'hono/route';
import type { Context } from 'hono';

const UUID_SEGMENT =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const CLERK_STYLE_ID = /^[a-z]+_[A-Za-z0-9]+$/;
const NUMERIC_ID = /^\d+$/;

const isMiddlewarePath = (path: string): boolean =>
  path === '*' || path === '/*' || path.endsWith('/*');

const joinRouteParts = (base: string, path: string): string => {
  if (!base || base === '/') return path.startsWith('/') ? path : `/${path}`;
  if (!path || path === '/') return base;
  const normalizedBase = base.endsWith('/') ? base.slice(0, -1) : base;
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  return `${normalizedBase}${normalizedPath}`;
};

/**
 * Best-effort normalized route template for telemetry.
 * Prefers Hono matched route patterns; falls back to scrubbing raw path IDs.
 */
export const resolveNormalizedRoute = (c: Context): string => {
  try {
    const routes = matchedRoutes(c);
    for (let i = routes.length - 1; i >= 0; i -= 1) {
      const route = routes[i];
      if (isMiddlewarePath(route.path)) continue;

      // Nested routers often register `/:id` while the mount base is `/api/...`.
      // Reconstruct from successive non-middleware matched paths when possible.
      const parts: string[] = [];
      for (let j = 0; j <= i; j += 1) {
        const candidate = routes[j];
        if (isMiddlewarePath(candidate.path)) continue;
        if (parts.length === 0) {
          parts.push(candidate.path);
          continue;
        }
        const previous = parts[parts.length - 1] ?? '';
        if (
          candidate.path.startsWith(previous) &&
          candidate.path.length > previous.length
        ) {
          parts[parts.length - 1] = candidate.path;
        } else if (!previous.endsWith(candidate.path)) {
          parts.push(candidate.path);
        }
      }

      const composed = parts.reduce(
        (acc, part) => joinRouteParts(acc, part),
        ''
      );
      if (composed) return composed;
      return route.path.startsWith('/') ? route.path : `/${route.path}`;
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
