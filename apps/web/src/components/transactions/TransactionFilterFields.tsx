import {
  ArrowDownLeft,
  ArrowLeftRight,
  ArrowUpRight,
  Coins,
  FilePlus,
  Handshake,
  Link2,
  Undo2,
} from 'lucide-react';
import { memberFullLabel } from '@ploutizo/utils';
import type { FilterFieldConfig } from '@ploutizo/ui/components/filters-types';
import { TRANSACTION_DATE_OPERATORS } from './transactionDateFilter';
import type { LucideIcon } from 'lucide-react';

/**
 * Pseudo-options appended to the assignee filter. `personal` matches
 * transactions with exactly one assignee, `shared` matches two or more.
 * Selected together they mean no shape constraint. Member ids are UUIDs so
 * these sentinels can never collide.
 */
export const ASSIGNEE_SHAPE_OPTIONS = [
  { value: 'personal', label: 'Personal' },
  { value: 'shared', label: 'Shared' },
];

export const IMPORT_OUTCOME_OPTIONS = [
  { value: 'created', label: 'Created' },
  { value: 'matched', label: 'Matched' },
];

export const TRANSACTION_TYPE_OPTIONS = [
  { value: 'expense', label: 'Expense' },
  { value: 'income', label: 'Income' },
  { value: 'transfer', label: 'Transfer' },
  { value: 'settlement', label: 'Settlement' },
  { value: 'refund', label: 'Refund' },
  { value: 'contribution', label: 'Contribution' },
];

/** Icons shown next to transaction-type options in filter menus. */
export const TRANSACTION_TYPE_ICONS: Record<string, LucideIcon> = {
  expense: ArrowDownLeft,
  income: ArrowUpRight,
  transfer: ArrowLeftRight,
  settlement: Handshake,
  refund: Undo2,
  contribution: Coins,
};

/** Icons shown next to import-outcome options in filter menus. */
export const IMPORT_OUTCOME_ICONS: Record<string, LucideIcon> = {
  created: FilePlus,
  matched: Link2,
};

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
      options: TRANSACTION_TYPE_OPTIONS,
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
      type: 'multiselect',
      defaultOperator: 'is',
      operators: [{ value: 'is', label: 'Is' }],
      options: categories.map((c) => ({ value: c.id, label: c.name })),
    },
    {
      key: 'assigneeId',
      label: 'Assignee',
      type: 'multiselect',
      defaultOperator: 'is',
      operators: [{ value: 'is', label: 'Is' }],
      options: [
        ...members.map((m) => ({
          value: m.id,
          label: memberFullLabel(m),
        })),
        ...ASSIGNEE_SHAPE_OPTIONS,
      ],
    },
    {
      key: 'tagIds',
      label: 'Tags',
      type: 'multiselect',
      defaultOperator: 'is',
      operators: [{ value: 'is', label: 'Is' }],
      options: tags.map((t) => ({ value: t.id, label: t.name })),
    },
  ];
  if (options?.includeImportResult) {
    fields.push({
      key: 'importOutcome',
      label: 'Import result',
      type: 'select',
      defaultOperator: 'is',
      operators: [{ value: 'is', label: 'Is' }],
      options: IMPORT_OUTCOME_OPTIONS,
    });
  }
  return fields;
};
