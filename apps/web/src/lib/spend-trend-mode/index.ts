/** How the spend trend charts each bucket: added onto everything before it, or on its own. */
export const SPEND_TREND_MODES = ['running', 'bucket'] as const;

export type SpendTrendMode = (typeof SPEND_TREND_MODES)[number];

export const DEFAULT_SPEND_TREND_MODE: SpendTrendMode = 'bucket';

export const isSpendTrendMode = (value: string): value is SpendTrendMode =>
  (SPEND_TREND_MODES as readonly string[]).includes(value);
