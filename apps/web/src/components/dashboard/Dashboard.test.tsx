import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {
  Outlet,
  RouterProvider,
  createMemoryHistory,
  createRootRouteWithContext,
  createRoute,
  createRouter,
} from '@tanstack/react-router';
import { act, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { TooltipProvider } from '@ploutizo/ui/components/tooltip';
import {
  dashboardPriorRange,
  dashboardRangeGrain,
} from '@ploutizo/utils/dashboard-period';
import type {
  GetDashboardOverviewResponse,
  GetSettlementBalancesResponse,
  MemberIdentity,
  OrgMember,
  SettlementAccountRow,
} from '@ploutizo/types';
import type * as HouseholdLoaderReady from '@/lib/access/household-loader-ready';
import type { RouterContext } from '@/router';
// `.dashboard` is part of the route file name, not an extension.
// eslint-disable-next-line import/extensions
import { Route as DashboardRoute } from '@/routes/_layout.dashboard';
import { settlementMember } from '@/test/settlementFixtures';

const loaderReady = vi.hoisted(() => ({ value: false }));

// Isomorphic helpers run their server branch outside the Start compiler; give them the browser's view instead.
vi.mock('@/lib/access/household-loader-ready', async (importOriginal) => ({
  ...(await importOriginal<typeof HouseholdLoaderReady>()),
  isHouseholdLoaderReady: () => Promise.resolve(loaderReady.value),
}));

vi.mock('@/lib/dashboard-period/cookie.server', async () => {
  const { dashboardPeriodCookieFrom } =
    await import('@/lib/dashboard-period/cookie-value');
  return {
    getRequestDashboardPeriodCookie: () =>
      dashboardPeriodCookieFrom(document.cookie),
  };
});

const toastMocks = vi.hoisted(() => ({ error: vi.fn() }));

vi.mock('@ploutizo/ui/components/sonner', () => ({
  toast: { error: toastMocks.error },
}));

vi.mock('@/lib/access/AccessProvider', async () => {
  const { householdAccessProviderMock } =
    await import('@/test/householdAccessMock');
  return householdAccessProviderMock;
});

vi.mock('@/lib/access/working-set', () => ({
  getHouseholdBearer: () => Promise.resolve('test-household-bearer'),
}));

const SETTLEMENTS_PATH = '/api/settlements';
const MEMBERS_PATH = '/api/households/members';
const OVERVIEW_PATH = '/api/dashboard/overview';

/** Answers like the API: the prior window and grain follow from the requested dates. */
const overviewFor = (url: URL): GetDashboardOverviewResponse => {
  const from = url.searchParams.get('from');
  const to = url.searchParams.get('to');
  if (!from || !to) {
    return {
      meta: {
        kind: 'all',
        range: {
          from: '2026-01-15',
          to: '2026-03-10',
          priorFrom: null,
          priorTo: null,
          grain: 'month',
        },
      },
      trend: [],
    };
  }
  const prior = dashboardPriorRange({ from, to });
  return {
    meta: {
      kind: 'ranged',
      range: {
        from,
        to,
        priorFrom: prior.from,
        priorTo: prior.to,
        grain: dashboardRangeGrain({ from, to }),
      },
    },
    trend: [],
  };
};

const orgMember = (identity: MemberIdentity): OrgMember => ({
  ...identity,
  orgId: 'org_a',
  role: 'admin',
  joinedAt: '2026-01-01T00:00:00.000Z',
  externalId: `user_${identity.id}`,
});

const adaIdentity = settlementMember('m_ada', 'Ada', 'ada@example.com');
const alanIdentity = settlementMember('m_alan', 'Alan', 'alan@example.com');
const members = [orgMember(adaIdentity), orgMember(alanIdentity)];

const visa: SettlementAccountRow = {
  account: {
    id: 'acct_visa',
    name: 'Visa',
    type: 'credit_card',
    institutionId: null,
    lastFour: '1234',
    statementDueDay: null,
    owners: [adaIdentity],
  },
  totalBalanceCents: 30000,
  sharedBalanceCents: 10000,
  sharedParticipantIds: [adaIdentity.id, alanIdentity.id],
  members: [
    { member: adaIdentity, personalBalanceCents: 20000 },
    { member: alanIdentity, personalBalanceCents: 0 },
  ],
  dueDate: null,
  status: null,
};

const amex: SettlementAccountRow = {
  account: {
    id: 'acct_amex',
    name: 'Amex',
    type: 'credit_card',
    institutionId: null,
    lastFour: '5678',
    statementDueDay: null,
    owners: [alanIdentity],
  },
  totalBalanceCents: -5000,
  sharedBalanceCents: 0,
  sharedParticipantIds: [],
  members: [
    { member: adaIdentity, personalBalanceCents: -5000 },
    { member: alanIdentity, personalBalanceCents: 0 },
  ],
  dueDate: null,
  status: null,
};

const settlements: GetSettlementBalancesResponse = { accounts: [visa, amex] };

/** $300.00 owed + $50.00 credit nets to the card balances total. */
const CARD_BALANCES_TOTAL = '$250.00';
/** Ada owes $200.00 personally on Visa, less $50.00 credit on Amex. */
const ADA_PERSONAL = '$150.00';

const jsonResponse = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });

