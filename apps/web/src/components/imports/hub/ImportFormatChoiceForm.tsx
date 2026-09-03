import { useAppForm } from '@ploutizo/ui/components/form';
import { Button } from '@ploutizo/ui/components/button';
import { Checkbox } from '@ploutizo/ui/components/checkbox';
import { Field, FieldLabel } from '@ploutizo/ui/components/field';
import { LoadingButton } from '@ploutizo/ui/components/loading-button';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@ploutizo/ui/components/select';
import { Text } from '@ploutizo/ui/components/text';
import { Upload } from 'lucide-react';
import {
  IMPORT_CONTENT_PROFILE_LABELS,
  IMPORT_CUSTOM_MAPPING_DATE_FORMATS,
} from '@ploutizo/types';
import type {
  ImportContentProfileId,
  ImportContentSelection,
  ImportCustomMappingDateFormat,
} from '@ploutizo/types';

const CUSTOM_FORMAT_CHOICE = 'custom';
const NONE_COLUMN = 'none';

type FormatChoice = ImportContentProfileId | typeof CUSTOM_FORMAT_CHOICE;

type AmountKind = 'signed' | 'debit_credit';

type ImportFormatChoiceFormProps = {
  candidateProfileIds: ImportContentProfileId[];
  columns: string[];
  sampleRows: string[][];
  submitting: boolean;
  error: string | null;
  onSubmit: (selection: ImportContentSelection) => void;
  onCancel: () => void;
};

const columnOrFirst = (columns: string[], index: number) =>
  columns.at(index) ?? columns.at(0) ?? '';

const findColumn = (
  columns: string[],
  pattern: RegExp,
  fallbackIndex: number
) =>
  columns.find((column) => pattern.test(column)) ??
  columnOrFirst(columns, fallbackIndex);

