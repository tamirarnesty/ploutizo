import {
  ArrowDownLeft,
  ArrowLeftRight,
  ArrowUpRight,
  CalendarDays,
  Coins,
  FilePlus,
  Handshake,
  Import,
  Layers2,
  Link2,
  Tags,
  Undo2,
  Users,
  Wallet,
} from 'lucide-react';
import { TRANSACTION_FILTER_SENTINELS } from '@ploutizo/types';
import type { TransactionType } from '@ploutizo/types';
import type { LucideIcon } from 'lucide-react';
import type {
  TransactionListFilterParam,
  TransactionSearch,
} from './transactionSearch';

export type SelectionFilterField =
  'type' | 'account' | 'assignee' | 'category' | 'tag';

export type TransactionFilterField =
  SelectionFilterField | 'date' | 'importResult';

type FilterConfigBase = {
  /** Section title and applied-chip label. */
  label: string;
  /** Trigger text when nothing is selected, e.g. "All types". */
  allLabel: string;
  icon: LucideIcon;
};

export type SelectionFilterConfig = FilterConfigBase & {
  kind: 'selection';
  field: SelectionFilterField;
  /** URL param holding the comma-joined selection. */
  param: TransactionListFilterParam;
  /** Label for a selected value whose entity no longer exists. */
  missingLabel: string;
};

export type DateFilterConfig = FilterConfigBase & {
  kind: 'date';
  field: 'date';
};

export type ImportResultFilterConfig = FilterConfigBase & {
  kind: 'importResult';
  field: 'importResult';
};

export type TransactionFilterConfig =
  SelectionFilterConfig | DateFilterConfig | ImportResultFilterConfig;

/** Every transaction filter, in display order. */
export const TRANSACTION_FILTERS: readonly TransactionFilterConfig[] = [
  {
    kind: 'selection',
    field: 'type',
    param: 'type',
    label: 'Type',
    allLabel: 'All types',
    icon: ArrowLeftRight,
    missingLabel: 'Unknown type',
  },
  {
    kind: 'date',
    field: 'date',
    label: 'Date',
    allLabel: 'All time',
    icon: CalendarDays,
  },
  {
    kind: 'selection',
    field: 'account',
    param: 'accountId',
    label: 'Account',
    allLabel: 'All accounts',
    icon: Wallet,
    missingLabel: 'Deleted account',
  },
  {
    kind: 'selection',
    field: 'assignee',
    param: 'assigneeId',
    label: 'Assignee',
    allLabel: 'All assignees',
    icon: Users,
    missingLabel: 'Former member',
  },
  {
    kind: 'selection',
    field: 'category',
    param: 'categoryId',
    label: 'Category',
    allLabel: 'All categories',
    icon: Layers2,
    missingLabel: 'Deleted category',
  },
  {
    kind: 'selection',
    field: 'tag',
    param: 'tagIds',
    label: 'Tags',
    allLabel: 'All tags',
    icon: Tags,
    missingLabel: 'Deleted tag',
  },
  {
    kind: 'importResult',
    field: 'importResult',
    label: 'Import result',
    allLabel: 'All results',
    icon: Import,
  },
];

export const SELECTION_FILTERS = TRANSACTION_FILTERS.filter(
  (filter) => filter.kind === 'selection'
);

/** Maps every selection filter through `fn`, keyed by field. */
export const mapSelectionFilters = <T>(
  fn: (filter: SelectionFilterConfig) => T
): Record<SelectionFilterField, T> =>
  // Keys come from SELECTION_FILTERS, which lists exactly SelectionFilterField.
  Object.fromEntries(
    SELECTION_FILTERS.map((filter) => [filter.field, fn(filter)])
  ) as Record<SelectionFilterField, T>;

export const TRANSACTION_TYPE_OPTIONS = [
  { value: 'expense', label: 'Expense', icon: ArrowDownLeft },
  { value: 'income', label: 'Income', icon: ArrowUpRight },
  { value: 'transfer', label: 'Transfer', icon: ArrowLeftRight },
  { value: 'settlement', label: 'Settlement', icon: Handshake },
  { value: 'refund', label: 'Refund', icon: Undo2 },
  { value: 'contribution', label: 'Contribution', icon: Coins },
] as const satisfies readonly {
  value: TransactionType;
  label: string;
  icon: LucideIcon;
}[];

export const IMPORT_OUTCOME_OPTIONS = [
  { value: 'created', label: 'Created', icon: FilePlus },
  { value: 'matched', label: 'Matched', icon: Link2 },
] as const satisfies readonly {
  value: NonNullable<TransactionSearch['importOutcome']>;
  label: string;
  icon: LucideIcon;
}[];

/** Extra assignee options: `personal` = one assignee, `shared` = two or more. */
export const ASSIGNEE_SHAPE_OPTIONS = [
  { value: TRANSACTION_FILTER_SENTINELS.personal, label: 'Personal' },
  { value: TRANSACTION_FILTER_SENTINELS.shared, label: 'Shared' },
];

export const UNCATEGORIZED_OPTION = {
  value: TRANSACTION_FILTER_SENTINELS.none,
  label: 'Uncategorized',
};

export const UNTAGGED_OPTION = {
  value: TRANSACTION_FILTER_SENTINELS.none,
  label: 'No tags',
};
