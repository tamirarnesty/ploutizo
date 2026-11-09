import { Button } from '@ploutizo/ui/components/button';
import { Page } from '@ploutizo/ui/components/page';
import { Text } from '@ploutizo/ui/components/text';
import type { Category } from '@ploutizo/validators';
import { PageHeader } from '@/components/PageHeader';
import {
  useArchiveCategory,
  useGetCategories,
  useReorderCategories,
} from '@/lib/data-access/categories';
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
    <Page>
      <PageHeader title="Categories & Tags" titleAs="h2" />

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <section className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <Text as="h2" variant="label" className="font-semibold">
              Categories
            </Text>
            <Button
              type="button"
              size="sm"
              disabled={catLoading}
              onClick={dialog.openCreate}
            >
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
      </div>

      <CategoryDialog
        open={dialog.open}
        onOpenChange={dialog.onOpenChange}
        category={dialog.entity}
      />
    </Page>
  );
};
