import type { ReactNode } from 'react';
import { Sortable } from '@ploutizo/ui/components/reui/sortable';
import { Skeleton } from '@ploutizo/ui/components/skeleton';
import { Text } from '@ploutizo/ui/components/text';

interface SortableSettingsListProps<T extends { id: string }> {
  isLoading: boolean;
  items: T[];
  emptyMessage: string;
  loadingSkeletonClassName?: string;
  header?: ReactNode;
  caption?: ReactNode;
  sortableClassName?: string;
  onReorder: (items: T[]) => void;
  renderRow: (item: T) => ReactNode;
}

export const SortableSettingsList = <T extends { id: string }>({
  isLoading,
  items,
  emptyMessage,
  loadingSkeletonClassName = 'h-10',
  header,
  caption,
  sortableClassName = 'flex flex-col gap-2',
  onReorder,
  renderRow,
}: SortableSettingsListProps<T>) => {
  if (isLoading) {
    return (
      <div className="flex flex-col gap-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className={loadingSkeletonClassName} />
        ))}
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <Text variant="body-sm" className="text-muted-foreground">
        {emptyMessage}
      </Text>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {header}
      {caption}
      <Sortable
        value={items}
        onValueChange={onReorder}
        getItemValue={(item) => item.id}
        strategy="vertical"
        className={sortableClassName}
      >
        {items.map((item) => renderRow(item))}
      </Sortable>
    </div>
  );
};
