import { render, waitFor } from '@testing-library/react';
import { expect } from 'vitest';
import { AccessRouterRoot } from '@/app/AccessRouterRoot';
import { AppAuthShell } from '@/app/AppAuthShell';
import { resetAccessRouterContextStoreForTests } from '@/lib/access/access-router-context-store';
import { resetBearerStateForTests } from '@/lib/access/working-set';
import { resetWorkingSetRegistryForTests } from '@/lib/access/working-set-registry';
import {
  createTestClerk,
  installClerkSignedOutFixture,
  resetClerkBrowserFixture,
} from '@/test/clerk-browser-fixture';
import {
  createAccessTestRouter,
  renderWithAccessRouter,
} from '@/test/router-test-utils';
import type { RouterContext } from '@/router';
import type { ReactNode } from 'react';

export const resetAccessShellTestState = () => {
  resetWorkingSetRegistryForTests();
  resetBearerStateForTests();
  resetAccessRouterContextStoreForTests();
  resetClerkBrowserFixture();
};

export const collectConsoleWarnings = () => {
  const warnings: string[] = [];
  const originalWarn = console.warn;
  const originalError = console.error;

  const capture =
    (bucket: string[]) =>
    (...args: unknown[]) => {
      bucket.push(
        args
          .map((arg) => (typeof arg === 'string' ? arg : JSON.stringify(arg)))
          .join(' ')
      );
    };

  console.warn = capture(warnings);
  console.error = capture(warnings);

  return {
    warnings,
    restore: () => {
      console.warn = originalWarn;
      console.error = originalError;
    },
  };
};

const defaultShell = ({ children }: { children: ReactNode }) => (
  <AppAuthShell clerk={installClerkSignedOutFixture()}>{children}</AppAuthShell>
);

export const renderAccessShell = async (
  options?: Parameters<typeof createAccessTestRouter>[0]
) => {
  resetAccessShellTestState();
  const consoleCapture = collectConsoleWarnings();

  const { router, ...view } = await renderWithAccessRouter(null, {
    shell: options?.shell ?? defaultShell,
    context: options?.context,
    initialLocation: options?.initialLocation,
    indexTestId: options?.indexTestId,
  });

  await waitFor(
    () => {
      expect(view.getByTestId('index-page')).toBeInTheDocument();
    },
    { timeout: 5000 }
  );

  return { router, view, consoleCapture };
};

export const renderAccessShellTree = async (options?: {
  shell: (props: { children: ReactNode }) => ReactNode;
  context?: Partial<RouterContext>;
}) => {
  resetAccessShellTestState();

  const router = createAccessTestRouter({
    shell: options?.shell,
    context: options?.context,
  });
  await router.load();

  const view = render(<AccessRouterRoot router={router} />);

  return { router, view };
};

export {
  createAccessTestRouter,
  createTestClerk,
  installClerkSignedOutFixture,
  renderWithAccessRouter,
};
