import { Field, FieldError, FieldLabel } from '@ploutizo/ui/components/field'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@ploutizo/ui/components/select'
import type { Category } from '@/lib/data-access/categories'
import type { TransactionFormInstance } from './hooks/useTransactionForm'

export interface ExpenseFieldsProps {
  form: TransactionFormInstance
  categories: Category[]
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
          value={field.state.value}
          onValueChange={(v) => {
            if (v !== null) field.handleChange(v)
          }}
        >
          <SelectTrigger id="tx-categoryId">
            <SelectValue>
              {categories.find((c) => c.id === field.state.value)?.name ?? 'Select category'}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            {categories.map((c) => (
              <SelectItem key={c.id} value={c.id}>
                {c.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {field.state.meta.errors.length > 0 ? (
          <FieldError>{String(field.state.meta.errors[0])}</FieldError>
        ) : null}
      </Field>
    )}
  </form.AppField>
)
