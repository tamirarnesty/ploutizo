import { Skeleton } from '@ploutizo/ui/components/skeleton';
import { SignedBalanceText } from '@/components/dashboard/SignedBalanceText';
import type { HouseholdSettlementSummary } from '@/lib/settlements';

type SettlementPaneHeaderProps = {
  isLoading: boolean;
  householdSummary: HouseholdSettlementSummary;
};

/** Hero card total aligned with member/shared row amounts. */
export const SettlementPaneHeader = ({
  isLoading,
  householdSummary,
}: SettlementPaneHeaderProps) => {
  if (isLoading) {
    return (
      <Skeleton
        className="h-6 w-20 shrink-0 motion-safe:animate-pulse"
        aria-hidden="true"
      />
    );
  }

  return (
    <SignedBalanceText
      as="p"
      cents={householdSummary.cardTotalCents}
      className="shrink-0 text-right text-base leading-none font-bold"
    />
  );
};