let settlementsBody = settlements;
let membersBody = members;
const failingPaths = new Set<string>();
let requestGate: Promise<void> | null = null;

/** Holds every request until the returned release is called. */
const holdRequests = () => {
  let release = () => {};
  requestGate = new Promise((resolve) => {
    release = resolve;
  });
  return () => {
    requestGate = null;
    release();
  };
};

const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
  const url = String(input);
  await requestGate;
  const path = [SETTLEMENTS_PATH, MEMBERS_PATH, OVERVIEW_PATH].find((p) =>
    url.includes(p)
  );
  if (!path) throw new Error(`Unexpected request: ${url}`);
  if (failingPaths.has(path)) {
    return jsonResponse(
      { error: { code: 'SERVER_ERROR', message: 'boom' } },
      500
    );
  }
  return jsonResponse(
    path === SETTLEMENTS_PATH
      ? settlementsBody
      : path === MEMBERS_PATH
        ? { data: membersBody }
        : overviewFor(new URL(url, 'http://localhost'))
  );
});

const requestCount = (path: string) =>
  fetchMock.mock.calls.filter((call) => String(call[0]).includes(path)).length;

const overviewRequests = () =>
  fetchMock.mock.calls
    .map((call) => String(call[0]))
    .filter((url) => url.includes(OVERVIEW_PATH))
    .map((url) => url.slice(url.indexOf(OVERVIEW_PATH)));

const setPeriodCookie = (value: string) => {
  document.cookie = `dashboard_period=${value}; path=/`;
};

const periodCookie = () =>
  document.cookie
    .split('; ')
    .find((entry) => entry.startsWith('dashboard_period='))
    ?.split('=')[1];

const createDashboardRouter = (initialLocation: string) => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  const rootRoute = createRootRouteWithContext<RouterContext>()({
    component: () => (
      <QueryClientProvider client={queryClient}>
        <TooltipProvider delay={0}>
          <Outlet />
        </TooltipProvider>
      </QueryClientProvider>
    ),
  });
  const indexRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: '/',
    component: () => <div>Home</div>,
  });
  const layoutRoute = createRoute({
    getParentRoute: () => rootRoute,
    id: '_layout',
    component: Outlet,
  });
  const { validateSearch, beforeLoad, loaderDeps, loader, component } =
    DashboardRoute.options;
  const dashboardRoute = createRoute({
    getParentRoute: () => layoutRoute,
    path: 'dashboard',
    validateSearch,
    beforeLoad,
    loaderDeps,
    loader,
    component,
  } as never);

  return createRouter({
    routeTree: rootRoute.addChildren([
      indexRoute,
      layoutRoute.addChildren([dashboardRoute]),
    ]),
    history: createMemoryHistory({ initialEntries: [initialLocation] }),
    context: {
      queryClient,
      access: {
        status: 'signed-in-with-active-household',
        signedInMemberId: 'user_a',
        activeHouseholdId: 'org_a',
      },
      identityLoaded: true,
      isReady: true,
    },
  });
};

