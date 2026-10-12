import { Field, FieldError } from '@ploutizo/ui/components/field';
import type { OrgMember, TransactionRow } from '@ploutizo/validators';
import { AssigneeSection } from './AssigneeSection';
import { formAmountToCents } from './assigneeSplit';
import type { TransactionFormInstance } from './hooks/useTransactionForm';
import type { AssigneeFormRow } from './types';

interface TransactionAssigneesFieldProps {
  form: TransactionFormInstance;
  orgMembers: OrgMember[];
  transaction: TransactionRow | null;
}

/** Replaces SplitSection at top level (D-16, D-17, D-18). Reactive to the amount. */
export const TransactionAssigneesField = ({
  form,
  orgMembers,
  transaction,
}: TransactionAssigneesFieldProps) => (
  <form.Subscribe selector={(s) => s.values.amount}>
    {(amount) => (
      <form.AppField
        name="assignees"
        validators={{
          onSubmit: ({ value }: { value: AssigneeFormRow[] }) =>
            value.length === 0
              ? 'At least one assignee is required.'
              : undefined,
        }}
      >
        {(field) => (
          <Field data-invalid={field.state.meta.errors.length > 0 || undefined}>
            <AssigneeSection
              value={field.state.value}
              onChange={field.handleChange}
              amountCents={formAmountToCents(amount)}
              orgMembers={orgMembers}
              transaction={transaction}
            />
            {field.state.meta.errors.length > 0 ? (
              <FieldError
                errors={
                  field.state.meta.errors as unknown as {
                    message?: string;
                  }[]
                }
              />
            ) : null}
          </Field>
        )}
      </form.AppField>
    )}
  </form.Subscribe>
);
