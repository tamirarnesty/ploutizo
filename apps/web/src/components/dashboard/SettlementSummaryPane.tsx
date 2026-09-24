import { CardContent } from '@ploutizo/ui/components/card';
import { ItemGroup } from '@ploutizo/ui/components/item';
import { Separator } from '@ploutizo/ui/components/separator';
import { Text } from '@ploutizo/ui/components/text';
import type { OrgMember, SettlementAccountRow } from '@ploutizo/types';
import { DashboardLiveCard } from '@/components/dashboard/DashboardLiveCard';
import { SettlementMemberListRowBalance } from '@/components/dashboard/SettlementMemberListRowBalance';
import { SettlementMemberListRowEmpty } from '@/components/dashboard/SettlementMemberListRowEmpty';
import { SettlementMemberRowSkeleton } from '@/components/dashboard/SettlementMemberRowSkeleton';
import { SettlementSharedRow } from '@/components/dashboard/SettlementSharedRow';
import { useCreditCardMemberRollup } from '@/components/dashboard/useCreditCardMemberRollup';

type SettlementSummaryPaneProps = {
  accounts: SettlementAccountRow[] | undefined;
  isError: boolean;
  isLoading: boolean;
  members: OrgMember[];
};

export const SettlementSummaryPane = ({
  accounts,
  isError,
  isLoading,
  members,
}: SettlementSummaryPaneProps) => {
  const { hasHouseholdCreditCards, memberRollup, sharedRollupCents } =
    useCreditCardMemberRollup(accounts);
  const hasBalances = !isError && !isLoading && hasHouseholdCreditCards;

  return (
    <DashboardLiveCard
      title="Settlement"
      description={
        !isError && !isLoading && !hasHouseholdCreditCards
          ? 'Add a credit card to track exposure.'
          : 'On credit cards'
      }
      isLoading={isLoading}
      isError={isError}
      errorMessage="Couldn’t load settlement summary. Check your connection and try again."
    >
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
        <ItemGroup className="gap-0 has-data-[size=xs]:gap-0">
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
        </ItemGroup>
        {hasBalances ? (
          <>
            <Separator />
            <SettlementSharedRow sharedRollupCents={sharedRollupCents} />
          </>
        ) : null}
      </CardContent>
    </DashboardLiveCard>
  );
};
