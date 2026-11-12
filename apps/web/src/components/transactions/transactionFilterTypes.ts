import type { AccountType } from '@ploutizo/types';
import type { ReactNode } from 'react';
import type { SelectionFilterConfig } from './transactionFilterConfig';
import type { TransactionDateFilter } from './transactionDateFilter';
import type { TransactionSearch } from './transactionSearch';

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

/** Reference lists the filters resolve ids against. */
export type TransactionFilterReferenceData = {
  accounts: TransactionFilterAccount[];
  categories: TransactionFilterCategory[];
  members: TransactionFilterMember[];
  tags: TransactionFilterTag[];
  /** False until every list has loaded, so unknown ids read as loading, not deleted. */
  loaded: boolean;
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

/** Selected values, selectable options, and a label for every selected value. */
export type SelectionFilterState = {
  values: string[];
  groups: TransactionFilterOptionGroup[];
  labels: ReadonlyMap<string, string>;
};

export type TransactionFilterOptions = {
  selections: Record<SelectionFilterConfig['field'], SelectionFilterState>;
  importOptions: TransactionFilterOption[];
  importValue: NonNullable<TransactionSearch['importOutcome']> | undefined;
};

export type TransactionFilterHandlers = {
  /** Resolves once the URL reflects the new selection. */
  onSelectionChange: (
    filter: SelectionFilterConfig,
    values: string[]
  ) => Promise<void>;
  /** `null` clears the date filter. */
  onDateChange: (filter: TransactionDateFilter | null) => void;
  onImportOutcomeChange: (outcome: string | undefined) => void;
};
