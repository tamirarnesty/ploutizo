import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@ploutizo/ui/components/card';
import { Text } from '@ploutizo/ui/components/text';
import { Skeleton } from '@ploutizo/ui/components/skeleton';
import { cn } from '@ploutizo/ui/lib/utils';
import { useGetSettlements } from '@/lib/data-access/settlements';
import { useGetOrgMembers } from '@/lib/data-access/org';
import { UserAvatar } from '@/components/members/UserAvatar';
import { formatCurrency } from '@/lib/formatCurrency';

// Per UI-SPEC SettlementSummaryPane Specification + D-14 + D-21.
// Shares queryKey ['settlements'] with Dashboard's CardBalancesGrid (Plan 05) — TanStack Query dedup.
// OrgMember fields: displayName (not name), imageUrl (not avatarUrl).
export const SettlementSummaryPane = () => {
  const { data, isLoading } = useGetSettlements();
  const { data: members = [] } = useGetOrgMembers();

  // Aggregate balanceCents and per-member card count from accounts response.
  const memberRollup = (() => {
    const totals = new Map<string, { cents: number; cardCount: number }>();
    for (const acc of data?.accounts ?? []) {
      for (const row of acc.members) {
        const prev = totals.get(row.member.id) ?? { cents: 0, cardCount: 0 };
        totals.set(row.member.id, {
          cents: prev.cents + row.balanceCents,
          cardCount: prev.cardCount + (row.balanceCents !== 0 ? 1 : 0),
        });
      }
    }
    return totals;
  })();

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
            const rollup = memberRollup.get(m.id) ?? { cents: 0, cardCount: 0 };
            const isCredit = rollup.cents < 0;
            const amountClass = cn(
              'font-sans font-semibold tabular-nums',
              isCredit ? 'text-success' : 'text-foreground'
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
                      {`across ${rollup.cardCount} card${rollup.cardCount === 1 ? '' : 's'}`}
                    </Text>
                  </div>
                </div>
                <div className="shrink-0 text-right">
                  <Text as="p" variant="body" className={amountClass}>
                    {formatCurrency(Math.abs(rollup.cents))}
                  </Text>
                  <Text variant="caption" className={subClass}>
                    {isCredit ? 'owed to them' : 'owed'}
                  </Text>
                </div>
              </div>
            );
          })
        )}
      </CardContent>
    </Card>
  );
};
