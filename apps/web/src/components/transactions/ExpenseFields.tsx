import { Field, FieldError, FieldLabel } from '@ploutizo/ui/components/field';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@ploutizo/ui/components/select';
import type { Category } from '@/lib/data-access/categories';
import type { TransactionFormInstance } from './hooks/useTransactionForm';

export interface ExpenseFieldsProps {
  form: TransactionFormInstance;
  categories: Category[];
}

export const ExpenseFields = ({ form, categories }: ExpenseFieldsProps) => (
  <form.AppField
    name="categoryId"
    validators={{
      onSubmit: ({ value }: { value: string }) =>
        !value ? 'Category is required for expense transactions.' : undefined,
    }}
  >
    {(field) => (
      <Field data-invalid={field.state.meta.errors.length > 0 || undefined}>
        <FieldLabel htmlFor="tx-categoryId">Category</FieldLabel>
        <Select
          items={categories.map((category) => ({
            label: category.name,
            value: category.id,
          }))}
          value={field.state.value}
          onValueChange={(v) => {
            if (v !== null) field.handleChange(v);
          }}
        >
          <SelectTrigger id="tx-categoryId">
            <SelectValue>
              {(selected: string) =>
                categories.find((category) => category.id === selected)?.name ??
                'Select category'
              }
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              {categories.map((category) => (
                <SelectItem key={category.id} value={category.id}>
                  {category.name}
                </SelectItem>
              ))}
            </SelectGroup>
          </SelectContent>
        </Select>
        {field.state.meta.errors.length > 0 ? (
          <FieldError
            errors={
              field.state.meta.errors as unknown as { message?: string }[]
            }
          />
        ) : null}
      </Field>
    )}
  </form.AppField>
);