export const ImportFormatChoiceForm = ({
  candidateProfileIds,
  columns,
  sampleRows,
  submitting,
  error,
  onSubmit,
  onCancel,
}: ImportFormatChoiceFormProps) => {
  const form = useAppForm({
    defaultValues: {
      formatChoice: (candidateProfileIds[0] ??
        CUSTOM_FORMAT_CHOICE) as FormatChoice,
      dateColumn: findColumn(columns, /date|posted/i, 0),
      dateFormat: 'YYYY-MM-DD' as ImportCustomMappingDateFormat,
      descriptionColumn: findColumn(columns, /desc|memo|narration/i, 1),
      amountKind: 'signed' as AmountKind,
      amountColumn: findColumn(columns, /amount|total|sum/i, 2),
      positiveIsExpense: true,
      debitColumn: findColumn(columns, /debit/i, 2),
      creditColumn: findColumn(columns, /credit/i, 3),
      externalIdColumn: NONE_COLUMN,
    },
    onSubmit: ({ value }) => {
      if (value.formatChoice !== CUSTOM_FORMAT_CHOICE) {
        onSubmit({ kind: 'profile', profileId: value.formatChoice });
        return;
      }

      onSubmit({
        kind: 'mapping',
        mapping: {
          dateColumn: value.dateColumn,
          dateFormat: value.dateFormat,
          descriptionColumn: value.descriptionColumn,
          amount:
            value.amountKind === 'signed'
              ? {
                  kind: 'signed',
                  column: value.amountColumn,
                  positiveIsExpense: value.positiveIsExpense,
                }
              : {
                  kind: 'debit_credit',
                  debitColumn: value.debitColumn,
                  creditColumn: value.creditColumn,
                },
          ...(value.externalIdColumn !== NONE_COLUMN
            ? { externalIdColumn: value.externalIdColumn }
            : {}),
        },
      });
    },
  });

  const showFormatSelect = candidateProfileIds.length > 0;
  const hasColumns = columns.length > 0;

  return (
    <form
      className="space-y-4 rounded-md border border-border p-4"
      onSubmit={(event) => {
        event.preventDefault();
        form.handleSubmit();
      }}
    >
      <div>
        <Text as="h3" variant="h3">
          Choose import format
        </Text>
        <Text variant="body-sm" className="mt-1 text-muted-foreground">
          {showFormatSelect
            ? 'This file matches a known layout. Confirm the format, or map columns yourself.'
            : "This file wasn't automatically recognized. Map the columns that match your CSV."}
        </Text>
      </div>

      {showFormatSelect ? (
        <form.AppField name="formatChoice">
          {(field) => (
            <Field>
              <FieldLabel htmlFor="import-format">Format</FieldLabel>
              <Select
                value={field.state.value}
                onValueChange={(value) => {
                  if (value) field.handleChange(value as FormatChoice);
                }}
              >
                <SelectTrigger id="import-format">
                  <SelectValue placeholder="Select a format" />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    {candidateProfileIds.map((profileId) => (
                      <SelectItem key={profileId} value={profileId}>
                        {IMPORT_CONTENT_PROFILE_LABELS[profileId]}
                      </SelectItem>
                    ))}
                    <SelectItem value={CUSTOM_FORMAT_CHOICE}>
                      Custom mapping
                    </SelectItem>
                  </SelectGroup>
                </SelectContent>
              </Select>
            </Field>
          )}
        </form.AppField>
      ) : null}

      {sampleRows.length > 0 ? (
        <div className="overflow-x-auto rounded-md border border-border">
          <table className="w-full min-w-max text-left text-sm">
            <caption className="sr-only">CSV preview</caption>
            <thead>
              <tr className="border-b border-border bg-muted/40">
                {columns.map((column) => (
                  <th key={column} className="px-2 py-1.5 font-medium">
                    {column}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {sampleRows.map((row, rowIndex) => (
                <tr
                  key={rowIndex}
                  className="border-b border-border last:border-0"
                >
                  {columns.map((column, columnIndex) => (
                    <td key={`${rowIndex}-${column}`} className="px-2 py-1.5">
                      {row[columnIndex] ?? ''}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}

      <form.Subscribe selector={(state) => state.values.formatChoice}>
        {(formatChoice) =>
          formatChoice === CUSTOM_FORMAT_CHOICE && hasColumns ? (
            <div className="grid gap-4 sm:grid-cols-2">
              <form.AppField name="dateColumn">
                {(field) => (
                  <ColumnSelect
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
                    <FieldLabel htmlFor="import-date-format">
                      Date format
                    </FieldLabel>
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
                  <ColumnSelect
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
                    <FieldLabel htmlFor="import-amount-kind">
                      Amount columns
                    </FieldLabel>
                    <Select
                      value={field.state.value}
                      onValueChange={(value) => {
                        if (value) field.handleChange(value as AmountKind);
                      }}
                    >
                      <SelectTrigger id="import-amount-kind">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectGroup>
                          <SelectItem value="signed">
                            Single amount column
                          </SelectItem>
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
                    <>
                      <form.AppField name="amountColumn">
                        {(field) => (
                          <ColumnSelect
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
                  ) : (
                    <>
                      <form.AppField name="debitColumn">
                        {(field) => (
                          <ColumnSelect
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
                          <ColumnSelect
                            id="import-creditColumn"
                            label="Credit column"
                            value={field.state.value}
                            onValueChange={field.handleChange}
                            columns={columns}
                          />
                        )}
                      </form.AppField>
                    </>
                  )
                }
              </form.Subscribe>
              <form.AppField name="externalIdColumn">
                {(field) => (
                  <ColumnSelect
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
          ) : null
        }
      </form.Subscribe>

      {error ? (
        <Text variant="body-sm" className="text-destructive">
          {error}
        </Text>
      ) : null}

      <div className="flex gap-2">
        <LoadingButton
          type="submit"
          icon={<Upload />}
          loading={submitting}
          disabled={submitting}
        >
          Upload
        </LoadingButton>
        <Button
          type="button"
          variant="outline"
          disabled={submitting}
          onClick={onCancel}
        >
          Cancel
        </Button>
      </div>
    </form>
  );
};

const ColumnSelect = ({
  id,
  label,
  value,
  onValueChange,
  columns,
  allowNone = false,
}: {
  id: string;
  label: string;
  value: string;
  onValueChange: (value: string) => void;
  columns: string[];
  allowNone?: boolean;
}) => (
  <Field>
    <FieldLabel htmlFor={id}>{label}</FieldLabel>
    <Select
      value={value}
      onValueChange={(next) => {
        if (next) onValueChange(next);
      }}
    >
      <SelectTrigger id={id}>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectGroup>
          {allowNone ? <SelectItem value={NONE_COLUMN}>None</SelectItem> : null}
          {columns.map((column) => (
            <SelectItem key={column} value={column}>
              {column}
            </SelectItem>
          ))}
        </SelectGroup>
      </SelectContent>
    </Select>
  </Field>
);
