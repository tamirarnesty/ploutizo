/// <reference types="vite/client" />

import {
  HeadContent,
  Scripts,
  createRootRouteWithContext,
  useRouter,
} from '@tanstack/react-router';
import { ClerkProvider } from '@clerk/tanstack-react-start';
import { shadcn } from '@clerk/ui/themes';
import { HotkeysProvider } from '@tanstack/react-hotkeys';
import { QueryClientProvider } from '@tanstack/react-query';
import appCss from '@ploutizo/ui/globals.css?url';
import { ThemeProvider } from '@ploutizo/ui/components/theme-provider';
import { Toaster } from '@ploutizo/ui/components/sonner';
import { TooltipProvider } from '@ploutizo/ui/components/tooltip';
import { AccessBoundary } from '../lib/auth/access-boundary';
import { MoneyLocaleProvider } from '../lib/money/money-locale';
import { AppDevtools } from '../components/devtools/AppDevtools';
import { NotFound } from '../components/not-found/NotFound';
import { ErrorBoundary } from '../components/error-boundary/ErrorBoundary';
import type { RouterContext } from '../router';

const RootDocument = ({ children }: { children: React.ReactNode }) => {
  const queryClient = useRouter().options.context.queryClient;

  return (
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
          <HotkeysProvider>
            <TooltipProvider delay={500}>
              <QueryClientProvider client={queryClient}>
                <ClerkProvider
                  appearance={{ theme: shadcn }}
                  afterSignOutUrl="/sign-in/$"
                >
                  <MoneyLocaleProvider>
                    <AccessBoundary />
                    {children}
                    <Toaster />
                    <AppDevtools />
                  </MoneyLocaleProvider>
                </ClerkProvider>
              </QueryClientProvider>
            </TooltipProvider>
          </HotkeysProvider>
        </ThemeProvider>
        <Scripts />
      </body>
    </html>
  );
};

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
