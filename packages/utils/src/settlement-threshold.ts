import type { SettlementThresholdMode } from '@ploutizo/types';
import { SETTLEMENT_THRESHOLD_MODE_VALUES } from '@ploutizo/types';
import { dollarsToCents, centsToDollars } from './currency';

export const DEFAULT_SETTLEMENT_THRESHOLD_CENTS = 5000;

export { SETTLEMENT_THRESHOLD_MODE_VALUES };
export type { SettlementThresholdMode };

export const settlementThresholdModeFromCents = (
  settlementThreshold: number | null | undefined
): SettlementThresholdMode => {
  if (settlementThreshold == null) return 'app_default';
  if (settlementThreshold === 0) return 'immediate';
  return 'custom';
};

export const settlementThresholdDollarsFromCents = (
  settlementThreshold: number | null | undefined
): number | undefined =>
  settlementThreshold != null && settlementThreshold > 0
    ? centsToDollars(settlementThreshold)
    : undefined;

export const isPositiveSettlementThresholdDollars = (
  thresholdDollars: number | undefined
): thresholdDollars is number =>
  thresholdDollars !== undefined &&
  Number.isFinite(thresholdDollars) &&
  dollarsToCents(thresholdDollars) > 0;

export const customSettlementThresholdCentsFromDollars = (
  thresholdDollars: number | undefined
): number => {
  if (!isPositiveSettlementThresholdDollars(thresholdDollars)) {
    throw new Error('Settlement threshold must be at least 1 cent');
  }
  return dollarsToCents(thresholdDollars);
};

export const settlementThresholdCentsFromMode = (
  mode: SettlementThresholdMode,
  thresholdDollars?: number
): number | null => {
  if (mode === 'app_default') return null;
  if (mode === 'immediate') return 0;
  return customSettlementThresholdCentsFromDollars(thresholdDollars);
};

export const resolveSettlementThresholdCents = (
  settlementThreshold: number | null | undefined
): number =>
  settlementThreshold ?? DEFAULT_SETTLEMENT_THRESHOLD_CENTS;

export const shouldNotifySettlementBalance = (
  balanceCents: number,
  settlementThreshold: number | null | undefined
): boolean =>
  Math.abs(balanceCents) > resolveSettlementThresholdCents(settlementThreshold);
