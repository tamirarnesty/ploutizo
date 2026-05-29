import type { Category } from '@/lib/data-access/categories';
import { Text } from '@ploutizo/ui/components/text';
import { CategoryRow } from './CategoryRow';
import { SortableSettingsList } from './SortableSettingsList';

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
}: CategoriesListProps) => (
  <SortableSettingsList
    isLoading={isLoading}
    items={categories}
    emptyMessage="No categories found."
    caption={
      <Text variant="caption">Drag to reorder categories.</Text>
    }
    onReorder={onReorder}
    renderRow={(cat) => (
      <CategoryRow
        key={cat.id}
        category={cat}
        onEdit={() => onEdit(cat)}
        onArchive={() => onArchive(cat.id)}
      />
    )}
  />
);
