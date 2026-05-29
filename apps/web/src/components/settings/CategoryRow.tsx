import { GripVertical } from 'lucide-react';
import {
  SortableItem,
  SortableItemHandle,
} from '@ploutizo/ui/components/reui/sortable';
import { Button } from '@ploutizo/ui/components/button';
import { Text } from '@ploutizo/ui/components/text';
import { renderLucideIcon } from '@/components/categories/LucideIconPicker';
import type { Category } from '@/lib/data-access/categories';
import { SettingsRowAlertDialog } from './SettingsRowAlertDialog';

interface CategoryRowProps {
  category: Category;
  onEdit: () => void;
  onArchive: () => void;
}

export const CategoryRow = ({
  category,
  onEdit,
  onArchive,
}: CategoryRowProps) => (
  <SortableItem value={category.id}>
    <div className="flex items-center gap-3 rounded-md border border-border bg-card px-3 py-2">
      <SortableItemHandle
        aria-label="Drag to reorder"
        className="cursor-grab text-muted-foreground hover:text-foreground"
      >
        <GripVertical size={16} />
      </SortableItemHandle>
      <div className="text-muted-foreground">
        {renderLucideIcon(category.icon, 16)}
      </div>
      {category.colour ? (
        <div className={`size-3 shrink-0 rounded-full bg-${category.colour}`} />
      ) : null}
      <Text as="span" variant="body-sm" className="min-w-0 flex-1 truncate">
        {category.name}
      </Text>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={onEdit}
        className="text-muted-foreground"
      >
        Edit
      </Button>
      <SettingsRowAlertDialog
        triggerLabel="Archive"
        title="Archive category?"
        description="Transactions using this category will not be affected."
        confirmLabel="Archive category"
        onConfirm={onArchive}
      />
    </div>
  </SortableItem>
);
