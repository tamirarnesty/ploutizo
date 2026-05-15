import { createClerkClient } from '@clerk/backend';

let cached: ReturnType<typeof createClerkClient> | null = null;

/**
 * Singleton Clerk Backend client for server-side REST calls (same secret as
 * `Authorization: Bearer` Clerk fetches elsewhere). Returns `null` when the
 * secret is unset so callers can fail open (e.g. tenant guard sync).
 */
export const getClerkServerClient = (): ReturnType<
  typeof createClerkClient
> | null => {
  const secret = process.env.CLERK_SECRET_KEY;
  if (!secret) return null;
  cached ??= createClerkClient({ secretKey: secret });
  return cached;
};
