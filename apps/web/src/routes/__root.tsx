import {
  HeadContent,
  Scripts,
  createRootRoute,
  redirect,
} from '@tanstack/react-router';
import { ClerkProvider, useAuth } from '@clerk/tanstack-react-start';
import { auth } from '@clerk/tanstack-react-start/server';
import { shadcn } from '@clerk/ui/themes';
import { QueryClientProvider } from '@tanstack/react-query';
import { useEffect, useRef } from 'react';
import { createServerFn } from '@tanstack/react-start';
import appCss from '@ploutizo/ui/globals.css?url';
import { ThemeProvider } from '@ploutizo/ui/components/theme-provider';
import { Toaster } from '@ploutizo/ui/components/sonner';
import { TooltipProvider } from '@ploutizo/ui/components/tooltip';
import { queryClient, setTokenGetter } from '../lib/queryClient';

const authGuard = createServerFn().handler(async () => {
  const { isAuthenticated } = await auth();
  if (!isAuthenticated) {
    throw redirect({ to: '/sign-in/$' });
  }
});

const orgGuard = createServerFn().handler(async () => {
  const { orgId } = await auth();
  if (!orgId) {
    throw redirect({ to: '/onboarding' });
  }
});

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
              <TokenInitializer />
              {children}
              <Toaster />
            </ClerkProvider>
          </QueryClientProvider>
        </TooltipProvider>
      </ThemeProvider>
      <Scripts />
    </body>
  </html>
);

export const Route = createRootRoute({
  beforeLoad: async ({ location }) => {
    const isAuthRoute =
      location.pathname.startsWith('/sign-in') ||
      location.pathname.startsWith('/sign-up');
    const isOnboarding = location.pathname === '/onboarding';
    if (!isAuthRoute) {
      await authGuard();
      if (!isOnboarding) {
        await orgGuard();
      }
    }
  },
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
});
