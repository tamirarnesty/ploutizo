import { nextCategoryColour } from '@ploutizo/types';
import { CategoryFormSchema } from '@ploutizo/validators';
import { Button } from '@ploutizo/ui/components/button';
import { Input } from '@ploutizo/ui/components/input';
import { DialogFooter } from '@ploutizo/ui/components/dialog';
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from '@ploutizo/ui/components/field';
import type {
  Category,
  CategoryForm as CategoryFormType,
} from '@ploutizo/validators';
import {
  schemaSubmitValidator,
  useEntityForm,
} from '@/lib/forms/useEntityForm';
import { FormSubmitError } from '@/components/FormSubmitError';
import {
  useCreateCategory,
  useGetCategories,
  useUpdateCategory,
} from '@/lib/data-access/categories';
import { ColourTokenPicker } from '@/components/colour/ColourTokenPicker';
import { LucideIconPicker } from '@/components/categories/LucideIconPicker';

interface CategoryFormProps {
  category: Category | null;
  onClose: () => void;
}

export const CategoryForm = ({ category, onClose }: CategoryFormProps) => {
  const isEditing = category !== null;
  const createCategory = useCreateCategory();
  const updateCategory = useUpdateCategory(category?.id ?? '');
  const { data: categories = [] } = useGetCategories();

  const { form } = useEntityForm<CategoryFormType, CategoryFormType>({
    defaultValues: {
      name: category?.name ?? '',
      icon: category?.icon ?? undefined,
      // New categories start on the first palette colour no other category uses yet.
      colour:
        category?.colour ??
        nextCategoryColour(categories.map((existing) => existing.colour)),
    },
    validate: schemaSubmitValidator(CategoryFormSchema),
    toPayload: (value) => ({
      name: value.name.trim(),
      icon: value.icon ?? undefined,
      colour: value.colour,
    }),
    create: createCategory,
    update: updateCategory,
    isEditing,
    onClose,
  });

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        form.handleSubmit();
      }}
    >
      <FieldGroup>
        <form.AppField
          name="name"
          validators={{ onChange: CategoryFormSchema.shape.name }}
        >
          {(field) => (
            <Field
              data-invalid={field.state.meta.errors.length > 0 || undefined}
            >
              <FieldLabel htmlFor="category-name">Name</FieldLabel>
              <Input
                id="category-name"
                autoComplete="off"
                autoFocus // Primary input in a dialog opened by user action — autoFocus is intentional
                value={field.state.value}
                onChange={(e) => field.handleChange(e.target.value)}
                onBlur={field.handleBlur}
                aria-invalid={field.state.meta.errors.length > 0}
              />
              {field.state.meta.errors.length > 0 ? (
                <FieldError
                  errors={field.state.meta.errors as { message?: string }[]}
                />
              ) : null}
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
              <ColourTokenPicker
                value={field.state.value}
                onChange={(v) => field.handleChange(v)}
              />
            </Field>
          )}
        </form.AppField>
      </FieldGroup>

      <FormSubmitError form={form} />

      <DialogFooter className="mt-4">
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
  );
};
