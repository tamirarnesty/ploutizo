import { Card, CardContent } from '@ploutizo/ui/components/card';
import { Separator } from '@ploutizo/ui/components/separator';
import { Text } from '@ploutizo/ui/components/text';
import type { OrgMember, SettlementAccountRow } from '@ploutizo/types';
import { DashboardCardError } from '@/components/dashboard/DashboardCardError';
import { DashboardLiveCardHeader } from '@/components/dashboard/DashboardLiveCardHeader';
import { SettlementMemberListRowBalance } from '@/components/dashboard/SettlementMemberListRowBalance';
import { SettlementMemberListRowEmpty } from '@/components/dashboard/SettlementMemberListRowEmpty';
import { SettlementMemberRowSkeleton } from '@/components/dashboard/SettlementMemberRowSkeleton';
import { SettlementSharedRow } from '@/components/dashboard/SettlementSharedRow';
import { useCreditCardMemberRollup } from '@/components/dashboard/useCreditCardMemberRollup';

type SettlementSummaryPaneProps = {
  accounts: SettlementAccountRow[] | undefined;
  error?: boolean;
  isLoading: boolean;
  members: OrgMember[];
};

export const SettlementSummaryPane = ({
  accounts,
  error = false,
  isLoading,
  members,
}: SettlementSummaryPaneProps) => {
  const { hasHouseholdCreditCards, memberRollup, householdSummary } =
    useCreditCardMemberRollup(accounts);
  const hasBalances = !error && !isLoading && hasHouseholdCreditCards;

  return (
    <Card className="w-full gap-0 py-0">
      <DashboardLiveCardHeader
        title="Settlement"
        description={
          !error && !isLoading && !hasHouseholdCreditCards
            ? 'Add a credit card to track exposure.'
            : 'On credit cards'
        }
        totalCents={hasBalances ? householdSummary.cardTotalCents : undefined}
        isLoading={!error && isLoading}
      />
      {error ? (
        <DashboardCardError message="Couldn’t load settlement summary. Check your connection and try again." />
      ) : (
        <CardContent className="space-y-2 px-3.5 py-2">
          {hasHouseholdCreditCards ? (
            <Text
              as="p"
              variant="caption"
              className="font-semibold tracking-wide"
            >
              Personal
            </Text>
          ) : null}
          <div className="space-y-0">
            {isLoading ? (
              <>
                {[0, 1].map((i) => (
                  <SettlementMemberRowSkeleton key={i} />
                ))}
              </>
            ) : (
              members.map((m) => {
                const rollup = memberRollup.get(m.id) ?? {
                  cents: 0,
                  cardCount: 0,
                };
                if (!hasHouseholdCreditCards) {
                  return (
                    <SettlementMemberListRowEmpty
                      key={m.id}
                      member={m}
                      household={members}
                    />
                  );
                }
                return (
                  <SettlementMemberListRowBalance
                    key={m.id}
                    member={m}
                    household={members}
                    rollup={rollup}
                  />
                );
              })
            )}
          </div>
          {hasBalances ? (
            <>
              <Separator />
              <SettlementSharedRow
                sharedRollupCents={householdSummary.sharedRollupCents}
              />
            </>
          ) : null}
        </CardContent>
      )}
    </Card>
  );
};
