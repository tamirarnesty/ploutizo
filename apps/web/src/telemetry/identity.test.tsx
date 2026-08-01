import { render, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { TelemetryIdentitySync } from './identity';
import * as posthogClient from './posthogClient';

const mockUseAuth = vi.fn();
const mockUseOrganization = vi.fn();

vi.mock('@clerk/tanstack-react-start', () => ({
  useAuth: () => mockUseAuth(),
  useOrganization: () => mockUseOrganization(),
}));

describe('TelemetryIdentitySync', () => {
  const identify = vi.fn();
  const group = vi.fn();
  const reset = vi.fn();
  const resetGroups = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(posthogClient, 'getPostHog').mockReturnValue({
      identify,
      group,
      reset,
      resetGroups,
    } as never);
  });

  it('identifies signed-in users and associates the active household', async () => {
    mockUseAuth.mockReturnValue({
      isLoaded: true,
      isSignedIn: true,
      userId: 'user_1',
    });
    mockUseOrganization.mockReturnValue({
      organization: { id: 'org_1' },
    });

    render(<TelemetryIdentitySync />);

    await waitFor(() => {
      expect(identify).toHaveBeenCalledWith('user_1');
      expect(group).toHaveBeenCalledWith('household', 'org_1');
    });
  });

  it('resets identity on sign-out', async () => {
    mockUseAuth.mockReturnValueOnce({
      isLoaded: true,
      isSignedIn: true,
      userId: 'user_1',
    });
    mockUseOrganization.mockReturnValue({
      organization: { id: 'org_1' },
    });

    const { rerender } = render(<TelemetryIdentitySync />);

    await waitFor(() => expect(identify).toHaveBeenCalled());

    mockUseAuth.mockReturnValue({
      isLoaded: true,
      isSignedIn: false,
      userId: null,
    });
    mockUseOrganization.mockReturnValue({ organization: null });

    rerender(<TelemetryIdentitySync />);

    await waitFor(() => {
      expect(reset).toHaveBeenCalled();
    });
  });

  it('updates household grouping when the active org changes', async () => {
    mockUseAuth.mockReturnValue({
      isLoaded: true,
      isSignedIn: true,
      userId: 'user_1',
    });
    mockUseOrganization.mockReturnValueOnce({
      organization: { id: 'org_1' },
    });

    const { rerender } = render(<TelemetryIdentitySync />);

    await waitFor(() => expect(group).toHaveBeenCalledWith('household', 'org_1'));

    mockUseOrganization.mockReturnValue({
      organization: { id: 'org_2' },
    });

    rerender(<TelemetryIdentitySync />);

    await waitFor(() => {
      expect(group).toHaveBeenCalledWith('household', 'org_2');
    });
  });

  it('does not throw when PostHog is unavailable', () => {
    vi.spyOn(posthogClient, 'getPostHog').mockReturnValue(null);
    mockUseAuth.mockReturnValue({
      isLoaded: true,
      isSignedIn: true,
      userId: 'user_1',
    });
    mockUseOrganization.mockReturnValue({
      organization: { id: 'org_1' },
    });

    expect(() => render(<TelemetryIdentitySync />)).not.toThrow();
  });
});
