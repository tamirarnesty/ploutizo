import { Text } from '@ploutizo/ui/components/text';
import { cn } from '@ploutizo/ui/lib/utils';
import {
  OFFLINE_UNAVAILABLE_DETAIL,
  OFFLINE_UNAVAILABLE_TITLE,
} from './offline-copy';

export const OfflineUnavailable = ({ className }: { className?: string }) => (
  <div
    className={cn(
      'flex flex-col items-center gap-2 px-4 py-8 text-center',
      className
    )}
  >
    <Text variant="body-sm" className="font-medium">
      {OFFLINE_UNAVAILABLE_TITLE}
    </Text>
    <Text variant="body-sm" className="max-w-xs text-muted-foreground">
      {OFFLINE_UNAVAILABLE_DETAIL}
    </Text>
  </div>
);
