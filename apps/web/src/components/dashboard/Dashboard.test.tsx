import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { TooltipProvider } from '@ploutizo/ui/components/tooltip';
import type {
  GetSettlementBalancesResponse,
  MemberIdentity,
  OrgMember,
  SettlementAccountRow,
} from '@ploutizo/types';
import type {
  DashboardPeriodSelection,
  ResolvedDashboardPeriod,
} from '@ploutizo/utils/dashboard-period';
import { Dashboard } from '@/components/dashboard/Dashboard';
import { settlementMember } from '@/test/settlementFixtures';

const periodMocks = vi.hoisted(() => ({
  selection: {
    kind: 'shortcut',
    shortcut: 'mtd',
  } as DashboardPeriodSelection,
  resolved: {
    kind: 'ranged',
    from: '2026-03-01',
    to: '2026-03-24',
    priorFrom: '2026-02-01',
    priorTo: '2026-02-24',
  } as ResolvedDashboardPeriod,
  label: 'MTD',
  selectShortcut: vi.fn(),
  applyCustomRange: vi.fn(),
}));

vi.mock('@/components/dashboard/useDashboardPeriod', () => ({
  useDashboardPeriod: () => periodMocks,
}));

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

const emptyOverview = {
  meta: {
    range: {
      from: '2026-03-01',
      to: '2026-03-24',
      priorFrom: '2026-02-01',
      priorTo: '2026-02-24',
    },
  },
  trend: [],
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

const overviewMatchesPeriod = (url: string) => {
  const resolved = periodMocks.resolved;
  if (resolved.kind === 'all') {
    return url.includes(OVERVIEW_PATH) && !url.includes('from=');
  }
  const { from, to, priorFrom, priorTo } = resolved;
  return (
    url.includes(`from=${from}`) &&
    url.includes(`to=${to}`) &&
    url.includes(`priorFrom=${priorFrom}`) &&
    url.includes(`priorTo=${priorTo}`)
  );
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
        : emptyOverview
  );
});

const requestCount = (path: string) =>
  fetchMock.mock.calls.filter((call) => String(call[0]).includes(path)).length;

const renderDashboard = () => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <TooltipProvider delay={0}>
        <Dashboard />
      </TooltipProvider>
    </QueryClientProvider>
  );
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
    settlementsBody = settlements;
    membersBody = members;
    failingPaths.clear();
    requestGate = null;
    fetchMock.mockClear();
    toastMocks.error.mockClear();
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('renders the spend trend card', async () => {
    renderDashboard();
    expect(await screen.findByText('Spend trend')).toBeInTheDocument();
  });

  it('shows the card balances total in the section header', async () => {
    renderDashboard();

    const header = await waitFor(() => cardHeaderFor('Card Balances'));
    await waitFor(() => {
      expect(within(header).getByText(CARD_BALANCES_TOTAL)).toBeInTheDocument();
    });
    expect(within(header).getByText('Total')).toBeInTheDocument();
  });

  it('renders the settlement summary as its own card', async () => {
    renderDashboard();

    await screen.findByText('Visa');

    const settlementCard = cardFor('Settlement');
    expect(within(settlementCard).getByText('Personal')).toBeInTheDocument();
    expect(within(settlementCard).getByText('Shared')).toBeInTheDocument();
    expect(within(settlementCard).getByText(ADA_PERSONAL)).toBeInTheDocument();
  });

  it('marks both cards busy and disables Refresh while the data loads', async () => {
    const release = holdRequests();
    renderDashboard();

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
    renderDashboard();

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
    renderDashboard();

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
      renderDashboard();

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
    renderDashboard();

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

  it('requests overview for the active dashboard period', async () => {
    renderDashboard();
    await screen.findByText('Spend trend');

    const overviewCall = fetchMock.mock.calls.find((call) =>
      String(call[0]).includes(OVERVIEW_PATH)
    );
    expect(overviewCall).toBeDefined();
    expect(overviewMatchesPeriod(String(overviewCall![0]))).toBe(true);
  });

  it('hides the prior spend trend series for All', async () => {
    periodMocks.selection = {
      kind: 'shortcut',
      shortcut: 'all',
    } as DashboardPeriodSelection;
    periodMocks.resolved = { kind: 'all' };
    periodMocks.label = 'All';

    const allOverview = {
      meta: {
        range: {
          from: '2026-01-01',
          to: '2026-03-01',
          priorFrom: '',
          priorTo: '',
        },
      },
      trend: [
        {
          bucketStart: '2026-01-01',
          amountCents: 100,
          priorAmountCents: null,
        },
        {
          bucketStart: '2026-02-01',
          amountCents: 200,
          priorAmountCents: null,
        },
      ],
    };

    fetchMock.mockImplementation(async (input: RequestInfo | URL) => {
      const url = String(input);
      await requestGate;
      if (url.includes(OVERVIEW_PATH)) {
        return jsonResponse(allOverview);
      }
      const path = [SETTLEMENTS_PATH, MEMBERS_PATH].find((p) =>
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
        path === SETTLEMENTS_PATH ? settlementsBody : { data: membersBody }
      );
    });

    renderDashboard();
    await screen.findByText('Spend trend');
    expect(screen.queryByText('Last month')).not.toBeInTheDocument();
  });

  it.each(['Card Balances', 'Settlement'])(
    'explains that %s is all time when its hint is tapped',
    async (section) => {
      const user = userEvent.setup();
      renderDashboard();

      await screen.findByText('Visa');
      await user.click(
        screen.getByRole('button', { name: `About ${section}` })
      );

      expect(await screen.findByText('All time')).toBeInTheDocument();
    }
  );
});
