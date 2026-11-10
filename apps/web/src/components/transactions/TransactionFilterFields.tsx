import { memberFullLabel } from '@ploutizo/utils';
import type { FilterFieldConfig } from '@ploutizo/ui/components/filters-types';
import { TRANSACTION_DATE_OPERATORS } from './transactionDateFilter';

/**
 * Field configs for every transaction filter. Type, Date, and Account have
 * dedicated quick controls, so the Filter panel only renders the fields
 * without quick actions — but all configs stay here so applied-filter chips
 * can resolve labels and summaries for every active filter.
 */
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
      ],
    },
    {
      key: 'dateRange',
      label: 'Date',
      type: 'custom',
      defaultOperator: 'between',
      operators: [...TRANSACTION_DATE_OPERATORS],
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
