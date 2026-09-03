import { Checkbox } from '@ploutizo/ui/components/checkbox';
import { Field, FieldLabel } from '@ploutizo/ui/components/field';
import { ImportColumnSelect } from './ImportColumnSelect';
import type { ImportFormatFormApi } from './importFormatForm';

type ImportSignedAmountFieldsProps = {
  form: ImportFormatFormApi;
  columns: string[];
};

export const ImportSignedAmountFields = ({
  form,
  columns,
}: ImportSignedAmountFieldsProps) => (
  <>
    <form.AppField name="amountColumn">
      {(field) => (
        <ImportColumnSelect
          id="import-amountColumn"
          label="Amount column"
          value={field.state.value}
          onValueChange={field.handleChange}
          columns={columns}
        />
      )}
    </form.AppField>
    <form.AppField name="positiveIsExpense">
      {(field) => (
        <Field orientation="horizontal">
          <Checkbox
            id="import-positive-expense"
            checked={field.state.value}
            onCheckedChange={(checked) => {
              field.handleChange(checked === true);
            }}
          />
          <FieldLabel htmlFor="import-positive-expense">
            Positive amounts are expenses
          </FieldLabel>
        </Field>
      )}
    </form.AppField>
  </>
);
