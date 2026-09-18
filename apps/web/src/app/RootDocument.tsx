import { HeadContent, Scripts } from '@tanstack/react-router';
import { HotkeysProvider } from '@tanstack/react-hotkeys';
import { ThemeProvider } from '@ploutizo/ui/components/theme-provider';
import { Toaster } from '@ploutizo/ui/components/sonner';
import { TooltipProvider } from '@ploutizo/ui/components/tooltip';
import { AppDevtools } from '@/components/devtools/AppDevtools';
import { AppAuthShell } from './AppAuthShell';
import type { ReactNode } from 'react';

export const RootDocument = ({ children }: { children: ReactNode }) => {
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
              <AppAuthShell>
                {children}
                <Toaster />
                <AppDevtools />
              </AppAuthShell>
            </TooltipProvider>
          </HotkeysProvider>
        </ThemeProvider>
        <Scripts />
      </body>
    </html>
  );
};
