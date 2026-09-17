import { waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { AppAuthShell } from '@/app/AppAuthShell';
import {
  createTestClerk,
  renderAccessShellTree,
  resetAccessShellTestState,
} from '@/test/access-shell-harness';
import { BearerReadinessBoundary } from './AccessPolicyBoundary';
import type { ReactNode } from 'react';

const renderBoundaryShell = async (
  clerk = createTestClerk({
    isSignedIn: true,
    userId: 'user_a',
    orgId: 'org_a',
    getToken: vi.fn(async () => null),
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

  it('renders nothing while household bearer is not ready', async () => {
    const { view } = await renderBoundaryShell();
    expect(view.queryByTestId('index-page')).not.toBeInTheDocument();
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
