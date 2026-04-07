import { CategoryFormSchema } from "@ploutizo/validators"
import { useAppForm } from "@ploutizo/ui/components/form"
import { Button } from "@ploutizo/ui/components/button"
import { Input } from "@ploutizo/ui/components/input"
import { DialogFooter } from "@ploutizo/ui/components/dialog"
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@ploutizo/ui/components/field"
import type { CategoryForm as CategoryFormType } from "@ploutizo/validators"
import type { Category } from "@/lib/data-access/categories"
import { useCreateCategory, useUpdateCategory } from "@/lib/data-access/categories"
import { ColourPicker } from "@/components/categories/ColourPicker"
import { LucideIconPicker } from "@/components/categories/LucideIconPicker"

interface CategoryFormProps {
  category: Category | null
  onClose: () => void
}

export const CategoryForm = ({ category, onClose }: CategoryFormProps) => {
  const isEditing = category !== null
  const createCategory = useCreateCategory()
  const updateCategory = useUpdateCategory(category?.id ?? "")

  const form = useAppForm({
    defaultValues: {
      name: category?.name ?? "",
      icon: category?.icon ?? undefined,
      colour: category?.colour ?? undefined,
    } satisfies CategoryFormType,
    validators: {
      onSubmit: ({ value }: { value: CategoryFormType }) => {
        const result = CategoryFormSchema.safeParse(value)
        if (!result.success) {
          return result.error.issues.map((i) => i.message).join(", ")
        }
      },
    },
    onSubmit: ({ value }) => {
      const payload = {
        name: value.name.trim(),
        icon: value.icon ?? undefined,
        colour: value.colour ?? undefined,
      }
      const mutation = isEditing ? updateCategory : createCategory
      mutation.mutate(payload, {
        onSuccess: onClose,
        onError: () =>
          form.setErrorMap({
            onSubmit: "Couldn't save changes. Check your connection and try again.",
          }),
      })
    },
  })

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault()
        form.handleSubmit()
      }}
    >
      <FieldGroup>
        <form.AppField
          name="name"
          validators={{ onChange: CategoryFormSchema.shape.name }}
        >
          {(field) => (
            <Field data-invalid={field.state.meta.errors.length > 0 || undefined}>
              <FieldLabel htmlFor="category-name">Name</FieldLabel>
              <Input
                id="category-name"
                autoFocus
                value={field.state.value}
                onChange={(e) => field.handleChange(e.target.value)}
                onBlur={field.handleBlur}
                aria-invalid={field.state.meta.errors.length > 0}
              />
              {field.state.meta.errors.length > 0 && (
                <FieldError>{field.state.meta.errors[0]?.toString()}</FieldError>
              )}
            </Field>
          )}
        </form.AppField>

        <form.AppField name="icon">
          {(field) => (
            <Field>
              <FieldLabel>Icon</FieldLabel>
              <LucideIconPicker
                value={field.state.value ?? null}
                onChange={(v) => field.handleChange(v)}
              />
            </Field>
          )}
        </form.AppField>

        <form.AppField name="colour">
          {(field) => (
            <Field>
              <FieldLabel>Colour</FieldLabel>
              <ColourPicker
                value={field.state.value ?? null}
                onChange={(v) => field.handleChange(v)}
              />
            </Field>
          )}
        </form.AppField>
      </FieldGroup>

      <form.Subscribe selector={(s) => s.errorMap.onSubmit}>
        {(err) =>
          err ? (
            <p className="text-xs text-destructive">{String(err)}</p>
          ) : null
        }
      </form.Subscribe>

      <DialogFooter>
        <Button variant="outline" type="button" onClick={onClose}>
          Cancel
        </Button>
        <form.Subscribe selector={(s) => s.isSubmitting}>
          {(isSubmitting) => (
            <Button type="submit" disabled={isSubmitting}>
              Save category
            </Button>
          )}
        </form.Subscribe>
      </DialogFooter>
    </form>
  )
}
