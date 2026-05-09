import type {
  SettlementAccountRow,
  SettlementMemberRow,
} from '@ploutizo/types';

export type CardBalancesSettleClickHandler = (
  account: SettlementAccountRow,
  member: SettlementMemberRow
) => void;

export interface CardBalancesGridProps {
  accounts: SettlementAccountRow[];
  isLoading: boolean;
  onSettleClick: CardBalancesSettleClickHandler;
}
