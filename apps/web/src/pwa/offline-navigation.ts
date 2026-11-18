import { OFFLINE_ENTRY_PATH } from './offline-entry';

export const OFFLINE_RETURN_TO_SEARCH_PARAM = 'returnTo';

export const resolveOfflineNavigationFallback = (input: {
  origin: string;
  pathname: string;
  search: string;
}) => {
  if (input.pathname === OFFLINE_ENTRY_PATH) return { kind: 'shell' as const };

  const destination = new URL(OFFLINE_ENTRY_PATH, input.origin);
  destination.searchParams.set(
    OFFLINE_RETURN_TO_SEARCH_PARAM,
    `${input.pathname}${input.search}`
  );
  return { kind: 'redirect' as const, location: destination.toString() };
};
