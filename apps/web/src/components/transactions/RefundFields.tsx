import { Field, FieldError, FieldLabel } from '@ploutizo/ui/components/field';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@ploutizo/ui/components/select';
import type { Category } from '@/lib/data-access/categories';
import { RefundLinker } from './RefundLinker';
import type { AssigneeFormRow } from './types';
import type { TransactionFormInstance } from './hooks/useTransactionForm';

export interface RefundFieldsProps {
  form: TransactionFormInstance;
  categories: Category[];
  onAssigneesChange: (assignees: AssigneeFormRow[]) => void;
}

export const RefundFields = ({
  form,
  categories,
  onAssigneesChange,
}: RefundFieldsProps) => (
  <>
    <form.AppField
      name="categoryId"
      validators={{
        onSubmit: ({ value }: { value: string }) =>
          !value ? 'Category is required for refund transactions.' : undefined,
      }}
    >
      {(field) => (
        <Field data-invalid={field.state.meta.errors.length > 0 || undefined}>
          <FieldLabel htmlFor="tx-refund-categoryId">Category</FieldLabel>
          <Select
            value={field.state.value}
            onValueChange={(v) => {
              if (v !== null) field.handleChange(v);
            }}
          >
            <SelectTrigger id="tx-refund-categoryId">
              <SelectValue>
                {categories.find((c) => c.id === field.state.value)?.name ??
                  'Select category'}
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
            <FieldError
              errors={
                field.state.meta.errors as unknown as { message?: string }[]
              }
            />
          ) : null}
        </Field>
      )}
    </form.AppField>
    <RefundLinker form={form} onAssigneesChange={onAssigneesChange} />
  </>
);
