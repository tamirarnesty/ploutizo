import { useMemo } from 'react';
import { useRouterState } from '@tanstack/react-router';
import { useQuery } from '@tanstack/react-query';
import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from '@ploutizo/ui/components/sidebar';
import { cn } from '@ploutizo/ui/lib/utils';
import { useGetSettlements } from '@/lib/data-access/settlements';
import { fetchTransactions } from '@/lib/data-access/transactions';
import { useGetOrgMembers } from '@/lib/data-access/org';
import { UserAvatar } from '@/components/members/UserAvatar';
import { formatCurrency } from '@/lib/formatCurrency';

// MEMBERS sidebar section — D-03, D-15.
// Route-driven contextual subline:
//   /dashboard → settlement balance (deduped with Dashboard via shared queryKey)
//   /expenses  → expense total (sidebar-owned unbounded query, limit 1000)
//   /income    → income total (sidebar-owned unbounded query, limit 1000)
//   other      → no subline
// The sidebar query for /expenses and /income is INTENTIONALLY separate from the page's
// paged query (different limit → different queryKey → no dedup). Accuracy capped at 1000
// per RESEARCH Assumption A1 — Phase 7.3 replaces with GET /api/dashboard/income-by-person.
export const SidebarMembersSection = () => {
  const { location } = useRouterState();
  const path = location.pathname;
  const isDashboard = path === '/dashboard';
  const isExpensesRoute = path === '/expenses';
  const isIncomeRoute = path === '/income';

  // Always fetch members so the rows render on every page (MEMBERS section is always visible per D-03).
  // OrgMember shape uses displayName (not name) and imageUrl (not avatarUrl).
  const { data: members = [] } = useGetOrgMembers();

  // Route-gated queries.
  // useGetSettlements fires on every route (needed for /dashboard sidebar values).
  // expense/income queries (limit: 1000) are gated via `enabled: isExpensesRoute` /
  // `enabled: isIncomeRoute` — zero network cost on /accounts, /settings, /transactions,
  // /settlements, etc. Hooks are called unconditionally at top-level (React rules of hooks);
  // enabled: false suppresses the network call.
  const settlementsQuery = useGetSettlements();

  const expensesQuery = useQuery({
    queryKey: ['transactions', { type: 'expense', limit: 1000 }],
    queryFn: () =>
      fetchTransactions({
        page: 1,
        limit: 1000,
        sort: 'date',
        order: 'desc',
        type: 'expense',
      }),
    enabled: isExpensesRoute,
  });

  const incomeQuery = useQuery({
    queryKey: ['transactions', { type: 'income', limit: 1000 }],
    queryFn: () =>
      fetchTransactions({
        page: 1,
        limit: 1000,
        sort: 'date',
        order: 'desc',
        type: 'income',
      }),
    enabled: isIncomeRoute,
  });

  // Compute per-member subline text + tone from the active route's data.
  const memberValues = useMemo(() => {
    if (isDashboard) {
      // Aggregate balanceCents across all accounts per member (keyed by member.id from SettlementMemberRow).
      const totals = new Map<string, number>();
      for (const acc of settlementsQuery.data?.accounts ?? []) {
        for (const row of acc.members) {
          totals.set(
            row.member.id,
            (totals.get(row.member.id) ?? 0) + row.balanceCents
          );
        }
      }
      const out = new Map<
        string,
        { label: string; tone: 'credit' | 'debit' | 'zero' }
      >();
      for (const m of members) {
        const cents = totals.get(m.id) ?? 0;
        if (cents === 0) {
          out.set(m.id, { label: '', tone: 'zero' });
        } else if (cents < 0) {
          // Negative balance = credit (member is owed). Display in green per D-12, UI-SPEC Color section.
          out.set(m.id, {
            label: `${formatCurrency(Math.abs(cents))} owed to them`,
            tone: 'credit',
          });
        } else {
          out.set(m.id, {
            label: `${formatCurrency(cents)} owed`,
            tone: 'debit',
          });
        }
      }
      return out;
    }
    if (isExpensesRoute || isIncomeRoute) {
      // Sum amountCents from each transaction's assignees by memberId.
      const rows =
        (isExpensesRoute ? expensesQuery.data?.data : incomeQuery.data?.data) ??
        [];
      const totals = new Map<string, number>();
      for (const tx of rows) {
        for (const a of tx.assignees) {
          totals.set(a.memberId, (totals.get(a.memberId) ?? 0) + a.amountCents);
        }
      }
      const out = new Map<
        string,
        { label: string; tone: 'credit' | 'debit' | 'zero' }
      >();
      for (const m of members) {
        const cents = totals.get(m.id) ?? 0;
        out.set(m.id, {
          label: cents === 0 ? '' : formatCurrency(cents),
          tone: 'zero', // expense/income totals use muted styling, not green/foreground emphasis
        });
      }
      return out;
    }
    // Other routes: no subline.
    return new Map<string, { label: string; tone: 'zero' }>();
  }, [
    isDashboard,
    isExpensesRoute,
    isIncomeRoute,
    settlementsQuery.data,
    expensesQuery.data,
    incomeQuery.data,
    members,
  ]);

  // Hide the entire section in icon-collapsed sidebar mode (consistent with ThemeToggle).
  return (
    <div className="group-data-[collapsible=icon]:hidden">
      <SidebarGroup>
        <SidebarGroupLabel>MEMBERS</SidebarGroupLabel>
        <SidebarGroupContent>
          <SidebarMenu>
            {members.map((member) => {
              const value = memberValues.get(member.id);
              const showLabel = !!value?.label;
              return (
                <SidebarMenuItem key={member.id}>
                  <SidebarMenuButton
                    tooltip={member.displayName}
                    className="cursor-default"
                    aria-disabled="true"
                    tabIndex={-1}
                  >
                    <UserAvatar
                      name={member.displayName}
                      imageUrl={member.imageUrl}
                      size="sm"
                    />
                    <span className="min-w-0 truncate">
                      {member.displayName}
                    </span>
                    {showLabel ? (
                      <span
                        className={cn(
                          'ml-auto min-w-0 truncate text-xs',
                          value.tone === 'credit'
                            ? 'text-success'
                            : 'text-muted-foreground'
                        )}
                      >
                        {value.label}
                      </span>
                    ) : null}
                  </SidebarMenuButton>
                </SidebarMenuItem>
              );
            })}
          </SidebarMenu>
        </SidebarGroupContent>
      </SidebarGroup>
    </div>
  );
};
