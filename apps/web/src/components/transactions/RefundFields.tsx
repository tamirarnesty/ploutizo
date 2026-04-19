import { Text } from '@ploutizo/ui/components/text'
import { Field, FieldLabel } from '@ploutizo/ui/components/field'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@ploutizo/ui/components/select'
import { RefundLinker } from './RefundLinker'
import type { Category } from '@/lib/data-access/categories'
import type { AssigneeFormRow } from './types'
import type { TransactionFormInstance } from './hooks/useTransactionForm'

export interface RefundFieldsProps {
  form: TransactionFormInstance
  categories: Category[]
  onAssigneesChange: (assignees: AssigneeFormRow[]) => void
}

export const RefundFields = ({ form, categories, onAssigneesChange }: RefundFieldsProps) => (
  <>
    <form.AppField name="categoryId">
      {(field) => (
        <Field>
          <FieldLabel htmlFor="tx-refund-categoryId">
            Category
            <Text as="span" variant="body-sm" className="ml-1 font-normal text-muted-foreground">
              (optional)
            </Text>
          </FieldLabel>
          <Select
            value={field.state.value}
            onValueChange={(v) => {
              if (v !== null) field.handleChange(v)
            }}
          >
            <SelectTrigger id="tx-refund-categoryId">
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
        </Field>
      )}
    </form.AppField>
    <RefundLinker form={form} onAssigneesChange={onAssigneesChange} />
  </>
)
