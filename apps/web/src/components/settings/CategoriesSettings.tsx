import { useEffect, useState } from "react"
import { Skeleton } from "@ploutizo/ui/components/skeleton"
import { Text } from "@ploutizo/ui/components/text"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@ploutizo/ui/components/alert-dialog"
import { GripVertical } from "lucide-react"
import {
  Sortable,
  SortableItem,
  SortableItemHandle,
} from "@ploutizo/ui/components/reui/sortable"
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
} from "@ploutizo/ui/components/combobox"
import { Button } from "@ploutizo/ui/components/button"
import { CategoryDialog } from "./CategoryDialog"
import type { Category } from "@/lib/data-access/categories"
import { renderLucideIcon } from "@/components/categories/LucideIconPicker"
import { useArchiveTag, useCreateTag, useGetTags } from "@/lib/data-access/tags"
import {
  useArchiveCategory,
  useGetCategories,
  useReorderCategories,
} from "@/lib/data-access/categories"

export const CategoriesSettings = () => {
  const { data: categories = [], isLoading: catLoading } = useGetCategories()
  const { data: tags = [], isLoading: tagLoading } = useGetTags()
  const archiveCategory = useArchiveCategory()
  const reorderCategories = useReorderCategories()
  const createTag = useCreateTag()
  const archiveTag = useArchiveTag()

  // false = dialog closed, null = create mode, Category = edit mode
  const [dialogCategory, setDialogCategory] = useState<Category | null | false>(
    false
  )
  const [tagInputValue, setTagInputValue] = useState("")
  const [optimisticallyRemovedIds, setOptimisticallyRemovedIds] = useState<
    Set<string>
  >(new Set())
  const anchor = useComboboxAnchor()

  const visibleTags = tags.filter((t) => !optimisticallyRemovedIds.has(t.id))
  const visibleTagNames = visibleTags.map((t) => t.name)
  const createOption =
    tagInputValue.length > 0 &&
    !visibleTags.some(
      (t) => t.name.toLowerCase() === tagInputValue.toLowerCase()
    )
      ? `__create__${tagInputValue}`
      : null

  // Locally manage category order for optimistic reorder UX
  const [localCategories, setLocalCategories] = useState<Category[]>([])
  useEffect(() => {
    if (!catLoading && categories.length > 0) {
      setLocalCategories(categories)
    }
  }, [categories, catLoading])

  const handleReorder = (newOrder: Category[]) => {
    setLocalCategories(newOrder)
    reorderCategories.mutate(newOrder.map((c) => c.id))
  }

  const displayCategories =
    localCategories.length > 0 ? localCategories : categories

  return (
    <div className="max-w-2xl space-y-8">
      <Text as="h1" variant="h3">Categories &amp; Tags</Text>

      {/* Categories section */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <Text as="h2" variant="label" className="font-semibold">Categories</Text>
          <Button
            type="button"
            size="sm"
            onClick={() => setDialogCategory(null)}
          >
            Add category
          </Button>
        </div>

        {catLoading ? (
          <div className="space-y-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-10" />
            ))}
          </div>
        ) : displayCategories.length === 0 ? (
          <Text variant="body-sm" className="text-muted-foreground">No categories found.</Text>
        ) : (
          <>
            <Text variant="caption">
              Drag to reorder categories.
            </Text>
            <Sortable
              value={displayCategories}
              onValueChange={handleReorder}
              getItemValue={(c) => c.id}
              strategy="vertical"
              className="space-y-2"
            >
              {displayCategories.map((cat) => (
                <SortableItem key={cat.id} value={cat.id}>
                  <div className="flex items-center gap-3 rounded-md border border-border bg-card px-3 py-2">
                    <SortableItemHandle
                      aria-label="Drag to reorder"
                      className="cursor-grab text-muted-foreground hover:text-foreground"
                    >
                      <GripVertical size={16} />
                    </SortableItemHandle>
                    <div className="text-muted-foreground">
                      {renderLucideIcon(cat.icon, 16)}
                    </div>
                    {cat.colour ? (
                      <div
                        className={`size-3 rounded-full bg-${cat.colour} shrink-0`}
                      />
                    ) : null}
                    <Text as="span" variant="body-sm" className="min-w-0 flex-1 truncate">
                      {cat.name}
                    </Text>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setDialogCategory(cat)}
                      className="text-muted-foreground"
                    >
                      Edit
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger
                        render={
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="text-muted-foreground hover:text-destructive"
                          />
                        }
                      >
                        Archive
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Archive category?</AlertDialogTitle>
                          <AlertDialogDescription>
                            Transactions using this category will not be
                            affected.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction
                            variant="destructive"
                            onClick={() => archiveCategory.mutate(cat.id)}
                          >
                            Archive category
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </SortableItem>
              ))}
            </Sortable>
          </>
        )}
      </section>

      {/* Tags section */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <Text as="h2" variant="label" className="font-semibold">Tags</Text>
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
              )
              for (const name of removed) {
                const tag = visibleTags.find((t) => t.name === name)
                if (!tag) continue
                setOptimisticallyRemovedIds(
                  (prev) => new Set([...prev, tag.id])
                )
                archiveTag.mutate(tag.id, {
                  onError: () =>
                    setOptimisticallyRemovedIds((prev) => {
                      const next = new Set(prev)
                      next.delete(tag.id)
                      return next
                    }),
                })
              }
              const created = newValues.find((v) => v.startsWith("__create__"))
              if (created) {
                createTag.mutate(
                  { name: created.replace("__create__", "") },
                  { onSuccess: () => setTagInputValue("") }
                )
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
                        visibleTagNames.length === 0 ? "Add a tag…" : ""
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
                    {item.startsWith("__create__")
                      ? `Create "${item.replace("__create__", "")}"`
                      : item}
                  </ComboboxItem>
                )}
              </ComboboxList>
              <ComboboxEmpty>
                {tagInputValue.length === 0
                  ? "Type to create a tag"
                  : "Tag already exists"}
              </ComboboxEmpty>
            </ComboboxContent>
          </Combobox>
        )}
      </section>

      {/* Category dialog */}
      {dialogCategory !== false ? (
        <CategoryDialog
          category={dialogCategory}
          onClose={() => setDialogCategory(false)}
        />
      ) : null}
    </div>
  )
}
