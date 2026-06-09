import { Badge } from '@ploutizo/ui/components/badge';
import { Text } from '@ploutizo/ui/components/text';
import type { ImportDraftSummary } from '@ploutizo/types';
import { formatDraftAccountLabel } from './importPresentation';

interface ImportHistoryListProps {
  history: ImportDraftSummary[];
}

export const ImportHistoryList = ({ history }: ImportHistoryListProps) => {
  if (history.length === 0) {
    return (
      <Text variant="body-sm" className="text-muted-foreground">
        No recent import history.
      </Text>
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
            <Badge variant="secondary">{item.status}</Badge>
            <Text variant="body-sm" className="text-muted-foreground">
              {item.rowCount} rows
            </Text>
          </div>
        </div>
      ))}
    </div>
  );
};
