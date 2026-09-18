import { render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { householdJwt } from '@/test/jwt-fixture';
import { AccessRouterRoot } from '@/app/AccessRouterRoot';
import { AppAuthShell } from '@/app/AppAuthShell';
import { BearerReadinessBoundary } from '@/lib/access/BearerReadinessBoundary';
import { getAccessRouterContext } from '@/lib/access/access-router-context-store';
import {
  createAccessTestRouter,
  createTestClerk,
  renderAccessShell,
  renderAccessShellTree,
  resetAccessShellTestState,
} from '@/test/access-shell-harness';
import type { ReactNode } from 'react';

const householdAJwt = householdJwt('user_a', 'org_a');

describe('access shell integration', () => {
  afterEach(() => {
    resetAccessShellTestState();
  });

  it('mounts ClerkProvider inside RouterProvider without useRouter warnings', async () => {
    const { consoleCapture } = await renderAccessShell();

    const messages = consoleCapture.warnings.join(' ');
    expect(messages).not.toContain(
      'useRouter must be used inside a <RouterProvider>'
    );
    expect(messages).not.toContain('getServerSnapshot should be cached');

    consoleCapture.restore();
  });

  it('publishes signed-out access into router context after Clerk loads', async () => {
    await renderAccessShell();

    await waitFor(() => {
      expect(getAccessRouterContext().identityLoaded).toBe(true);
    });
    expect(getAccessRouterContext().access).toEqual({ status: 'signed-out' });
    expect(getAccessRouterContext().isReady).toBe(true);
  });

  it('renders route content through the real auth shell', async () => {
    await renderAccessShell();
    expect(screen.getByTestId('index-page')).toBeInTheDocument();
  });

  it('keeps household route content mounted while bearer is resolving', async () => {
    const getToken = vi.fn(async (options?: { skipCache?: boolean }) =>
      options?.skipCache ? householdAJwt : null
    );
    const clerk = createTestClerk({
      isSignedIn: true,
      userId: 'user_a',
      orgId: 'org_a',
      getToken,
    });

    const shell = ({ children }: { children: ReactNode }) => (
      <AppAuthShell clerk={clerk}>
        <BearerReadinessBoundary>{children}</BearerReadinessBoundary>
      </AppAuthShell>
    );

    const { view } = await renderAccessShellTree({ shell });

    expect(view.getByTestId('index-page')).toBeInTheDocument();

    await waitFor(() => {
      expect(getAccessRouterContext().isReady).toBe(true);
    });
    expect(getToken).toHaveBeenCalledWith({ skipCache: true });
  });

  it('invalidates the router when signed-out access becomes ready', async () => {
    const shell = ({ children }: { children: ReactNode }) => (
      <AppAuthShell clerk={createTestClerk()}>{children}</AppAuthShell>
    );
    const router = createAccessTestRouter({ shell });
    const invalidate = vi.spyOn(router, 'invalidate');
    await router.load();

    render(<AccessRouterRoot router={router} />);

    await waitFor(() => {
      expect(invalidate).toHaveBeenCalled();
    });
  });
});
