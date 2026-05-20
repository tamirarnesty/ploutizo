import { createClerkClient } from '@clerk/backend';
import type { ClerkClient } from '@clerk/backend';

let cached: ClerkClient | null = null;

let didLogMissingSecret = false;

/**
 * Singleton Clerk Backend client for server-side REST calls (same secret as
 * `Authorization: Bearer` Clerk fetches elsewhere). Returns `null` when the
 * secret is unset so callers can fail open (e.g. tenant guard sync).
 */
export const getClerkServerClient = (): ClerkClient | null => {
  const secret = process.env.CLERK_SECRET_KEY;
  if (!secret) {
    if (!didLogMissingSecret) {
      didLogMissingSecret = true;
      console.warn(
        '[clerkServerClient] CLERK_SECRET_KEY is unset; Clerk Backend API unavailable'
      );
    }
    return null;
  }
  cached ??= createClerkClient({ secretKey: secret });
  return cached;
};
