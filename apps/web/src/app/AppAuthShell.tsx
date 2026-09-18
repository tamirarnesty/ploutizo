import { ClerkProvider } from '@clerk/tanstack-react-start';
import { shadcn } from '@clerk/ui/themes';
import { QueryClientProvider } from '@tanstack/react-query';
import { AccessProvider, useAccess } from '@/lib/access/AccessProvider';
import { useAccessRouterInvalidation } from '@/lib/access/use-access-router-invalidation';
import { MoneyLocaleProvider } from '@/lib/money/money-locale';
import type { ComponentProps, ReactNode } from 'react';

export type InjectedClerk = NonNullable<
  ComponentProps<typeof ClerkProvider>['Clerk']
>;

const AppShell = ({ children }: { children: ReactNode }) => {
  const { queryClient } = useAccess();
  useAccessRouterInvalidation();

  return (
    <QueryClientProvider client={queryClient}>
      <MoneyLocaleProvider>{children}</MoneyLocaleProvider>
    </QueryClientProvider>
  );
};

export const AppAccessTree = ({ children }: { children: ReactNode }) => {
  return (
    <AccessProvider>
      <AppShell>{children}</AppShell>
    </AccessProvider>
  );
};

type AppAuthShellProps = {
  children: ReactNode;
  clerk?: InjectedClerk;
};

export const AppAuthShell = ({ children, clerk }: AppAuthShellProps) => {
  return (
    <ClerkProvider
      appearance={{ theme: shadcn }}
      afterSignOutUrl="/sign-in/$"
      {...(clerk
        ? {
            Clerk: clerk,
            experimental: { runtimeEnvironment: 'headless' },
          }
        : {})}
    >
      <AppAccessTree>{children}</AppAccessTree>
    </ClerkProvider>
  );
};
