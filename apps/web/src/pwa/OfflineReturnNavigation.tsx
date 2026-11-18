import { useRouter } from '@tanstack/react-router';
import { useEffect } from 'react';
import { OFFLINE_ENTRY_PATH, allowsOfflineEntry } from './offline-entry';
import { OFFLINE_RETURN_TO_SEARCH_PARAM } from './offline-navigation';

const parseSameOriginReturnTo = (raw: string) => {
  try {
    const target = new URL(raw, window.location.origin);
    if (target.origin !== window.location.origin) return undefined;
    const path = `${target.pathname}${target.search}${target.hash}`;
    if (!allowsOfflineEntry(target.pathname)) return undefined;
    return path;
  } catch {
    return undefined;
  }
};

export const OfflineReturnNavigation = () => {
  const router = useRouter();

  useEffect(() => {
    if (window.location.pathname !== OFFLINE_ENTRY_PATH) return;

    const returnTo = new URLSearchParams(window.location.search).get(
      OFFLINE_RETURN_TO_SEARCH_PARAM
    );
    if (!returnTo) return;

    const path = parseSameOriginReturnTo(returnTo);
    if (!path) return;

    void router.navigate({ href: path });
  }, [router]);

  return null;
};
