import { readCookie, writeCookie } from '@/lib/cookies/persistent-cookie';
import { isSpendTrendMode } from '@/lib/spend-trend-mode';
import type { SpendTrendMode } from '@/lib/spend-trend-mode';

const SPEND_TREND_MODE_COOKIE = 'spend_trend_mode';

/** The last mode the viewer picked. */
export const readPersistedSpendTrendMode = (): SpendTrendMode | null => {
  const value = readCookie(SPEND_TREND_MODE_COOKIE);
  return value !== undefined && isSpendTrendMode(value) ? value : null;
};

export const persistSpendTrendMode = (mode: SpendTrendMode) => {
  writeCookie(SPEND_TREND_MODE_COOKIE, mode);
};