/** Renders the real dashboard route, so its search validation, redirect, and period plumbing all run. */
const renderDashboard = async (initialLocation = '/dashboard') => {
  const router = createDashboardRouter(initialLocation);
  render(<RouterProvider router={router} />);
  await screen.findByText('Spend trend');
  return router;
};

const refreshButton = () => screen.getByRole('button', { name: 'Refresh' });

const cardFor = (title: string) => {
  const card = screen.getByText(title).closest('[data-slot="card"]');
  if (!card) throw new Error(`No card found for "${title}"`);
  return card as HTMLElement;
};

const cardHeaderFor = (title: string) => {
  const header = screen.getByText(title).closest('[data-slot="card-header"]');
  if (!header) throw new Error(`No card header found for "${title}"`);
  return header as HTMLElement;
};

describe('Dashboard', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date('2026-03-24T12:00:00'));
    document.cookie = 'dashboard_period=; path=/; max-age=0';
    loaderReady.value = false;
    settlementsBody = settlements;
    membersBody = members;
    failingPaths.clear();
    requestGate = null;
    fetchMock.mockClear();
    toastMocks.error.mockClear();
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  describe('period', () => {
    it('opens on month to date when neither the URL nor a past visit names a period', async () => {
      const router = await renderDashboard();

      expect(router.state.location.search).toEqual({ range: 'mtd' });
      await waitFor(() => {
        expect(overviewRequests()).toEqual([
          `${OVERVIEW_PATH}?from=2026-03-01&to=2026-03-24`,
        ]);
      });
      expect(
        await screen.findByText('Running total vs Feb 1 – Feb 24, 2026')
      ).toBeInTheDocument();
    });

    it('restores the last visit’s period when the URL names none', async () => {
      setPeriodCookie('2026-01-01_2026-01-15');
      const router = await renderDashboard();

      expect(router.state.location.search).toEqual({
        from: '2026-01-01',
        to: '2026-01-15',
      });
      await waitFor(() => {
        expect(overviewRequests()).toEqual([
          `${OVERVIEW_PATH}?from=2026-01-01&to=2026-01-15`,
        ]);
      });
      expect(
        screen.getByRole('button', {
          name: 'Custom period: Jan 1 – Jan 15, 2026',
        })
      ).toBeInTheDocument();
    });

    it('re-resolves a restored shortcut against today', async () => {
      setPeriodCookie('6m');
      await renderDashboard();

      await waitFor(() => {
        expect(overviewRequests()).toEqual([
          `${OVERVIEW_PATH}?from=2025-10-01&to=2026-03-24`,
        ]);
      });
    });

    it('prefers the URL’s period over the last visit’s and remembers it', async () => {
      setPeriodCookie('6m');
      const router = await renderDashboard('/dashboard?range=30d');

      expect(router.state.location.search).toEqual({ range: '30d' });
      await waitFor(() => {
        expect(overviewRequests()).toEqual([
          `${OVERVIEW_PATH}?from=2026-02-23&to=2026-03-24`,
        ]);
      });
      expect(periodCookie()).toBe('30d');
    });

    it('opens on the default when the URL mixes a shortcut with dates', async () => {
      const router = await renderDashboard(
        '/dashboard?range=ytd&from=2026-01-01&to=2026-01-31'
      );

      expect(router.state.location.search).toEqual({ range: 'mtd' });
    });

    it('refetches the overview for the new range when a shortcut is picked', async () => {
      const user = userEvent.setup();
      const router = await renderDashboard();
      await waitFor(() => {
        expect(overviewRequests()).toHaveLength(1);
      });

      await user.click(screen.getByRole('button', { name: 'YTD' }));

      await waitFor(() => {
        expect(overviewRequests()).toContain(
          `${OVERVIEW_PATH}?from=2026-01-01&to=2026-03-24`
        );
      });
      expect(router.state.location.search).toEqual({ range: 'ytd' });
      expect(periodCookie()).toBe('ytd');
      expect(
        await screen.findByText('Running total vs Oct 1 – Dec 24, 2025')
      ).toBeInTheDocument();
    });

    it('charts a custom range only once it is applied', async () => {
      const user = userEvent.setup();
      const router = await renderDashboard();
      await waitFor(() => {
        expect(overviewRequests()).toHaveLength(1);
      });
      const trigger = () =>
        screen.getByRole('button', { name: /^Custom period:/ });
      const day = (name: RegExp) => screen.getByRole('button', { name });

      await user.click(trigger());
      await user.click(day(/March 10th, 2026/));
      await user.click(screen.getByRole('button', { name: 'Cancel' }));

      expect(router.state.location.search).toEqual({ range: 'mtd' });
      expect(overviewRequests()).toHaveLength(1);

      await user.click(trigger());
      await user.click(day(/March 10th, 2026/));
      await user.click(screen.getByRole('button', { name: 'Apply' }));

      await waitFor(() => {
        expect(router.state.location.search).toEqual({
          from: '2026-03-01',
          to: '2026-03-10',
        });
      });
      await waitFor(() => {
        expect(overviewRequests()).toContain(
          `${OVERVIEW_PATH}?from=2026-03-01&to=2026-03-10`
        );
      });
    });

    it('charts All as spend per month over the whole history', async () => {
      const user = userEvent.setup();
      await renderDashboard();

      await user.click(screen.getByRole('button', { name: 'All' }));

      await waitFor(() => {
        expect(overviewRequests()).toContain(OVERVIEW_PATH);
      });
      expect(await screen.findByText('Spend per month')).toBeInTheDocument();
    });

    it('keeps the caption naming the data on screen while a new period loads', async () => {
      const user = userEvent.setup();
      await renderDashboard();
      expect(
        await screen.findByText('Running total vs Feb 1 – Feb 24, 2026')
      ).toBeInTheDocument();

      const release = holdRequests();
      await user.click(screen.getByRole('button', { name: '6m' }));

      await waitFor(() => {
        expect(cardFor('Spend trend')).toHaveAttribute('aria-busy', 'true');
      });
      expect(
        screen.getByText('Running total vs Feb 1 – Feb 24, 2026')
      ).toBeInTheDocument();

      release();
      expect(
        await screen.findByText('Running total vs Apr 1 – Sep 24, 2025')
      ).toBeInTheDocument();
    });

    it('preloads the overview for the remembered period when the dashboard link is hovered', async () => {
      loaderReady.value = true;
      setPeriodCookie('ytd');
      const router = createDashboardRouter('/');
      render(<RouterProvider router={router} />);
      await screen.findByText('Home');

      // What a nav link's intent preload does: it names no period, like the link itself.
      await act(() => router.preloadRoute({ to: '/dashboard' }));

      expect(overviewRequests()).toEqual([
        `${OVERVIEW_PATH}?from=2026-01-01&to=2026-03-24`,
      ]);
      expect(requestCount(SETTLEMENTS_PATH)).toBe(1);
    });
  });

  it('renders the spend trend card', async () => {
    await renderDashboard();
    expect(screen.getByText('Spend trend')).toBeInTheDocument();
  });

  it('shows the card balances total in the section header', async () => {
    await renderDashboard();

    const header = await waitFor(() => cardHeaderFor('Card Balances'));
    await waitFor(() => {
      expect(within(header).getByText(CARD_BALANCES_TOTAL)).toBeInTheDocument();
    });
    expect(within(header).getByText('Total')).toBeInTheDocument();
  });

  it('renders the settlement summary as its own card', async () => {
    await renderDashboard();

    await screen.findByText('Visa');

    const settlementCard = cardFor('Settlement');
    expect(within(settlementCard).getByText('Personal')).toBeInTheDocument();
    expect(within(settlementCard).getByText('Shared')).toBeInTheDocument();
    expect(within(settlementCard).getByText(ADA_PERSONAL)).toBeInTheDocument();
  });

  it('marks both cards busy and disables Refresh while the data loads', async () => {
    const release = holdRequests();
    await renderDashboard();

    expect(refreshButton()).toHaveAttribute('aria-disabled', 'true');
    expect(cardFor('Card Balances')).toHaveAttribute('aria-busy', 'true');
    expect(cardFor('Settlement')).toHaveAttribute('aria-busy', 'true');

    release();

    expect(
      await within(cardFor('Card Balances')).findByText('Visa')
    ).toBeInTheDocument();
    expect(cardFor('Settlement')).toHaveAttribute('aria-busy', 'false');
    expect(refreshButton()).toHaveAttribute('aria-disabled', 'false');
  });

  it('shows the latest data for both cards after the header Refresh', async () => {
    const user = userEvent.setup();
    await renderDashboard();

    await screen.findByText('Visa');
    settlementsBody = {
      accounts: [{ ...visa, totalBalanceCents: 40000 }, amex],
    };
    membersBody = [
      ...members,
      orgMember(settlementMember('m_grace', 'Grace', 'grace@example.com')),
    ];

    await user.click(refreshButton());

    expect(requestCount(OVERVIEW_PATH)).toBeGreaterThanOrEqual(1);
    expect(
      await within(cardHeaderFor('Card Balances')).findByText('$350.00')
    ).toBeInTheDocument();
    expect(
      await within(cardFor('Settlement')).findByText('Grace')
    ).toBeInTheDocument();
  });

  it('keeps loaded data and flags it as out of date when a refresh fails', async () => {
    const user = userEvent.setup();
    await renderDashboard();

    await screen.findByText('Visa');
    failingPaths.add(SETTLEMENTS_PATH);
    failingPaths.add(MEMBERS_PATH);

    await user.click(refreshButton());
    await waitFor(() => {
      expect(requestCount(SETTLEMENTS_PATH)).toBe(2);
    });
    await waitFor(() => {
      expect(refreshButton()).toHaveAttribute('aria-disabled', 'false');
    });

    expect(within(cardFor('Card Balances')).getByText('Visa')).toBeVisible();
    expect(
      within(cardHeaderFor('Card Balances')).getByText(CARD_BALANCES_TOTAL)
    ).toBeVisible();
    expect(within(cardFor('Settlement')).getByText(ADA_PERSONAL)).toBeVisible();
    expect(toastMocks.error).toHaveBeenCalledWith('Refresh failed.', {
      description: 'The dashboard may be out of date.',
    });
  });

  it.each([
    ['settlements', SETTLEMENTS_PATH],
    ['household members', MEMBERS_PATH],
  ])(
    'shows an error in each card when %s fail to load',
    async (_label, path) => {
      failingPaths.add(path);
      await renderDashboard();

      expect(
        await within(cardFor('Card Balances')).findByRole('alert')
      ).toHaveTextContent(/Couldn’t load card balances/);
      expect(
        within(cardFor('Settlement')).getByRole('alert')
      ).toHaveTextContent(/Couldn’t load settlement summary/);
    }
  );

  it('recovers failed cards from the header Refresh', async () => {
    const user = userEvent.setup();
    failingPaths.add(SETTLEMENTS_PATH);
    await renderDashboard();

    await screen.findByText(/Couldn’t load card balances/);
    failingPaths.clear();
    const release = holdRequests();
    await user.click(refreshButton());

    await waitFor(() => {
      expect(cardFor('Card Balances')).toHaveAttribute('aria-busy', 'true');
    });
    expect(cardFor('Settlement')).toHaveAttribute('aria-busy', 'true');

    release();

    expect(
      await within(cardFor('Card Balances')).findByText('Visa')
    ).toBeInTheDocument();
    expect(
      within(cardFor('Settlement')).getByText('Personal')
    ).toBeInTheDocument();
  });

  it.each(['Card Balances', 'Settlement'])(
    'explains that %s is all time when its hint is tapped',
    async (section) => {
      const user = userEvent.setup();
      await renderDashboard();

      await screen.findByText('Visa');
      await user.click(
        screen.getByRole('button', { name: `About ${section}` })
      );

      expect(await screen.findByText('All time')).toBeInTheDocument();
    }
  );
});
