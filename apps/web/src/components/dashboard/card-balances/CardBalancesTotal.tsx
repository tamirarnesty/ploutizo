import { CardAction } from '@ploutizo/ui/components/card';
import { Skeleton } from '@ploutizo/ui/components/skeleton';
import { Text } from '@ploutizo/ui/components/text';
import { SignedBalanceText } from '@/components/dashboard/SignedBalanceText';

type CardBalancesTotalProps = {
  /** Signed total: credit nets against amounts owed. */
  cents: number;
  isLoading: boolean;
};

export const CardBalancesTotal = ({
  cents,
  isLoading,
}: CardBalancesTotalProps) => (
  <CardAction className="flex flex-col items-end gap-1">
    <Text variant="caption">Total</Text>
    {isLoading ? (
      <Skeleton
        className="h-4 w-20 motion-safe:animate-pulse"
        aria-hidden="true"
      />
    ) : (
      <SignedBalanceText
        as="p"
        cents={cents}
        className="text-right text-base leading-none font-bold"
      />
    )}
  </CardAction>
);
