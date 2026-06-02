import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@ploutizo/ui/components/card';
import { Separator } from '@ploutizo/ui/components/separator';
import { Text } from '@ploutizo/ui/components/text';
import type { OrgMember, SettlementAccountRow } from '@ploutizo/types';
import { SettlementPaneHeader } from '@/components/dashboard/SettlementPaneHeader';
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

  return (
    <Card className="w-full gap-0 py-0">
      <CardHeader className="gap-0 border-b border-border px-3.5 pt-3 [.border-b]:pb-3">
        <div className="flex w-full min-w-0 items-end justify-between gap-3">
          <div className="flex min-w-0 flex-col gap-1">
            <CardTitle className="text-lg leading-tight">Settlement</CardTitle>
            <Text variant="caption">On credit cards</Text>
            {!isLoading && !hasHouseholdCreditCards ? (
              <Text variant="caption" className="mt-1 leading-snug">
                Add a credit card to track exposure.
              </Text>
            ) : null}
          </div>
          {isLoading || hasHouseholdCreditCards ? (
            <SettlementPaneHeader
              isLoading={isLoading}
              householdSummary={householdSummary}
            />
          ) : null}
        </div>
      </CardHeader>
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
          {error ? (
            <Text variant="error">
              Couldn’t load settlement summary. Check your connection and try
              again.
            </Text>
          ) : isLoading ? (
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
                return <SettlementMemberListRowEmpty key={m.id} member={m} />;
              }
              return (
                <SettlementMemberListRowBalance
                  key={m.id}
                  member={m}
                  rollup={rollup}
                />
              );
            })
          )}
        </div>
        {hasHouseholdCreditCards && !isLoading ? (
          <>
            <Separator />
            <SettlementSharedRow
              sharedRollupCents={householdSummary.sharedRollupCents}
            />
          </>
        ) : null}
      </CardContent>
    </Card>
  );
};
