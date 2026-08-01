/// <reference types="vite/client" />

import {
  HeadContent,
  Scripts,
  createRootRouteWithContext,
} from '@tanstack/react-router';
import { ClerkProvider, useAuth } from '@clerk/tanstack-react-start';
import { shadcn } from '@clerk/ui/themes';
import { QueryClientProvider } from '@tanstack/react-query';
import { useEffect, useRef } from 'react';
import appCss from '@ploutizo/ui/globals.css?url';
import { ThemeProvider } from '@ploutizo/ui/components/theme-provider';
import { Toaster } from '@ploutizo/ui/components/sonner';
import { TooltipProvider } from '@ploutizo/ui/components/tooltip';
import { queryClient, setTokenGetter } from '../lib/queryClient';
import { MoneyLocaleProvider } from '../lib/money/money-locale';
import { BrowserTelemetryRoot } from '../telemetry';
import { AppDevtools } from '../components/devtools/AppDevtools';
import { NotFound } from '../components/not-found/NotFound';
import { ErrorBoundary } from '../components/error-boundary/ErrorBoundary';
import type { RouterContext } from '../router';

// TokenInitializer: wires Clerk's getToken into the React Query apiFetch helper.
// Must run inside ClerkProvider so useAuth() has access to the Clerk session.
// getToken stored in a ref so setTokenGetter is called once — in-flight queries
// always read the latest token via the ref without re-registering the getter.
const TokenInitializer = () => {
  const { getToken } = useAuth();
  const getTokenRef = useRef(getToken);
  getTokenRef.current = getToken;
  useEffect(() => {
    setTokenGetter(() => getTokenRef.current());
  }, []);
  return null;
};

const RootDocument = ({ children }: { children: React.ReactNode }) => (
  <html lang="en" suppressHydrationWarning>
    <head>
      <HeadContent />
    </head>
    <body>
      <ThemeProvider
        attribute="class"
        defaultTheme="system"
        enableSystem
        disableTransitionOnChange
        storageKey="theme"
      >
        <TooltipProvider delay={500}>
          <QueryClientProvider client={queryClient}>
            <ClerkProvider appearance={{ theme: shadcn }}>
              <MoneyLocaleProvider>
                <BrowserTelemetryRoot>
                  <TokenInitializer />
                  {children}
                  <Toaster />
                  <AppDevtools />
                </BrowserTelemetryRoot>
              </MoneyLocaleProvider>
            </ClerkProvider>
          </QueryClientProvider>
        </TooltipProvider>
      </ThemeProvider>
      <Scripts />
    </body>
  </html>
);

export const Route = createRootRouteWithContext<RouterContext>()({
  head: () => ({
    meta: [
      {
        charSet: 'utf-8',
      },
      {
        name: 'viewport',
        content: 'width=device-width, initial-scale=1',
      },
      {
        title: 'ploutizo',
      },
    ],
    links: [
      {
        rel: 'stylesheet',
        href: appCss,
      },
    ],
  }),
  shellComponent: RootDocument,
  notFoundComponent: NotFound,
  errorComponent: ErrorBoundary,
});
