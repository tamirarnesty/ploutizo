import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@ploutizo/ui/components/card';
import { Text } from '@ploutizo/ui/components/text';
import { useGetSettlements } from '@/lib/data-access/settlements';
import { useGetOrgMembers } from '@/lib/data-access/org';
import { SettlementPaneHeader } from '@/components/dashboard/SettlementPaneHeader';
import { SettlementMemberListRow } from '@/components/dashboard/SettlementMemberListRow';
import { SettlementMemberRowSkeleton } from '@/components/dashboard/SettlementMemberRowSkeleton';
import { useCreditCardMemberRollup } from '@/components/dashboard/useCreditCardMemberRollup';

// Per UI-SPEC SettlementSummaryPane Specification + D-14 + D-21.
// Shares queryKey ['settlements'] with Dashboard's CardBalancesGrid (Plan 05) — TanStack Query dedup.
export const SettlementSummaryPane = () => {
  const { data, isLoading } = useGetSettlements();
  const { data: members = [] } = useGetOrgMembers();

  const { hasHouseholdCreditCards, memberRollup, householdSummary } =
    useCreditCardMemberRollup(data?.accounts);

  return (
    <Card size="sm" className="w-full gap-2">
      <CardHeader className="gap-2 border-b border-border/60 pb-3">
        <CardTitle className="text-sm leading-none font-semibold">
          Settlement
        </CardTitle>
        <SettlementPaneHeader
          isLoading={isLoading}
          hasHouseholdCreditCards={hasHouseholdCreditCards}
          householdSummary={householdSummary}
        />
      </CardHeader>
      <CardContent className="space-y-0 py-1">
        <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-2 pb-1">
          <Text variant="caption" className="text-muted-foreground">
            Member
          </Text>
          <Text variant="caption" className="text-right text-muted-foreground">
            Balance
          </Text>
        </div>
        {isLoading ? (
          <>
            {[0, 1].map((i) => (
              <SettlementMemberRowSkeleton key={i} />
            ))}
          </>
        ) : (
          members.map((m) => {
            const rollup = memberRollup.get(m.id) ?? { cents: 0, cardCount: 0 };
            return (
              <SettlementMemberListRow
                key={m.id}
                member={m}
                rollup={rollup}
                hasHouseholdCreditCards={hasHouseholdCreditCards}
              />
            );
          })
        )}
      </CardContent>
    </Card>
  );
};
