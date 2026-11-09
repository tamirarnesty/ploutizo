import { Layers2 } from 'lucide-react';
import { memberFullLabel } from '@ploutizo/utils';
import type { FilterFieldConfig } from '@ploutizo/ui/components/reui/filters-types';
import { TransactionDateEditor } from './TransactionDateEditor';
import {
  TRANSACTION_DATE_OPERATORS,
  migrateDateFilterValues,
} from './transactionDateFilter';

// DateRangeFilterRenderer receives operator from the filter's active operator.
// The editor commits operator+values together via onOperatorValuesChange so the
// panel emits a single filter update (one URL write, not two).
const DateRangeFilterRenderer = ({
  values,
  onChange,
  operator,
  onOperatorValuesChange,
}: {
  values: string[];
  onChange: (values: string[]) => void;
  operator: string;
  onOperatorValuesChange?: (operator: string, values: string[]) => void;
}) => (
  <TransactionDateEditor
    operator={operator}
    values={values}
    showOperators={false}
    onChange={({ operator: nextOperator, values: nextValues }) => {
      if (onOperatorValuesChange) {
        onOperatorValuesChange(nextOperator, nextValues);
      } else {
        onChange(nextValues);
      }
    }}
    onCommit={({ operator: nextOperator, values: nextValues }) => {
      if (onOperatorValuesChange) {
        onOperatorValuesChange(nextOperator, nextValues);
      } else {
        onChange(nextValues);
      }
    }}
  />
);

export const buildFilterFields = (
  accounts: { id: string; name: string }[],
  categories: { id: string; name: string }[],
  members: {
    id: string;
    firstName: string | null;
    lastName: string | null;
    email: string;
  }[],
  tags: { id: string; name: string }[],
  options?: { includeImportResult?: boolean }
): FilterFieldConfig<string>[] => {
  const fields: FilterFieldConfig<string>[] = [
    {
      key: 'type',
      label: 'Type',
      type: 'select',
      options: [
        { value: 'expense', label: 'Expense' },
        { value: 'income', label: 'Income' },
        { value: 'transfer', label: 'Transfer' },
        { value: 'settlement', label: 'Settlement' },
        { value: 'refund', label: 'Refund' },
        { value: 'contribution', label: 'Contribution' },
        // D-25: Internal shortcut — sets type to comma-separated internal types
        {
          value: 'transfer,settlement,contribution',
          label: 'Internal',
          icon: <Layers2 className="size-3.5" />,
        },
      ],
    },
    {
      key: 'dateRange',
      label: 'Date',
      type: 'custom',
      defaultOperator: 'between',
      operators: [...TRANSACTION_DATE_OPERATORS],
      migrateValues: migrateDateFilterValues,
      customRenderer: ({
        values,
        onChange,
        operator,
        onOperatorValuesChange,
      }) => (
        <DateRangeFilterRenderer
          values={values}
          onChange={onChange}
          operator={operator}
          onOperatorValuesChange={onOperatorValuesChange}
        />
      ),
    },
    {
      key: 'accountId',
      label: 'Account',
      type: 'select',
      options: accounts.map((a) => ({ value: a.id, label: a.name })),
    },
    {
      key: 'categoryId',
      label: 'Category',
      type: 'select',
      options: categories.map((c) => ({ value: c.id, label: c.name })),
    },
    {
      key: 'assigneeId',
      label: 'Assignee',
      type: 'select',
      options: members.map((m) => ({
        value: m.id,
        label: memberFullLabel(m),
      })),
    },
    {
      key: 'tagIds',
      label: 'Tags',
      type: 'multiselect',
      defaultOperator: 'is_any_of',
      options: tags.map((t) => ({ value: t.id, label: t.name })),
    },
  ];
  if (options?.includeImportResult) {
    fields.push({
      key: 'importOutcome',
      label: 'Import result',
      type: 'select',
      options: [
        { value: 'created', label: 'Created' },
        { value: 'matched', label: 'Matched' },
      ],
    });
  }
  return fields;
};
