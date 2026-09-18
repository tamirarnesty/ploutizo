import { waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { AppAuthShell } from '@/app/AppAuthShell';
import {
  createTestClerk,
  renderAccessShellTree,
  resetAccessShellTestState,
} from '@/test/access-shell-harness';
import { BearerReadinessBoundary } from './BearerReadinessBoundary';
import type { ReactNode } from 'react';

const unsignedJwt = (payload: Record<string, unknown>) => {
  const body = btoa(JSON.stringify(payload))
    .replaceAll('+', '-')
    .replaceAll('/', '_')
    .replace(/=+$/, '');
  return `hdr.${body}.sig`;
};

const householdAJwt = unsignedJwt({ sub: 'user_a', org_id: 'org_a' });

const renderBoundaryShell = async (
  clerk = createTestClerk({
    isSignedIn: true,
    userId: 'user_a',
    orgId: 'org_a',
    getToken: vi.fn(async (options?: { skipCache?: boolean }) =>
      options?.skipCache ? householdAJwt : null
    ),
  })
) => {
  const shell = ({ children }: { children: ReactNode }) => (
    <AppAuthShell clerk={clerk}>
      <BearerReadinessBoundary>{children}</BearerReadinessBoundary>
    </AppAuthShell>
  );

  return renderAccessShellTree({ shell });
};

describe('BearerReadinessBoundary', () => {
  afterEach(() => {
    resetAccessShellTestState();
  });

  it('keeps route content mounted while household bearer is not ready', async () => {
    const { view } = await renderBoundaryShell();
    expect(view.getByTestId('index-page')).toBeInTheDocument();
  });

  it('shows bearer blocked UI when household bearer cannot be resolved', async () => {
    const { view } = await renderBoundaryShell(
      createTestClerk({
        isSignedIn: true,
        userId: 'user_a',
        orgId: 'org_a',
        getToken: vi.fn(async () => null),
      })
    );

    await waitFor(() => {
      expect(
        view.getByRole('heading', { name: "Couldn't verify your session" })
      ).toBeInTheDocument();
    });
  });

  it('shows route content once signed-out access is ready', async () => {
    const { view } = await renderBoundaryShell(
      createTestClerk({ isSignedIn: false })
    );

    await waitFor(() => {
      expect(view.getByTestId('index-page')).toBeInTheDocument();
    });
  });
});
