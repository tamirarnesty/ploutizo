import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AccessPolicyBoundary } from './AccessPolicyBoundary';
import { AccessProvider } from './AccessProvider';
import { resetWorkingSetForTests } from './working-set';
import type { ReactNode } from 'react';

const authState = vi.hoisted(() => ({
  isLoaded: false as boolean,
  isSignedIn: false as boolean,
  userId: undefined as string | null | undefined,
  orgId: undefined as string | null | undefined,
  getToken: (_options?: { skipCache?: boolean }) =>
    Promise.resolve(null as string | null),
}));

const navigate = vi.fn();

vi.mock('@clerk/tanstack-react-start', () => ({
  useAuth: () => ({
    isLoaded: authState.isLoaded,
    isSignedIn: authState.isSignedIn,
    userId: authState.userId,
    orgId: authState.orgId,
    getToken: authState.getToken,
  }),
}));

vi.mock('@tanstack/react-router', async () => {
  const actual = await vi.importActual('@tanstack/react-router');
  return {
    ...actual,
    useNavigate: () => navigate,
    useRouterState: () => '/dashboard',
  };
});

const unsignedJwt = (payload: Record<string, unknown>) => {
  const body = btoa(JSON.stringify(payload))
    .replaceAll('+', '-')
    .replaceAll('/', '_')
    .replace(/=+$/, '');
  return `hdr.${body}.sig`;
};

const wrapper = ({ children }: { children: ReactNode }) => (
  <AccessProvider>
    <AccessPolicyBoundary policy="active-household">
      {children}
    </AccessPolicyBoundary>
  </AccessProvider>
);

describe('AccessPolicyBoundary', () => {
  beforeEach(() => {
    resetWorkingSetForTests();
    navigate.mockClear();
    authState.isLoaded = false;
    authState.isSignedIn = false;
    authState.userId = undefined;
    authState.orgId = undefined;
    authState.getToken = () => Promise.resolve(null);
  });

  afterEach(() => {
    resetWorkingSetForTests();
  });

  it('renders nothing while access is not ready', () => {
    const { container } = render(<div data-testid="child">Child</div>, {
      wrapper,
    });
    expect(container).toBeEmptyDOMElement();
  });

  it('redirects signed-out visitors to sign-in with the current path', async () => {
    authState.isLoaded = true;
    render(<div>Child</div>, { wrapper });

    await waitFor(() => {
      expect(navigate).toHaveBeenCalledWith({
        to: '/sign-in/$',
        search: { redirect: '/dashboard' },
      });
    });
  });

  it('shows recovery UI when bearer validation fails', async () => {
    authState.isLoaded = true;
    authState.isSignedIn = true;
    authState.userId = 'user_a';
    authState.orgId = 'org_a';
    authState.getToken = () => Promise.resolve(null);

    render(<div>Child</div>, { wrapper });

    await waitFor(() => {
      expect(
        screen.getByRole('heading', { name: "Couldn't verify your session" })
      ).toBeInTheDocument();
    });
    expect(screen.queryByText('Child')).not.toBeInTheDocument();
  });

  it('retries bearer validation from the recovery UI', async () => {
    const user = userEvent.setup();
    const matchingToken = unsignedJwt({ sub: 'user_a', org_id: 'org_a' });
    authState.isLoaded = true;
    authState.isSignedIn = true;
    authState.userId = 'user_a';
    authState.orgId = 'org_a';
    authState.getToken = () => Promise.resolve(null);

    render(<div>Child</div>, { wrapper });

    await screen.findByRole('button', { name: 'Retry' });
    authState.getToken = () => Promise.resolve(matchingToken);
    await user.click(screen.getByRole('button', { name: 'Retry' }));

    await waitFor(() => {
      expect(screen.getByText('Child')).toBeInTheDocument();
    });
  });
});
