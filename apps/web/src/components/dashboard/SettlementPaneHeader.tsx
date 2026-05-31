import { Skeleton } from '@ploutizo/ui/components/skeleton';
import { Text } from '@ploutizo/ui/components/text';
import { cn } from '@ploutizo/ui/lib/utils';
import type { HouseholdSettlementSummary } from '@/components/dashboard/useCreditCardMemberRollup';
import { formatSignedBalanceCents } from '@/lib/formatCurrency';

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

  const cardTotalDisplay = formatSignedBalanceCents(
    householdSummary.cardTotalCents
  );

  return (
    <Text
      as="p"
      className={cn(
        'shrink-0 text-right text-base leading-none font-bold whitespace-nowrap tabular-nums',
        cardTotalDisplay.tone === 'credit' && 'text-success',
        cardTotalDisplay.tone === 'zero' && 'text-muted-foreground',
        cardTotalDisplay.tone === 'owed' && 'text-foreground'
      )}
    >
      {cardTotalDisplay.text}
    </Text>
  );
};
