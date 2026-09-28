import { readCookie, writeCookie } from '@/lib/cookies/persistent-cookie';

/** How the spend trend charts each bucket: added onto everything before it, or on its own. */
export const SPEND_TREND_MODES = ['running', 'bucket'] as const;

export type SpendTrendMode = (typeof SPEND_TREND_MODES)[number];

export const DEFAULT_SPEND_TREND_MODE: SpendTrendMode = 'bucket';

const SPEND_TREND_MODE_COOKIE = 'spend_trend_mode';

export const isSpendTrendMode = (
  value: string | undefined
): value is SpendTrendMode =>
  (SPEND_TREND_MODES as readonly (string | undefined)[]).includes(value);

/** The last mode the viewer picked. */
export const readPersistedSpendTrendMode = (): SpendTrendMode | null => {
  const value = readCookie(SPEND_TREND_MODE_COOKIE);
  return isSpendTrendMode(value) ? value : null;
};

export const persistSpendTrendMode = (mode: SpendTrendMode) => {
  writeCookie(SPEND_TREND_MODE_COOKIE, mode);
};
