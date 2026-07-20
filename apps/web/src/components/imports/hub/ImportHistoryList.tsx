import { Badge } from '@ploutizo/ui/components/badge';
import { Empty, EmptyDescription } from '@ploutizo/ui/components/empty';
import { Skeleton } from '@ploutizo/ui/components/skeleton';
import { Text } from '@ploutizo/ui/components/text';
import type { ImportDraftSummary } from '@ploutizo/types';
import {
  formatDraftAccountLabel,
  formatImportBatchStatusLabel,
  importBatchStatusVariant,
} from '../lib/importPresentation';

interface ImportHistoryListProps {
  history: ImportDraftSummary[];
  isLoading?: boolean;
}

const ImportHistoryListSkeleton = () => (
  <div className="divide-y divide-border rounded-md border border-border">
    {Array.from({ length: 3 }, (_, i) => (
      <div
        key={i}
        className="flex flex-wrap items-center justify-between gap-3 p-3"
      >
        <div className="min-w-0 space-y-2">
          <Skeleton className="h-4 w-40" />
          <Skeleton className="h-4 w-56" />
        </div>
        <div className="flex items-center gap-2">
          <Skeleton className="h-6 w-20 rounded-full" />
          <Skeleton className="h-4 w-14" />
        </div>
      </div>
    ))}
  </div>
);

export const ImportHistoryList = ({
  history,
  isLoading = false,
}: ImportHistoryListProps) => {
  if (isLoading) return <ImportHistoryListSkeleton />;

  if (history.length === 0) {
    return (
      <Empty className="border border-dashed p-6">
        <EmptyDescription>No recent import history.</EmptyDescription>
      </Empty>
    );
  }

  return (
    <div className="divide-y divide-border rounded-md border border-border">
      {history.map((item) => (
        <div
          key={item.id}
          className="flex flex-wrap items-center justify-between gap-3 p-3"
        >
          <div className="min-w-0">
            <Text variant="body-sm" className="truncate font-medium">
              {formatDraftAccountLabel(item)}
            </Text>
            <Text variant="body-sm" className="truncate text-muted-foreground">
              {item.fileName ?? 'Untitled CSV'}
            </Text>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant={importBatchStatusVariant(item.status)}>
              {formatImportBatchStatusLabel(item.status)}
            </Badge>
            <Text variant="body-sm" className="text-muted-foreground">
              {item.rowCount} rows
            </Text>
          </div>
        </div>
      ))}
    </div>
  );
};
