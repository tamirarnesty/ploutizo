import { Text } from '@ploutizo/ui/components/text'
import { Field, FieldLabel } from '@ploutizo/ui/components/field'
import { Input } from '@ploutizo/ui/components/input'
import type { TransactionFormInstance } from './hooks/useTransactionForm'

export interface IncomeFieldsProps {
  form: TransactionFormInstance
}

/** Income source field — rendered below the Type+IncomeType grid row */
export const IncomeFields = ({ form }: IncomeFieldsProps) => (
  <form.AppField name="incomeSource">
    {(field) => (
      <Field>
        <FieldLabel htmlFor="tx-incomeSource">
          Income source
          <Text as="span" variant="body-sm" className="font-normal text-muted-foreground">
            (optional)
          </Text>
        </FieldLabel>
        <Input
          id="tx-incomeSource"
          autoComplete="off"
          value={field.state.value}
          onChange={(e) => field.handleChange(e.target.value)}
          onBlur={field.handleBlur}
        />
      </Field>
    )}
  </form.AppField>
)
