import { Link } from '@tanstack/react-router';
import { Badge } from '@ploutizo/ui/components/badge';
import { Button } from '@ploutizo/ui/components/button';
import { Empty, EmptyDescription } from '@ploutizo/ui/components/empty';
import { Skeleton } from '@ploutizo/ui/components/skeleton';
import { Text } from '@ploutizo/ui/components/text';
import { formatAccountLabel } from '@ploutizo/utils';
import type { ImportHistoryItem } from '@ploutizo/types';
import {
  formatImportBatchStatusLabel,
  formatImportCompletedCounts,
  formatImportHistoryTimestamp,
  importBatchStatusVariant,
} from '../lib/importPresentation';

interface ImportHistoryListProps {
  history: ImportHistoryItem[];
  isLoading?: boolean;
  emptyMessage?: string;
  variant?: 'compact' | 'detailed';
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

const HistoryProvenanceLinks = ({ item }: { item: ImportHistoryItem }) => {
  if (item.status !== 'completed') return null;
  const links = [
    item.createdCount > 0
      ? ({
          outcome: 'created' as const,
          label: 'View created',
        } as const)
      : null,
    item.matchedCount > 0
      ? ({
          outcome: 'matched' as const,
          label: 'View matched',
        } as const)
      : null,
  ].filter((link) => link !== null);

  if (links.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-2">
      {links.map((link) => (
        <Button
          key={link.outcome}
          nativeButton={false}
          variant="link"
          size="sm"
          render={
            <Link
              to="/transactions"
              search={{
                importBatchId: item.id,
                importOutcome: link.outcome,
              }}
            />
          }
        >
          {link.label}
        </Button>
      ))}
    </div>
  );
};

export const ImportHistoryList = ({
  history,
  isLoading = false,
  emptyMessage = 'No recent import history.',
  variant = 'compact',
}: ImportHistoryListProps) => {
  if (isLoading) return <ImportHistoryListSkeleton />;

  if (history.length === 0) {
    return (
      <Empty className="border border-dashed p-6">
        <EmptyDescription>{emptyMessage}</EmptyDescription>
      </Empty>
    );
  }

  return (
    <div className="divide-y divide-border rounded-md border border-border">
      {history.map((item) => (
        <div
          key={item.id}
          className="flex flex-wrap items-start justify-between gap-3 p-3"
        >
          <div className="min-w-0 flex-1 space-y-1">
            <Text variant="body-sm" className="font-medium wrap-break-word">
              {formatAccountLabel(item.account)}
            </Text>
            <Text
              variant="body-sm"
              className="wrap-break-word text-muted-foreground"
            >
              {item.fileName ?? 'Untitled CSV'}
            </Text>
            {variant === 'detailed' ? (
              <Text variant="caption">
                {item.status === 'completed'
                  ? `Imported ${formatImportHistoryTimestamp(item.importedAt)} · Completed ${formatImportHistoryTimestamp(item.completedAt)}`
                  : `Imported ${formatImportHistoryTimestamp(item.importedAt)} · Discarded ${formatImportHistoryTimestamp(item.discardedAt)}`}
              </Text>
            ) : null}
            {variant === 'detailed' && item.status === 'completed' ? (
              <Text variant="caption">{formatImportCompletedCounts(item)}</Text>
            ) : null}
            {variant === 'detailed' ? (
              <HistoryProvenanceLinks item={item} />
            ) : null}
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
