import { Field, FieldError, FieldLabel } from '@ploutizo/ui/components/field';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@ploutizo/ui/components/select';
import type { Category } from '@/lib/data-access/categories';
import { ExpenseFields } from './ExpenseFields';
import { RefundLinker } from './RefundLinker';
import type { TransactionFormInstance } from './hooks/useTransactionForm';
import type { AssigneeFormRow, TransactionFormValues } from './types';

// TODO(03.4-deferred): originalDescription column — add when schema patch lands
// D-19: import caption (└ Original: ...) is deferred because originalDescription
// and originalMerchant columns are absent from the current DB schema.

const TRANSACTION_TYPE_ITEMS = [
  { label: 'Expense', value: 'expense' },
  { label: 'Income', value: 'income' },
  { label: 'Transfer', value: 'transfer' },
  { label: 'Settlement', value: 'settlement' },
  { label: 'Refund', value: 'refund' },
  { label: 'Contribution', value: 'contribution' },
] as const;

const INCOME_TYPE_ITEMS = [
  { label: 'Direct deposit', value: 'direct_deposit' },
  { label: 'e-Transfer', value: 'e_transfer' },
  { label: 'Cash', value: 'cash' },
  { label: 'Cheque', value: 'cheque' },
  { label: 'Other', value: 'other' },
] as const;

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
          items={TRANSACTION_TYPE_ITEMS}
          value={field.state.value}
          onValueChange={(v) =>
            field.handleChange(v as TransactionFormValues['type'])
          }
        >
          <SelectTrigger id="tx-type" autoFocus>
            {/* autoFocus: type is the primary purpose of opening the sheet (per web-design-guidelines) */}
            <SelectValue>
              {(selected: string) =>
                TRANSACTION_TYPE_ITEMS.find((item) => item.value === selected)
                  ?.label ?? selected
              }
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              {TRANSACTION_TYPE_ITEMS.map((item) => (
                <SelectItem key={item.value} value={item.value}>
                  {item.label}
                </SelectItem>
              ))}
            </SelectGroup>
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
  <form.AppField
    name="categoryId"
    validators={{
      onSubmit: ({ value }: { value: string }) =>
        !value ? 'Category is required for refund transactions.' : undefined,
    }}
  >
    {(field) => (
      <Field data-invalid={field.state.meta.errors.length > 0 || undefined}>
        <FieldLabel htmlFor="tx-refund-categoryId">Category</FieldLabel>
        <Select
          items={categories.map((category) => ({
            label: category.name,
            value: category.id,
          }))}
          value={field.state.value}
          onValueChange={(v) => {
            if (v !== null) field.handleChange(v);
          }}
        >
          <SelectTrigger id="tx-refund-categoryId">
            <SelectValue>
              {(selected: string) =>
                categories.find((category) => category.id === selected)?.name ??
                'Select category'
              }
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              {categories.map((category) => (
                <SelectItem key={category.id} value={category.id}>
                  {category.name}
                </SelectItem>
              ))}
            </SelectGroup>
          </SelectContent>
        </Select>
        {field.state.meta.errors.length > 0 ? (
          <FieldError
            errors={
              field.state.meta.errors as unknown as { message?: string }[]
            }
          />
        ) : null}
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
          items={INCOME_TYPE_ITEMS}
          value={field.state.value}
          onValueChange={(v) => {
            if (v !== null) field.handleChange(v);
          }}
        >
          <SelectTrigger id="tx-incomeType">
            <SelectValue>
              {(selected: string) =>
                INCOME_TYPE_ITEMS.find((item) => item.value === selected)
                  ?.label ?? selected
              }
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              {INCOME_TYPE_ITEMS.map((item) => (
                <SelectItem key={item.value} value={item.value}>
                  {item.label}
                </SelectItem>
              ))}
            </SelectGroup>
          </SelectContent>
        </Select>
        {field.state.meta.errors.length > 0 ? (
          <FieldError
            errors={
              field.state.meta.errors as unknown as { message?: string }[]
            }
          />
        ) : null}
      </Field>
    )}
  </form.AppField>
);

const MULTI_ACCOUNT_TYPES = ['transfer', 'settlement', 'contribution'];

const renderSubtypeField = (
  type: TransactionFormValues['type'],
  form: TransactionFormInstance,
  categories: Category[]
) => {
  switch (type) {
    case 'expense':
      return <ExpenseFields form={form} categories={categories} />;
    case 'refund':
      return <RefundCategoryField form={form} categories={categories} />;
    case 'income':
      return <IncomeTypeField form={form} />;
    default:
      return null;
  }
};

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
            {renderSubtypeField(type, form, categories)}
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
