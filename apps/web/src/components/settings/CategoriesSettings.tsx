import { Button } from '@ploutizo/ui/components/button';
import { Text } from '@ploutizo/ui/components/text';
import {
  useArchiveCategory,
  useGetCategories,
  useReorderCategories,
} from '@/lib/data-access/categories';
import type { Category } from '@/lib/data-access/categories';
import { useSettingsEntityDialog } from '@/hooks/useSettingsEntityDialog';
import { CategoriesList } from './CategoriesList';
import { CategoryDialog } from './CategoryDialog';
import { TagsSettingsSection } from './TagsSettingsSection';

export const CategoriesSettings = () => {
  const { data: categories = [], isLoading: catLoading } = useGetCategories();
  const archiveCategory = useArchiveCategory();
  const reorderCategories = useReorderCategories();
  const dialog = useSettingsEntityDialog<Category>();

  const handleReorder = (newOrder: Category[]) => {
    reorderCategories.mutate(newOrder.map((c) => c.id));
  };

  return (
    <div className="flex max-w-2xl flex-col gap-8">
      <Text as="h1" variant="h3">
        Categories &amp; Tags
      </Text>

      <section className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <Text as="h2" variant="label" className="font-semibold">
            Categories
          </Text>
          <Button type="button" size="sm" onClick={dialog.openCreate}>
            Add category
          </Button>
        </div>

        <CategoriesList
          isLoading={catLoading}
          categories={categories}
          onReorder={handleReorder}
          onEdit={dialog.openEdit}
          onArchive={(id) => archiveCategory.mutate(id)}
        />
      </section>

      <TagsSettingsSection />

      <CategoryDialog
        open={dialog.open}
        onOpenChange={dialog.onOpenChange}
        category={dialog.entity}
      />
    </div>
  );
};
