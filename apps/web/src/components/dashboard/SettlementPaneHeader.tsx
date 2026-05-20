import { Skeleton } from '@ploutizo/ui/components/skeleton';
import { Text } from '@ploutizo/ui/components/text';
import type { HouseholdSettlementSummary } from '@/components/dashboard/useCreditCardMemberRollup';
import { formatCurrency } from '@/lib/formatCurrency';
import type { ReactNode } from 'react';

type SettlementPaneHeaderProps = {
  isLoading: boolean;
  hasHouseholdCreditCards: boolean;
  householdSummary: HouseholdSettlementSummary;
};

export const SettlementPaneHeader = ({
  isLoading,
  hasHouseholdCreditCards,
  householdSummary,
}: SettlementPaneHeaderProps) => {
  let body: ReactNode;

  if (isLoading) {
    body = (
      <>
        <Skeleton className="h-5 w-36 motion-safe:animate-pulse" />
        <Skeleton className="h-3.5 w-[13.5rem] max-w-full motion-safe:animate-pulse" />
      </>
    );
  } else if (hasHouseholdCreditCards) {
    body = (
      <>
        <Text
          as="p"
          variant="body-sm"
          className="font-sans font-semibold text-foreground tabular-nums"
        >
          {`${formatCurrency(householdSummary.netOwedCents)} net owed`}
        </Text>
        <Text
          as="p"
          variant="caption"
          className="leading-snug text-muted-foreground tabular-nums"
        >
          {formatCurrency(householdSummary.totalOwedCents)}
          {householdSummary.totalCreditCents > 0 ? (
            <>
              {' · '}
              <span className="text-success">
                {formatCurrency(householdSummary.totalCreditCents)} credit
              </span>
            </>
          ) : null}
        </Text>
      </>
    );
  } else {
    body = (
      <Text variant="caption" className="leading-snug text-muted-foreground">
        Add a credit card to track exposure.
      </Text>
    );
  }

  return <div className="space-y-0.5">{body}</div>;
};
