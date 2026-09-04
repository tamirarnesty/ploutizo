import { Field, FieldLabel } from '@ploutizo/ui/components/field';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@ploutizo/ui/components/select';
import { IMPORT_CUSTOM_MAPPING_DATE_FORMATS } from '../importFormatChoice';
import { ImportColumnSelect } from './ImportColumnSelect';
import { ImportDebitCreditAmountFields } from './ImportDebitCreditAmountFields';
import { ImportSignedAmountFields } from './ImportSignedAmountFields';
import type { ImportFormatFormApi } from './importFormatForm';

type ImportCustomMappingFieldsProps = {
  form: ImportFormatFormApi;
  columns: string[];
};

export const ImportCustomMappingFields = ({
  form,
  columns,
}: ImportCustomMappingFieldsProps) => (
  <div className="grid gap-4 sm:grid-cols-2">
    <form.AppField name="dateColumn">
      {(field) => (
        <ImportColumnSelect
          id="import-dateColumn"
          label="Date column"
          value={field.state.value}
          onValueChange={field.handleChange}
          columns={columns}
        />
      )}
    </form.AppField>
    <form.AppField name="dateFormat">
      {(field) => (
        <Field>
          <FieldLabel htmlFor="import-date-format">Date format</FieldLabel>
          <Select
            value={field.state.value}
            onValueChange={(value) => {
              if (value) field.handleChange(value);
            }}
          >
            <SelectTrigger id="import-date-format">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                {IMPORT_CUSTOM_MAPPING_DATE_FORMATS.map((format) => (
                  <SelectItem key={format} value={format}>
                    {format}
                  </SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>
        </Field>
      )}
    </form.AppField>
    <form.AppField name="descriptionColumn">
      {(field) => (
        <ImportColumnSelect
          id="import-descriptionColumn"
          label="Description column"
          value={field.state.value}
          onValueChange={field.handleChange}
          columns={columns}
        />
      )}
    </form.AppField>
    <form.AppField name="amountKind">
      {(field) => (
        <Field>
          <FieldLabel htmlFor="import-amount-kind">Amount columns</FieldLabel>
          <Select
            value={field.state.value}
            onValueChange={(value) => {
              if (value) field.handleChange(value);
            }}
          >
            <SelectTrigger id="import-amount-kind">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                <SelectItem value="signed">Single amount column</SelectItem>
                <SelectItem value="debit_credit">
                  Separate debit and credit
                </SelectItem>
              </SelectGroup>
            </SelectContent>
          </Select>
        </Field>
      )}
    </form.AppField>
    <form.Subscribe selector={(state) => state.values.amountKind}>
      {(amountKind) =>
        amountKind === 'signed' ? (
          <ImportSignedAmountFields form={form} columns={columns} />
        ) : (
          <ImportDebitCreditAmountFields form={form} columns={columns} />
        )
      }
    </form.Subscribe>
    <form.AppField name="externalIdColumn">
      {(field) => (
        <ImportColumnSelect
          id="import-externalIdColumn"
          label="External ID column"
          value={field.state.value}
          onValueChange={field.handleChange}
          columns={columns}
          allowNone
        />
      )}
    </form.AppField>
  </div>
);
