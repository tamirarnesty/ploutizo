import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { TooltipProvider } from '@ploutizo/ui/components/tooltip';
import type {
  GetSettlementBalancesResponse,
  OrgMember,
  SettlementAccountRow,
} from '@ploutizo/types';
import { Dashboard } from '@/components/dashboard/Dashboard';

vi.mock('@/lib/access/AccessProvider', async () => {
  const { householdAccessProviderMock } =
    await import('@/test/householdAccessMock');
  return householdAccessProviderMock;
});

vi.mock('@/lib/access/working-set', () => ({
  getHouseholdBearer: () => Promise.resolve('test-household-bearer'),
}));

const member = (id: string, firstName: string): OrgMember => ({
  id,
  orgId: 'org_a',
  role: 'admin',
  joinedAt: '2026-01-01T00:00:00.000Z',
  externalId: `user_${id}`,
  email: `${firstName.toLowerCase()}@example.com`,
  imageUrl: null,
  firstName,
  lastName: null,
});

const ada = member('m_ada', 'Ada');
const alan = member('m_alan', 'Alan');
const members = [ada, alan];

const identity = ({ id, firstName, lastName, email, imageUrl }: OrgMember) => ({
  id,
  firstName,
  lastName,
  email,
  imageUrl,
});

const visa: SettlementAccountRow = {
  account: {
    id: 'acct_visa',
    name: 'Visa',
    type: 'credit_card',
    institutionId: null,
    lastFour: '1234',
    statementDueDay: null,
    owners: [identity(ada)],
  },
  totalBalanceCents: 30000,
  sharedBalanceCents: 10000,
  sharedParticipantIds: [ada.id, alan.id],
  members: [
    { member: identity(ada), personalBalanceCents: 20000 },
    { member: identity(alan), personalBalanceCents: 0 },
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
    owners: [identity(alan)],
  },
  totalBalanceCents: -5000,
  sharedBalanceCents: 0,
  sharedParticipantIds: [],
  members: [
    { member: identity(ada), personalBalanceCents: -5000 },
    { member: identity(alan), personalBalanceCents: 0 },
  ],
  dueDate: null,
  status: null,
};

const settlements: GetSettlementBalancesResponse = { accounts: [visa, amex] };

/** $300.00 owed + $50.00 credit nets to the card balances total. */
const CARD_BALANCES_TOTAL = '$250.00';

const jsonResponse = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });

let settlementsFail = false;

const fetchMock = vi.fn((input: RequestInfo | URL) => {
  const url = String(input);
  if (url.includes('/api/settlements')) {
    return Promise.resolve(
      settlementsFail
        ? jsonResponse(
            { error: { code: 'SERVER_ERROR', message: 'boom' } },
            500
          )
        : jsonResponse(settlements)
    );
  }
  if (url.includes('/api/households/members')) {
    return Promise.resolve(jsonResponse({ data: members }));
  }
  return Promise.reject(new Error(`Unexpected request: ${url}`));
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
    settlementsFail = false;
    fetchMock.mockClear();
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('shows the card balances total in the section header instead of a footer row', async () => {
    renderDashboard();

    const header = await waitFor(() => cardHeaderFor('Card Balances'));
    await waitFor(() => {
      expect(within(header).getByText(CARD_BALANCES_TOTAL)).toBeInTheDocument();
    });
    expect(within(header).getByText('Total')).toBeInTheDocument();

    expect(screen.queryByText('Total outstanding')).not.toBeInTheDocument();
    expect(
      cardFor('Card Balances').querySelector('tfoot')
    ).not.toBeInTheDocument();
  });

  it('renders the settlement summary as its own card', async () => {
    renderDashboard();

    await screen.findByText('Visa');

    const settlementCard = cardFor('Settlement');
    expect(settlementCard).not.toBe(cardFor('Card Balances'));
    expect(within(settlementCard).getByText('Personal')).toBeInTheDocument();
    expect(within(settlementCard).getByText('Shared')).toBeInTheDocument();
    expect(within(settlementCard).getByText('$150.00')).toBeInTheDocument();
  });

  it('refetches the settlements query from the header Refresh', async () => {
    const user = userEvent.setup();
    renderDashboard();

    await screen.findByText('Visa');
    expect(requestCount('/api/settlements')).toBe(1);
    expect(requestCount('/api/households/members')).toBe(1);

    await user.click(screen.getByRole('button', { name: 'Refresh' }));

    await waitFor(() => {
      expect(requestCount('/api/settlements')).toBe(2);
      expect(requestCount('/api/households/members')).toBe(2);
    });
  });

  it('shows a per-card error with no per-card refresh when the data fails', async () => {
    settlementsFail = true;
    renderDashboard();

    expect(
      await screen.findByText(/Couldn’t load card balances/)
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Couldn’t load settlement summary/)
    ).toBeInTheDocument();

    expect(
      within(cardFor('Card Balances')).queryByRole('button', {
        name: /retry|refresh/i,
      })
    ).not.toBeInTheDocument();
    expect(
      within(cardFor('Settlement')).queryByRole('button', {
        name: /retry|refresh/i,
      })
    ).not.toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: 'Refresh' })).toHaveLength(1);
  });

  it.each(['Card Balances', 'Settlement'])(
    'explains that %s is all time',
    async (section) => {
      const user = userEvent.setup();
      renderDashboard();

      await screen.findByText('Visa');
      expect(screen.queryByText(/All time/)).not.toBeInTheDocument();

      await user.hover(
        screen.getByRole('button', { name: `About ${section}` })
      );

      expect(await screen.findByText(/^All time/)).toBeInTheDocument();
    }
  );
});
