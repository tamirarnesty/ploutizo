import { createContext, useContext } from 'react';
import type { QueryClient } from '@tanstack/react-query';
import type { AccessState } from './access-state';

export type AccessSnapshot = {
  access: AccessState;
  identityLoaded: boolean;
  isReady: boolean;
  queryClient: QueryClient;
};

export type AccessContextValue = AccessSnapshot & {
  bearerError: boolean;
  retryBearer: () => void;
};

// Kept apart from AccessProvider.tsx so a hot reload of the provider never
// mints a second context. Fast Refresh needs component files to export only
// components.
export const AccessContext = createContext<AccessContextValue | null>(null);

export const useAccess = (): AccessContextValue => {
  const context = useContext(AccessContext);
  if (!context) {
    throw new Error('useAccess must be used within AccessProvider');
  }
  return context;
};
