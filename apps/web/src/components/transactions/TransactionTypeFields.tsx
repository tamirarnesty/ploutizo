import { Field, FieldError, FieldLabel } from '@ploutizo/ui/components/field';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@ploutizo/ui/components/select';
import { Text } from '@ploutizo/ui/components/text';
import { ExpenseFields } from './ExpenseFields';
import { RefundLinker } from './RefundLinker';
import type { TransactionFormInstance } from './hooks/useTransactionForm';
import type { AssigneeFormRow, TransactionFormValues } from './types';
import type { Category } from '@/lib/data-access/categories';

// TODO(03.4-deferred): originalDescription column — add when schema patch lands
// D-19: import caption (└ Original: ...) is deferred because originalDescription
// and originalMerchant columns are absent from the current DB schema.

const TYPE_LABELS: Record<string, string | undefined> = {
  expense: 'Expense',
  income: 'Income',
  transfer: 'Transfer',
  settlement: 'Settlement',
  refund: 'Refund',
  contribution: 'Contribution',
};

const INCOME_TYPE_LABELS: Record<string, string | undefined> = {
  direct_deposit: 'Direct deposit',
  e_transfer: 'e-Transfer',
  cash: 'Cash',
  cheque: 'Cheque',
  other: 'Other',
};

interface TransactionTypeFieldsProps {
  form: TransactionFormInstance;
  categories: Category[];
  onAssigneesChange: (assignees: AssigneeFormRow[]) => void;
  /** Called after any type-switch, before field clears. Plan 06 passes () => setIsDescriptionUnlocked(false). */
  onTypeChange?: () => void;
}

/**
 * Module-scope: avoids re-mount on each render (vercel-react-best-practices rerender-*)
 */
const TypeSelectField = ({
  form,
  onTypeChange,
}: {
  form: TransactionFormInstance;
  onTypeChange?: () => void;
}) => (
  <form.AppField
    name="type"
    listeners={{
      onChange: () => {
        // Notify parent before field clears (e.g. Plan 06 resets description lock)
        onTypeChange?.();
        // Clear ALL type-specific fields unconditionally — no if-guard (D-07)
        form.setFieldValue('categoryId', '');
        form.setFieldValue('refundOf', '');
        form.setFieldValue('incomeType', '');
        form.setFieldValue('counterpartAccountId', '');
      },
    }}
  >
    {(field) => (
      <Field>
        <FieldLabel htmlFor="tx-type">Type</FieldLabel>
        <Select
          value={field.state.value}
          onValueChange={(v) =>
            field.handleChange(v as TransactionFormValues['type'])
          }
        >
          <SelectTrigger id="tx-type" autoFocus>
            {/* autoFocus: type is the primary purpose of opening the sheet (per web-design-guidelines) */}
            <SelectValue>
              {TYPE_LABELS[field.state.value] ?? 'Select type'}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="expense">Expense</SelectItem>
            <SelectItem value="income">Income</SelectItem>
            <SelectItem value="transfer">Transfer</SelectItem>
            <SelectItem value="settlement">Settlement</SelectItem>
            <SelectItem value="refund">Refund</SelectItem>
            <SelectItem value="contribution">Contribution</SelectItem>
          </SelectContent>
        </Select>
      </Field>
    )}
  </form.AppField>
);

/** Category Select for refund type — col 2 in the 2-column grid */
const RefundCategoryField = ({
  form,
  categories,
}: {
  form: TransactionFormInstance;
  categories: Category[];
}) => (
  <form.AppField name="categoryId">
    {(field) => (
      <Field>
        <FieldLabel htmlFor="tx-refund-categoryId">
          Category
          <Text
            as="span"
            variant="body-sm"
            className="font-normal text-muted-foreground"
          >
            (optional)
          </Text>
        </FieldLabel>
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
      </Field>
    )}
  </form.AppField>
);

/** Income type Select — col 2 in the 2-column grid for income transactions */
const IncomeTypeField = ({ form }: { form: TransactionFormInstance }) => (
  <form.AppField
    name="incomeType"
    validators={{
      onSubmit: ({ value }: { value: string }) =>
        !value ? 'Income type is required.' : undefined,
    }}
  >
    {(field) => (
      <Field data-invalid={field.state.meta.errors.length > 0 || undefined}>
        <FieldLabel htmlFor="tx-incomeType">Income type</FieldLabel>
        <Select
          value={field.state.value}
          onValueChange={(v) => {
            if (v !== null) field.handleChange(v);
          }}
        >
          <SelectTrigger id="tx-incomeType">
            <SelectValue>
              {INCOME_TYPE_LABELS[field.state.value] ?? 'Select type'}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="direct_deposit">Direct deposit</SelectItem>
            <SelectItem value="e_transfer">e-Transfer</SelectItem>
            <SelectItem value="cash">Cash</SelectItem>
            <SelectItem value="cheque">Cheque</SelectItem>
            <SelectItem value="other">Other</SelectItem>
          </SelectContent>
        </Select>
        {field.state.meta.errors.length > 0 ? (
          <FieldError errors={field.state.meta.errors as unknown as { message?: string }[]} />
        ) : null}
      </Field>
    )}
  </form.AppField>
);

const MULTI_ACCOUNT_TYPES = ['transfer', 'settlement', 'contribution'];

export const TransactionTypeFields = ({
  form,
  categories,
  onAssigneesChange,
  onTypeChange,
}: TransactionTypeFieldsProps) => (
  <form.Subscribe selector={(s) => s.values.type}>
    {(type) => (
      <>
        {MULTI_ACCOUNT_TYPES.includes(type) ? (
          // Multi-account: Type is full-width; Source + Destination rendered below in TransactionForm
          <TypeSelectField form={form} onTypeChange={onTypeChange} />
        ) : (
          // Single-account: [Type | Subtype] 2-col
          <div className="grid grid-cols-2 gap-4">
            <TypeSelectField form={form} onTypeChange={onTypeChange} />
            {type === 'expense' ? (
              <ExpenseFields form={form} categories={categories} />
            ) : type === 'refund' ? (
              <RefundCategoryField form={form} categories={categories} />
            ) : type === 'income' ? (
              <IncomeTypeField form={form} />
            ) : null}
          </div>
        )}

        {/* Type-specific fields below the type row */}
        {type === 'refund' ? (
          <RefundLinker form={form} onAssigneesChange={onAssigneesChange} />
        ) : null}
      </>
    )}
  </form.Subscribe>
);
