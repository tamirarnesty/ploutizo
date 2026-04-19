import { Text } from '@ploutizo/ui/components/text'
import { Field, FieldLabel } from '@ploutizo/ui/components/field'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@ploutizo/ui/components/select'
import type { TransactionFormInstance } from './hooks/useTransactionForm'

const INVESTMENT_TYPE_LABELS: Record<string, string> = {
  tfsa: 'TFSA',
  rrsp: 'RRSP',
  fhsa: 'FHSA',
  resp: 'RESP',
  non_registered: 'Non-registered',
  other: 'Other',
}

export interface ContributionFieldsProps {
  form: TransactionFormInstance
}

export const ContributionFields = ({ form }: ContributionFieldsProps) => (
  <form.AppField name="investmentType">
    {(field) => (
      <Field>
        <FieldLabel htmlFor="tx-investmentType">
          Investment type
          <Text as="span" variant="body-sm" className="font-normal text-muted-foreground">
            (optional)
          </Text>
        </FieldLabel>
        <Select
          value={field.state.value}
          onValueChange={(v) => {
            if (v !== null) field.handleChange(v)
          }}
        >
          <SelectTrigger id="tx-investmentType">
            <SelectValue>{INVESTMENT_TYPE_LABELS[field.state.value] ?? 'Select type'}</SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="tfsa">TFSA</SelectItem>
            <SelectItem value="rrsp">RRSP</SelectItem>
            <SelectItem value="fhsa">FHSA</SelectItem>
            <SelectItem value="resp">RESP</SelectItem>
            <SelectItem value="non_registered">Non-registered</SelectItem>
            <SelectItem value="other">Other</SelectItem>
          </SelectContent>
        </Select>
      </Field>
    )}
  </form.AppField>
)
