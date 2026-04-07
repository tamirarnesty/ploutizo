import { useEffect, useRef, useState } from "react"
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
} from "@ploutizo/ui/components/reui/combobox"
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

  // Locally manage category order for optimistic reorder UX
  const [localCategories, setLocalCategories] = useState<Array<Category>>([])
  const initialized = useRef<boolean>(false)
  useEffect(() => {
    if (!initialized.current && !catLoading && categories.length > 0) {
      initialized.current = true
      setLocalCategories(categories)
    }
  }, [categories, catLoading])

  const handleReorder = (newOrder: Array<Category>) => {
    setLocalCategories(newOrder)
    reorderCategories.mutate(newOrder.map((c) => c.id))
  }

  const displayCategories =
    localCategories.length > 0 ? localCategories : categories

  return (
    <div className="max-w-2xl space-y-8">
      <h1 className="font-heading text-xl font-semibold">
        Categories &amp; Tags
      </h1>

      {/* Categories section */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold">Categories</h2>
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
              <div key={i} className="h-10 motion-safe:animate-pulse rounded bg-muted" />
            ))}
          </div>
        ) : displayCategories.length === 0 ? (
          <p className="text-sm text-muted-foreground">No categories found.</p>
        ) : (
          <>
            <p className="text-xs text-muted-foreground">
              Drag to reorder categories.
            </p>
            <Sortable
              value={displayCategories}
              onValueChange={handleReorder}
              getItemValue={(c) => c.id}
              strategy="vertical"
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
                    <span className="text-muted-foreground">
                      {renderLucideIcon(cat.icon, 16)}
                    </span>
                    {cat.colour ? (
                      <span
                        className={`size-3 rounded-full bg-${cat.colour} shrink-0`}
                      />
                    ) : null}
                    <span className="min-w-0 flex-1 truncate text-sm">{cat.name}</span>
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
                      <AlertDialogTrigger asChild>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="text-muted-foreground hover:text-destructive"
                        >
                          Archive
                        </Button>
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
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
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
          <h2 className="text-sm font-semibold">Tags</h2>
        </div>

        {tagLoading ? (
          <div className="h-9 motion-safe:animate-pulse rounded-md bg-muted" />
        ) : (
          <Combobox
            value=""
            onValueChange={(selectedValue) => {
              if (selectedValue.startsWith("__create__")) {
                const name = selectedValue.replace("__create__", "")
                createTag.mutate(
                  { name },
                  { onSuccess: () => setTagInputValue("") }
                )
              }
            }}
          >
            <ComboboxChips>
              {tags.map((tag) => (
                <ComboboxChip
                  key={tag.id}
                  onRemove={() => archiveTag.mutate(tag.id)}
                >
                  {tag.name}
                </ComboboxChip>
              ))}
              <ComboboxChipsInput
                placeholder={tags.length === 0 ? "Add a tag…" : ""}
                value={tagInputValue}
                onValueChange={setTagInputValue}
                aria-label="Search or create a tag"
              />
            </ComboboxChips>
            <ComboboxContent>
              <ComboboxList>
                {(() => {
                  const filtered = tags.filter((t) =>
                    tagInputValue
                      ? t.name.toLowerCase().includes(tagInputValue.toLowerCase())
                      : true
                  )
                  const showCreate =
                    tagInputValue.length > 0 &&
                    !tags.some(
                      (t) => t.name.toLowerCase() === tagInputValue.toLowerCase()
                    )
                  const showEmpty = filtered.length === 0 && !showCreate
                  return (
                    <>
                      {filtered.map((tag) => (
                        <ComboboxItem key={tag.id} value={tag.id}>
                          {tag.name}
                        </ComboboxItem>
                      ))}
                      {showCreate ? (
                        <ComboboxItem value={`__create__${tagInputValue}`}>
                          Create &ldquo;{tagInputValue}&rdquo;
                        </ComboboxItem>
                      ) : null}
                      {showEmpty ? (
                        <ComboboxEmpty>No tags found</ComboboxEmpty>
                      ) : null}
                    </>
                  )
                })()}
              </ComboboxList>
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
