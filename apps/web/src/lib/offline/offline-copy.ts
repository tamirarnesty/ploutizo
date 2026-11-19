export const OFFLINE_WRITES_MESSAGE =
  "You're offline. Changes aren't available until you reconnect.";

export const OFFLINE_UNAVAILABLE_TITLE = 'Not available offline';

export const OFFLINE_UNAVAILABLE_DETAIL =
  "This view hasn't been opened on this device yet. Reconnect to load it.";

export const formatOfflineAsOf = (
  iso: string,
  locale?: string,
  timeZone?: string
) => {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return null;
  return new Intl.DateTimeFormat(locale, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    timeZone,
  }).format(date);
};

export const offlineBannerText = (
  syncedAt: string | null,
  locale?: string,
  timeZone?: string
) => {
  const formatted = syncedAt
    ? formatOfflineAsOf(syncedAt, locale, timeZone)
    : null;
  if (!formatted) {
    return `Offline - nothing saved on this device yet. ${OFFLINE_WRITES_MESSAGE}`;
  }
  return `Offline - data as of ${formatted}. ${OFFLINE_WRITES_MESSAGE}`;
};

export const createOfflineWriteUnavailableError = () => {
  const error = new Error(OFFLINE_WRITES_MESSAGE);
  error.name = 'OfflineWriteUnavailableError';
  return error;
};
