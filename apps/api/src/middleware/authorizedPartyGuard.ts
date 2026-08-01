import { createMiddleware } from 'hono/factory';
import { getAuth } from '@clerk/hono';
import { respondWithApiError } from '../lib/apiErrorResponse';
import { isAllowedParty } from '../lib/allowedOrigins';
import type { AppEnv } from '../types';

// Validates JWT azp against the same origin allowlist used for CORS.
// Clerk middleware accepts only a static authorizedParties string[], so dynamic
// Railway PR preview origins are enforced here instead.
export const authorizedPartyGuard = () =>
  createMiddleware<AppEnv>(async (c, next) => {
    const auth = getAuth(c);
    if (!auth.userId) {
      await next();
      return;
    }

    const azp = auth.sessionClaims.azp;
    if (typeof azp === 'string' && !isAllowedParty(azp)) {
      return respondWithApiError(c, {
        code: 'UNAUTHORIZED',
        message: 'Invalid authorized party.',
        status: 401,
      });
    }

    await next();
  });
