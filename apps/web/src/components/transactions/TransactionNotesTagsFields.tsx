import { Field, FieldLabel } from '@ploutizo/ui/components/field';
import { Textarea } from '@ploutizo/ui/components/textarea';
import { TransactionTagPicker } from './TransactionTagPicker';
import type { TransactionFormInstance } from './hooks/useTransactionForm';

interface TransactionNotesTagsFieldsProps {
  form: TransactionFormInstance;
}

/** Stacked column: Notes full-width, Tags below. */
export const TransactionNotesTagsFields = ({
  form,
}: TransactionNotesTagsFieldsProps) => (
  <div className="flex flex-col gap-4">
    <form.AppField name="notes">
      {(field) => (
        <Field>
          <FieldLabel htmlFor="tx-notes">Notes</FieldLabel>
          <Textarea
            id="tx-notes"
            rows={3}
            className="resize-none"
            autoComplete="off"
            placeholder="Add a note…"
            value={field.state.value}
            onChange={(e) => field.handleChange(e.target.value)}
            onBlur={field.handleBlur}
          />
        </Field>
      )}
    </form.AppField>

    <form.AppField name="tagIds">
      {(field) => (
        <Field>
          <FieldLabel>Tags (optional)</FieldLabel>
          <TransactionTagPicker
            value={field.state.value}
            onChange={(tagIds) => field.handleChange(tagIds)}
          />
        </Field>
      )}
    </form.AppField>
  </div>
);
