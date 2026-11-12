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
  label: string;
  allLabel: string;
  icon: LucideIcon;
};

export type SelectionFilterConfig = FilterConfigBase & {
  kind: 'selection';
  field: SelectionFilterField;
  param: TransactionListFilterParam;
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

const SELECTION_FILTER_BY_FIELD = {
  type: {
    kind: 'selection',
    field: 'type',
    param: 'type',
    label: 'Type',
    allLabel: 'All types',
    icon: ArrowLeftRight,
    missingLabel: 'Unknown type',
  },
  account: {
    kind: 'selection',
    field: 'account',
    param: 'accountId',
    label: 'Account',
    allLabel: 'All accounts',
    icon: Wallet,
    missingLabel: 'Deleted account',
  },
  assignee: {
    kind: 'selection',
    field: 'assignee',
    param: 'assigneeId',
    label: 'Assignee',
    allLabel: 'All assignees',
    icon: Users,
    missingLabel: 'Former member',
  },
  category: {
    kind: 'selection',
    field: 'category',
    param: 'categoryId',
    label: 'Category',
    allLabel: 'All categories',
    icon: Layers2,
    missingLabel: 'Deleted category',
  },
  tag: {
    kind: 'selection',
    field: 'tag',
    param: 'tagIds',
    label: 'Tags',
    allLabel: 'All tags',
    icon: Tags,
    missingLabel: 'Deleted tag',
  },
} satisfies Record<SelectionFilterField, SelectionFilterConfig>;

export const TRANSACTION_FILTERS: readonly TransactionFilterConfig[] = [
  SELECTION_FILTER_BY_FIELD.type,
  {
    kind: 'date',
    field: 'date',
    label: 'Date',
    allLabel: 'All time',
    icon: CalendarDays,
  },
  SELECTION_FILTER_BY_FIELD.account,
  SELECTION_FILTER_BY_FIELD.assignee,
  SELECTION_FILTER_BY_FIELD.category,
  SELECTION_FILTER_BY_FIELD.tag,
  {
    kind: 'importResult',
    field: 'importResult',
    label: 'Import result',
    allLabel: 'All results',
    icon: Import,
  },
];

export const getSelectionFilter = (
  field: SelectionFilterField
): SelectionFilterConfig => SELECTION_FILTER_BY_FIELD[field];

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
