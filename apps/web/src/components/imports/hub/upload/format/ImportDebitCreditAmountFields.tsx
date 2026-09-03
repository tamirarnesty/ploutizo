import { ImportColumnSelect } from './ImportColumnSelect';
import type { ImportFormatFormApi } from './importFormatForm';

type ImportDebitCreditAmountFieldsProps = {
  form: ImportFormatFormApi;
  columns: string[];
};

export const ImportDebitCreditAmountFields = ({
  form,
  columns,
}: ImportDebitCreditAmountFieldsProps) => (
  <>
    <form.AppField name="debitColumn">
      {(field) => (
        <ImportColumnSelect
          id="import-debitColumn"
          label="Debit column"
          value={field.state.value}
          onValueChange={field.handleChange}
          columns={columns}
        />
      )}
    </form.AppField>
    <form.AppField name="creditColumn">
      {(field) => (
        <ImportColumnSelect
          id="import-creditColumn"
          label="Credit column"
          value={field.state.value}
          onValueChange={field.handleChange}
          columns={columns}
        />
      )}
    </form.AppField>
  </>
);
