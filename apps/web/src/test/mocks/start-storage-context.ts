type ClerkInitGlobal = typeof globalThis & {
  __clerk_init_state?: {
    __internal_clerk_state?: {
      __clerk_ssr_state?: unknown;
      __publishableKey?: string;
    };
  };
};

export const getStartContext = () => ({
  contextAfterGlobalMiddlewares: {
    clerkInitialState: (globalThis as ClerkInitGlobal).__clerk_init_state ?? {},
  },
});

export const runWithStartContext = <T>(_context: unknown, fn: () => T) => fn();
