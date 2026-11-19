import { useSyncExternalStore } from 'react';
import { Text } from '@ploutizo/ui/components/text';
import { offlineBannerText } from './offline-copy';
import { readLastSyncedAt, subscribeOfflineRead } from './offline-read-store';

export const OfflineIndicator = () => {
  const syncedAt = useSyncExternalStore(
    subscribeOfflineRead,
    readLastSyncedAt,
    () => null
  );

  return (
    <div
      role="status"
      className="border-b border-border bg-muted px-4 py-2 text-center"
    >
      <Text as="p" variant="body-sm">
        {offlineBannerText(syncedAt)}
      </Text>
    </div>
  );
};
