import type { SettlementStatus } from '@ploutizo/validators';

const SETTLEMENT_STATUS_LABEL: Record<SettlementStatus, string> = {
  due_soon: 'Due Soon',
  on_track: 'On Track',
};

export const settlementStatusDisplayLabel = (
  status: SettlementStatus
): string => SETTLEMENT_STATUS_LABEL[status];
