import { Text } from '@ploutizo/ui/components/text';

export const OfflineFallback = () => (
  <div className="flex flex-1 flex-col items-center justify-center gap-3 px-6 text-center">
    <Text as="h1" variant="h3">
      You're offline
    </Text>
    <Text variant="body-sm" className="max-w-sm text-muted-foreground">
      Connect once while signed in to open your dashboard and transactions on
      this device.
    </Text>
  </div>
);
