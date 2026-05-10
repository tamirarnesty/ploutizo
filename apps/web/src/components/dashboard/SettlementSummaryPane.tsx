import { useMemo } from 'react';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@ploutizo/ui/components/card';
import { Text } from '@ploutizo/ui/components/text';
import { Skeleton } from '@ploutizo/ui/components/skeleton';
import { cn } from '@ploutizo/ui/lib/utils';
import { useGetAccounts } from '@/lib/data-access/accounts';
import { useGetSettlements } from '@/lib/data-access/settlements';
import { useGetOrgMembers } from '@/lib/data-access/org';
import { UserAvatar } from '@/components/members/UserAvatar';
import { formatCurrency } from '@/lib/formatCurrency';

// Per UI-SPEC SettlementSummaryPane Specification + D-14 + D-21.
// Shares queryKey ['settlements'] with Dashboard's CardBalancesGrid (Plan 05) — TanStack Query dedup.
// OrgMember fields: displayName (not name), imageUrl (not avatarUrl).
export const SettlementSummaryPane = () => {
  const { data, isLoading: settlementsLoading } = useGetSettlements();
  const { data: accounts = [], isLoading: accountsLoading } = useGetAccounts();
  const { data: members = [] } = useGetOrgMembers();

  const creditCardCount = useMemo(
    () =>
      accounts.filter((a) => a.type === 'credit_card' && a.archivedAt === null)
        .length,
    [accounts]
  );

  // Credit-card settlement balances only (sidebar matches Card Balances / household cards).
  const memberCreditOwedCents = useMemo(() => {
    const totals = new Map<string, number>();
    for (const acc of data?.accounts ?? []) {
      if (acc.account.type !== 'credit_card') continue;
      for (const row of acc.members) {
        totals.set(
          row.member.id,
          (totals.get(row.member.id) ?? 0) + row.balanceCents
        );
      }
    }
    return totals;
  }, [data?.accounts]);

  const isLoading = settlementsLoading || accountsLoading;

  return (
    <Card className="w-full">
      <CardHeader className="space-y-1">
        <CardTitle>
          <Text as="span" variant="h3">
            Settlement
          </Text>
        </CardTitle>
        <Text variant="caption" className="text-muted-foreground">
          Outstanding balances
        </Text>
      </CardHeader>
      <CardContent className="space-y-3">
        {isLoading ? (
          <>
            <Skeleton className="h-10 w-full motion-safe:animate-pulse" />
            <Skeleton className="h-10 w-full motion-safe:animate-pulse" />
          </>
        ) : (
          members.map((m) => {
            const cents = memberCreditOwedCents.get(m.id) ?? 0;
            const hasCards = creditCardCount > 0;

            if (!hasCards) {
              return (
                <div
                  key={m.id}
                  className="flex items-start justify-between gap-3"
                >
                  <div className="flex min-w-0 items-center gap-2">
                    <UserAvatar
                      name={m.displayName}
                      imageUrl={m.imageUrl ?? null}
                      size="sm"
                    />
                    <div className="min-w-0">
                      <Text
                        variant="body"
                        className="min-w-0 truncate font-semibold"
                      >
                        {m.displayName}
                      </Text>
                      <Text variant="caption" className="text-muted-foreground">
                        Add a card
                      </Text>
                    </div>
                  </div>
                  <div className="shrink-0 text-right">
                    <Text
                      as="p"
                      variant="body"
                      className="font-sans font-semibold text-muted-foreground tabular-nums"
                    >
                      -
                    </Text>
                  </div>
                </div>
              );
            }

            const isCredit = cents < 0;
            const isZero = cents === 0;

            const amountClass = cn(
              'font-sans font-semibold tabular-nums',
              isCredit
                ? 'text-success'
                : isZero
                  ? 'text-muted-foreground'
                  : 'text-foreground'
            );

            const subClass = cn(
              isCredit ? 'text-success' : 'text-muted-foreground'
            );

            return (
              <div
                key={m.id}
                className="flex items-start justify-between gap-3"
              >
                <div className="flex min-w-0 items-center gap-2">
                  <UserAvatar
                    name={m.displayName}
                    imageUrl={m.imageUrl ?? null}
                    size="sm"
                  />
                  <div className="min-w-0">
                    <Text
                      variant="body"
                      className="min-w-0 truncate font-semibold"
                    >
                      {m.displayName}
                    </Text>
                    <Text variant="caption" className="text-muted-foreground">
                      {`${creditCardCount} card${creditCardCount === 1 ? '' : 's'}`}
                    </Text>
                  </div>
                </div>
                <div className="shrink-0 text-right">
                  <Text as="p" variant="body" className={amountClass}>
                    {formatCurrency(Math.abs(cents))}
                  </Text>
                  {!isZero ? (
                    <Text variant="caption" className={subClass}>
                      {isCredit ? 'owed to them' : 'owed'}
                    </Text>
                  ) : null}
                </div>
              </div>
            );
          })
        )}
      </CardContent>
    </Card>
  );
};
