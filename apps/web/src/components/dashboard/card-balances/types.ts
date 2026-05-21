import type { SettlementAccountRow } from '@ploutizo/types';

export type PayTowardTarget =
  | { kind: 'member'; memberId: string }
  | { kind: 'shared' };

export type CardBalancesSettleClickHandler = (
  account: SettlementAccountRow,
  target: PayTowardTarget
) => void;

export interface CardBalancesGridProps {
  accounts: SettlementAccountRow[];
  isLoading: boolean;
  onSettleClick: CardBalancesSettleClickHandler;
}
