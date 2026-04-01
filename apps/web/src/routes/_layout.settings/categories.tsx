import { createFileRoute } from '@tanstack/react-router'
import { useState } from 'react'
import { useCategories, useCreateCategory, useUpdateCategory, useArchiveCategory, useReorderCategories, type Category } from '../../hooks/use-categories.js'
import { useTags, useCreateTag, useArchiveTag } from '../../hooks/use-tags.js'
import { LucideIconPicker, renderLucideIcon } from '../../components/categories/icon-picker.js'
import { ColourPicker } from '../../components/categories/colour-picker.js'
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
} from '@ploutizo/ui/components/alert-dialog'
import { GripVertical } from 'lucide-react'
import { Sortable, SortableItem, SortableItemHandle } from '@ploutizo/ui/components/reui/sortable'
import {
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
  ComboboxTrigger,
} from '@ploutizo/ui/components/reui/combobox'

export const Route = createFileRoute('/_layout/settings/categories')({
  component: CategoriesSettingsPage,
})

// Category Dialog (create/edit)
function CategoryDialog({
  category,
  onClose,
}: {
  category: Category | null
  onClose: () => void
}) {
  const isEditing = category !== null
  const createCategory = useCreateCategory()
  const updateCategory = useUpdateCategory(category?.id ?? '')

  const [name, setName] = useState(category?.name ?? '')
  const [icon, setIcon] = useState<string | null>(category?.icon ?? null)
  const [colour, setColour] = useState<string | null>(category?.colour ?? null)
  const [nameError, setNameError] = useState('')
  const [mutationError, setMutationError] = useState('')

  const handleSave = () => {
    if (!name.trim()) { setNameError('Category name is required.'); return }
    setNameError(''); setMutationError('')
    const payload = { name: name.trim(), icon: icon ?? undefined, colour: colour ?? undefined }
    if (isEditing) {
      updateCategory.mutate(payload, {
        onSuccess: onClose,
        onError: () => setMutationError("Couldn't save changes. Check your connection and try again."),
      })
    } else {
      createCategory.mutate(payload, {
        onSuccess: onClose,
        onError: () => setMutationError("Couldn't save changes. Check your connection and try again."),
      })
    }
  }

  const isSaving = createCategory.isPending || updateCategory.isPending

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      onClick={onClose}
    >
      <div
        className="bg-card rounded-lg shadow-xl w-full max-w-sm mx-4 p-6 space-y-4"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-base font-semibold">{isEditing ? 'Edit category' : 'Add category'}</h2>

        <div className="space-y-1">
          <label className="text-xs font-medium">Name</label>
          <input
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full h-9 px-3 text-sm border border-input rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-ring/50"
          />
          {nameError && <p className="text-xs text-destructive">{nameError}</p>}
        </div>

        <div className="space-y-1">
          <label className="text-xs font-medium">Icon</label>
          <LucideIconPicker value={icon} onChange={setIcon} />
        </div>

        <div className="space-y-1">
          <label className="text-xs font-medium">Colour</label>
          <ColourPicker value={colour} onChange={setColour} />
        </div>

        {mutationError && <p className="text-xs text-destructive">{mutationError}</p>}

        <div className="flex justify-end gap-2 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="h-9 px-4 text-sm border border-border rounded-md hover:bg-muted"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={isSaving}
            className="h-9 px-4 text-sm bg-primary text-primary-foreground rounded-md hover:bg-primary/90 disabled:opacity-50"
          >
            Save category
          </button>
        </div>
      </div>
    </div>
  )
}

