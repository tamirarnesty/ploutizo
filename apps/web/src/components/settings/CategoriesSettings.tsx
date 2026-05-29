import { useCallback, useState } from 'react';
import { Skeleton } from '@ploutizo/ui/components/skeleton';
import { Text } from '@ploutizo/ui/components/text';
import {
  Combobox,
  ComboboxChip,
  ComboboxChips,
  ComboboxChipsInput,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxItem,
  ComboboxList,
  ComboboxValue,
  useComboboxAnchor,
} from '@ploutizo/ui/components/combobox';
import { Button } from '@ploutizo/ui/components/button';
import {
  useArchiveTag,
  useCreateTag,
  useGetTags,
} from '@/lib/data-access/tags';
import {
  useArchiveCategory,
  useGetCategories,
  useReorderCategories,
} from '@/lib/data-access/categories';
import type { Category } from '@/lib/data-access/categories';
import { CategoriesList } from './CategoriesList';
import { CategoryDialog } from './CategoryDialog';

export const CategoriesSettings = () => {
  const { data: categories = [], isLoading: catLoading } = useGetCategories();
  const { data: tags = [], isLoading: tagLoading } = useGetTags();
  const archiveCategory = useArchiveCategory();
  const reorderCategories = useReorderCategories();
  const createTag = useCreateTag();
  const archiveTag = useArchiveTag();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [tagInputValue, setTagInputValue] = useState('');
  const [optimisticallyRemovedIds, setOptimisticallyRemovedIds] = useState<
    Set<string>
  >(new Set());
  const anchor = useComboboxAnchor();

  const visibleTags = tags.filter((t) => !optimisticallyRemovedIds.has(t.id));
  const visibleTagNames = visibleTags.map((t) => t.name);
  const createOption =
    tagInputValue.length > 0 &&
    !visibleTags.some(
      (t) => t.name.toLowerCase() === tagInputValue.toLowerCase()
    )
      ? `__create__${tagInputValue}`
      : null;

  const handleReorder = (newOrder: Category[]) => {
    reorderCategories.mutate(newOrder.map((c) => c.id));
  };

  const openCreateDialog = useCallback(() => {
    setEditingCategory(null);
    setDialogOpen(true);
  }, []);

  const openEditDialog = useCallback((category: Category) => {
    setEditingCategory(category);
    setDialogOpen(true);
  }, []);

  const handleDialogOpenChange = useCallback((open: boolean) => {
    setDialogOpen(open);
    if (!open) {
      setEditingCategory(null);
    }
  }, []);

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
          <Button type="button" size="sm" onClick={openCreateDialog}>
            Add category
          </Button>
        </div>

        <CategoriesList
          isLoading={catLoading}
          categories={categories}
          onReorder={handleReorder}
          onEdit={openEditDialog}
          onArchive={(id) => archiveCategory.mutate(id)}
        />
      </section>

      <section className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <Text as="h2" variant="label" className="font-semibold">
            Tags
          </Text>
        </div>

        {tagLoading ? (
          <Skeleton className="h-9" />
        ) : (
          <Combobox
            multiple
            items={visibleTagNames}
            filteredItems={createOption ? [createOption] : []}
            value={visibleTagNames}
            onValueChange={(newValues) => {
              const removed = visibleTagNames.filter(
                (n) => !newValues.includes(n)
              );
              for (const name of removed) {
                const tag = visibleTags.find((t) => t.name === name);
                if (!tag) continue;
                setOptimisticallyRemovedIds(
                  (prev) => new Set([...prev, tag.id])
                );
                archiveTag.mutate(tag.id, {
                  onError: () =>
                    setOptimisticallyRemovedIds((prev) => {
                      const next = new Set(prev);
                      next.delete(tag.id);
                      return next;
                    }),
                });
              }
              const created = newValues.find((v) => v.startsWith('__create__'));
              if (created) {
                createTag.mutate(
                  { name: created.replace('__create__', '') },
                  { onSuccess: () => setTagInputValue('') }
                );
              }
            }}
            onInputValueChange={setTagInputValue}
          >
            <ComboboxChips ref={anchor}>
              <ComboboxValue>
                {(selectedValue: string[] | null) => (
                  <>
                    {(selectedValue ?? []).map((name) => (
                      <ComboboxChip key={name}>{name}</ComboboxChip>
                    ))}
                    <ComboboxChipsInput
                      placeholder={
                        visibleTagNames.length === 0 ? 'Add a tag…' : ''
                      }
                    />
                  </>
                )}
              </ComboboxValue>
            </ComboboxChips>
            <ComboboxContent anchor={anchor}>
              <ComboboxList>
                {(item: string) => (
                  <ComboboxItem key={item} value={item}>
                    {item.startsWith('__create__')
                      ? `Create "${item.replace('__create__', '')}"`
                      : item}
                  </ComboboxItem>
                )}
              </ComboboxList>
              <ComboboxEmpty>
                {tagInputValue.length === 0
                  ? 'Type to create a tag'
                  : 'Tag already exists'}
              </ComboboxEmpty>
            </ComboboxContent>
          </Combobox>
        )}
      </section>

      <CategoryDialog
        open={dialogOpen}
        onOpenChange={handleDialogOpenChange}
        category={editingCategory}
      />
    </div>
  );
};
