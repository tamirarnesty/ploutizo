/**
 * Paths that must never receive the offline shell when a navigation fails.
 * Keep aligned with Clerk, API, and Start server-fn surfaces (see spec).
 */
export const offlineDeniedPathPatterns = [
  /^\/api(?:\/|$)/,
  /^\/_serverFn(?:\/|$)/,
  /^\/sign-in(?:\/|$)/,
  /^\/sign-up(?:\/|$)/,
  /^\/__clerk(?:\/|$)/,
  /^\/\.clerk(?:\/|$)/,
] as const;
