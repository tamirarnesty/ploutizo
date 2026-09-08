import type { CardBalanceRowViewModel } from '@/components/dashboard/card-balances/buildCardBalanceViewModels';
import type { PayToward } from '@/components/dashboard/settleFormSchema';

export type CardBalancesSettleClickHandler = (
  account: CardBalanceRowViewModel,
  payToward: PayToward
) => void;

export interface CardBalancesGridProps {
  rows: CardBalanceRowViewModel[];
  isLoading: boolean;
  onSettleClick: CardBalancesSettleClickHandler;
}
