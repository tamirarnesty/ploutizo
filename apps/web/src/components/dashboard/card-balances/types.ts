import type {
  SettlementAccountRow,
  SettlementMemberRow,
} from '@ploutizo/types';

export interface CardBalancesGridProps {
  accounts: SettlementAccountRow[];
  isLoading: boolean;
  onSettleClick: (
    account: SettlementAccountRow,
    member: SettlementMemberRow
  ) => void;
}
