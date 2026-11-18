import { OFFLINE_ENTRY_PATH, allowsOfflineEntry } from './offline-entry';

export const OFFLINE_RETURN_TO_SEARCH_PARAM = 'returnTo';

export type OfflineNavigationFallback =
  | { kind: 'error' }
  | { kind: 'shell' }
  | { kind: 'redirect'; location: string };

export const resolveOfflineNavigationFallback = (input: {
  origin: string;
  pathname: string;
  search: string;
}): OfflineNavigationFallback => {
  if (!allowsOfflineEntry(input.pathname)) return { kind: 'error' };
  if (input.pathname === OFFLINE_ENTRY_PATH) return { kind: 'shell' };

  const destination = new URL(OFFLINE_ENTRY_PATH, input.origin);
  const returnTo = `${input.pathname}${input.search}`;
  destination.searchParams.set(OFFLINE_RETURN_TO_SEARCH_PARAM, returnTo);
  return { kind: 'redirect', location: destination.toString() };
};