function CategoriesSettingsPage() {
  const { data: categories = [], isLoading: catLoading } = useCategories()
  const { data: tags = [], isLoading: tagLoading } = useTags()
  const archiveCategory = useArchiveCategory()
  const reorderCategories = useReorderCategories()
  const createTag = useCreateTag()
  const archiveTag = useArchiveTag()

  // false = dialog closed, null = create mode, Category = edit mode
  const [dialogCategory, setDialogCategory] = useState<Category | null | false>(false)
  const [tagInputValue, setTagInputValue] = useState('')

  // Locally manage category order for optimistic reorder UX
  const [localCategories, setLocalCategories] = useState<Category[]>([])
  if (!catLoading && localCategories.length === 0 && categories.length > 0) {
    setLocalCategories(categories)
  }

  const handleReorder = (newOrder: Category[]) => {
    setLocalCategories(newOrder)
    reorderCategories.mutate(newOrder.map((c) => c.id))
  }

  const displayCategories = localCategories.length > 0 ? localCategories : categories

  return (
    <div className="space-y-8 max-w-2xl">
      <h1 className="text-xl font-semibold font-[--font-heading]">Categories &amp; Tags</h1>

      {/* Categories section */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold">Categories</h2>
          <button
            type="button"
            onClick={() => setDialogCategory(null)}
            className="h-8 px-3 text-xs bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
          >
            Add category
          </button>
        </div>

        {catLoading ? (
          <div className="space-y-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-10 bg-muted rounded animate-pulse" />
            ))}
          </div>
        ) : displayCategories.length === 0 ? (
          <p className="text-sm text-muted-foreground">No categories found.</p>
        ) : (
          <>
            <p className="text-xs text-muted-foreground">Drag to reorder categories.</p>
            <Sortable
              value={displayCategories}
              onValueChange={handleReorder}
              getItemValue={(c) => c.id}
              strategy="vertical"
            >
              {displayCategories.map((cat) => (
                <SortableItem key={cat.id} value={cat.id}>
                  <div className="flex items-center gap-3 py-2 px-3 rounded-md border border-border bg-card">
                    <SortableItemHandle aria-label="Drag to reorder" className="cursor-grab text-muted-foreground hover:text-foreground">
                      <GripVertical size={16} />
                    </SortableItemHandle>
                    <span className="text-muted-foreground">{renderLucideIcon(cat.icon, 16)}</span>
                    {cat.colour && (
                      <span
                        className={`size-3 rounded-full bg-${cat.colour} shrink-0`}
                      />
                    )}
                    <span className="flex-1 text-sm">{cat.name}</span>
                    <button
                      type="button"
                      onClick={() => setDialogCategory(cat)}
                      className="text-xs text-muted-foreground hover:text-foreground px-2 py-1"
                    >
                      Edit
                    </button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <button
                          type="button"
                          className="text-xs text-muted-foreground hover:text-destructive px-2 py-1"
                        >
                          Archive
                        </button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Archive category?</AlertDialogTitle>
                          <AlertDialogDescription>
                            Transactions using this category will not be affected.
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

        {/* Tag inline creation via Combobox — D-20 */}
        <Combobox
          value=""
          onValueChange={(selectedValue) => {
            if (selectedValue.startsWith('__create__')) {
              const name = selectedValue.replace('__create__', '')
              createTag.mutate(
                { name },
                { onSuccess: () => setTagInputValue('') },
              )
            }
            // Selecting an existing tag: tag already exists — no action needed on this page
            // (the combobox is for creating tags; existing tags are shown in the pill list below)
          }}
        >
          <ComboboxTrigger className="w-full max-w-sm h-9 px-3 text-sm text-left">
            {tagInputValue || 'Search or create a tag…'}
          </ComboboxTrigger>
          <ComboboxContent>
            <ComboboxInput
              placeholder="Search tags…"
              value={tagInputValue}
              onValueChange={setTagInputValue}
            />
            <ComboboxList>
              {tags
                .filter((t) =>
                  tagInputValue
                    ? t.name.toLowerCase().includes(tagInputValue.toLowerCase())
                    : true,
                )
                .map((tag) => (
                  <ComboboxItem key={tag.id} value={tag.id}>
                    {tag.name}
                  </ComboboxItem>
                ))}
              {tagInputValue &&
                !tags.some(
                  (t) => t.name.toLowerCase() === tagInputValue.toLowerCase(),
                ) && (
                  <ComboboxItem value={`__create__${tagInputValue}`}>
                    Create &ldquo;{tagInputValue}&rdquo;
                  </ComboboxItem>
                )}
              <ComboboxEmpty>No tags found</ComboboxEmpty>
            </ComboboxList>
          </ComboboxContent>
        </Combobox>

        {tagLoading ? (
          <div className="space-y-2">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-8 bg-muted rounded animate-pulse" />
            ))}
          </div>
        ) : tags.length === 0 ? (
          <div className="space-y-1">
            <p className="text-sm font-medium text-muted-foreground">No tags yet</p>
            <p className="text-xs text-muted-foreground">
              Tags appear here when you create them during a transaction.
            </p>
          </div>
        ) : (
          <div className="flex flex-wrap gap-2">
            {tags.map((tag) => (
              <div
                key={tag.id}
                className="flex items-center gap-1 px-3 py-1 rounded-full bg-muted text-sm"
              >
                <span>{tag.name}</span>
                <button
                  type="button"
                  onClick={() => archiveTag.mutate(tag.id)}
                  className="text-muted-foreground hover:text-destructive ml-1 text-xs"
                  aria-label={`Archive tag ${tag.name}`}
                >
                  &times;
                </button>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Category dialog */}
      {dialogCategory !== false && (
        <CategoryDialog
          category={dialogCategory}
          onClose={() => setDialogCategory(false)}
        />
      )}
    </div>
  )
}
