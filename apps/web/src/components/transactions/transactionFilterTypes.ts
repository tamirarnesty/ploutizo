import type { AccountType } from '@ploutizo/types';
import type { ReactNode } from 'react';

export type TransactionFilterAccount = {
  id: string;
  name: string;
  type: AccountType;
};

export type TransactionFilterCategory = {
  id: string;
  name: string;
  icon?: string | null;
};

export type TransactionFilterMember = {
  id: string;
  firstName: string | null;
  lastName: string | null;
  email: string;
  imageUrl?: string | null;
};

export type TransactionFilterTag = {
  id: string;
  name: string;
  colour?: string | null;
};

export type TransactionFilterOption = {
  value: string;
  label: string;
  icon?: ReactNode;
};

export type TransactionFilterOptionGroup = {
  key: string;
  label?: string;
  options: TransactionFilterOption[];
};

export type QuickEditTarget =
  | 'type'
  | 'date'
  | 'account'
  | 'assignee'
  | 'category'
  | 'tag'
  | 'importResult'
  | 'all';

export type TransactionFilterOptions = {
  typeValues: string[];
  accountValues: string[];
  assigneeValues: string[];
  categoryValues: string[];
  tagValues: string[];
  typeOptions: TransactionFilterOption[];
  accountGroups: TransactionFilterOptionGroup[];
  categoryOptions: TransactionFilterOption[];
  tagOptions: TransactionFilterOption[];
  assigneeGroups: TransactionFilterOptionGroup[];
  importOptions: TransactionFilterOption[];
  hasImportResult: boolean;
  importValue: string | undefined;
};

export type TransactionFilterChangeHandlers = {
  onTypeChange: (values: string[]) => void;
  onAccountChange: (values: string[]) => void;
  onAssigneeChange: (values: string[]) => void;
  onCategoryChange: (values: string[]) => void;
  onTagsChange: (values: string[]) => void;
  onDateChange: (next: { operator: string; values: string[] }) => void;
  onImportOutcomeChange: (value: string | undefined) => void;
};
