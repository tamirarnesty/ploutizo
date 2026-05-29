import { Sortable } from '@ploutizo/ui/components/reui/sortable';
import { Skeleton } from '@ploutizo/ui/components/skeleton';
import { Text } from '@ploutizo/ui/components/text';
import type { Category } from '@/lib/data-access/categories';
import { CategoryRow } from './CategoryRow';

interface CategoriesListProps {
  isLoading: boolean;
  categories: Category[];
  onReorder: (categories: Category[]) => void;
  onEdit: (category: Category) => void;
  onArchive: (categoryId: string) => void;
}

export const CategoriesList = ({
  isLoading,
  categories,
  onReorder,
  onEdit,
  onArchive,
}: CategoriesListProps) => {
  if (isLoading) {
    return (
      <div className="flex flex-col gap-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-10" />
        ))}
      </div>
    );
  }

  if (categories.length === 0) {
    return (
      <Text variant="body-sm" className="text-muted-foreground">
        No categories found.
      </Text>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <Text variant="caption">Drag to reorder categories.</Text>
      <Sortable
        value={categories}
        onValueChange={onReorder}
        getItemValue={(c) => c.id}
        strategy="vertical"
        className="flex flex-col gap-2"
      >
        {categories.map((cat) => (
          <CategoryRow
            key={cat.id}
            category={cat}
            onEdit={() => onEdit(cat)}
            onArchive={() => onArchive(cat.id)}
          />
        ))}
      </Sortable>
    </div>
  );
};
