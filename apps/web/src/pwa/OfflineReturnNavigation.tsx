import { useRouter } from '@tanstack/react-router';
import { useEffect } from 'react';
import { sanitizeReturnPath } from '@/lib/access';
import { OFFLINE_ENTRY_PATH, allowsOfflineEntry } from './offline-entry';
import { OFFLINE_RETURN_TO_SEARCH_PARAM } from './offline-navigation';

export const OfflineReturnNavigation = () => {
  const router = useRouter();

  useEffect(() => {
    if (window.location.pathname !== OFFLINE_ENTRY_PATH) return;

    const returnTo = new URLSearchParams(window.location.search).get(
      OFFLINE_RETURN_TO_SEARCH_PARAM
    );
    const path = sanitizeReturnPath(returnTo);
    if (!path) return;

    const { pathname } = new URL(path, window.location.origin);
    if (!allowsOfflineEntry(pathname)) return;

    void router.navigate({ href: path });
  }, [router]);

  return null;
};
