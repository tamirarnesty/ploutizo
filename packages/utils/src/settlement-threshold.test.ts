import { describe, expect, it } from 'vitest';
import {
  DEFAULT_SETTLEMENT_THRESHOLD_CENTS,
  customSettlementThresholdCentsFromDollars,
  resolveSettlementThresholdCents,
  settlementThresholdCentsFromMode,
  settlementThresholdDollarsFromCents,
  settlementThresholdModeFromCents,
  shouldNotifySettlementBalance,
} from './settlement-threshold';

describe('settlement threshold helpers', () => {
  it('maps stored cents to explicit UI modes', () => {
    expect(settlementThresholdModeFromCents(null)).toBe('app_default');
    expect(settlementThresholdModeFromCents(undefined)).toBe('app_default');
    expect(settlementThresholdModeFromCents(0)).toBe('immediate');
    expect(settlementThresholdModeFromCents(5000)).toBe('custom');
  });

  it('maps custom positive cents to dollar form values', () => {
    expect(settlementThresholdDollarsFromCents(null)).toBeUndefined();
    expect(settlementThresholdDollarsFromCents(0)).toBeUndefined();
    expect(settlementThresholdDollarsFromCents(5075)).toBe(50.75);
  });

  it('maps explicit UI modes to API cents', () => {
    expect(settlementThresholdCentsFromMode('app_default')).toBeNull();
    expect(settlementThresholdCentsFromMode('immediate')).toBe(0);
    expect(settlementThresholdCentsFromMode('custom', 50.75)).toBe(5075);
  });

  it('rejects custom thresholds that round below one cent', () => {
    expect(() => customSettlementThresholdCentsFromDollars(0)).toThrow(
      'Settlement threshold must be at least 1 cent'
    );
    expect(() => customSettlementThresholdCentsFromDollars(0.004)).toThrow(
      'Settlement threshold must be at least 1 cent'
    );
  });

  it('resolves nullish values to the app default without flattening zero', () => {
    expect(resolveSettlementThresholdCents(null)).toBe(
      DEFAULT_SETTLEMENT_THRESHOLD_CENTS
    );
    expect(resolveSettlementThresholdCents(undefined)).toBe(
      DEFAULT_SETTLEMENT_THRESHOLD_CENTS
    );
    expect(resolveSettlementThresholdCents(0)).toBe(0);
    expect(resolveSettlementThresholdCents(2500)).toBe(2500);
  });

  it('uses a strict balance threshold for notifications', () => {
    expect(shouldNotifySettlementBalance(0, 0)).toBe(false);
    expect(shouldNotifySettlementBalance(1, 0)).toBe(true);
    expect(shouldNotifySettlementBalance(-1, 0)).toBe(true);
    expect(shouldNotifySettlementBalance(5000, null)).toBe(false);
    expect(shouldNotifySettlementBalance(5001, null)).toBe(true);
  });
});
