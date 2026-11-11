import { useCallback, useMemo, useState } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { ActiveFilterChips } from '@ploutizo/ui/components/active-filter-chips';
import type { Filter } from '@ploutizo/ui/components/filters-types';
import { useIsMobile } from '@/hooks/use-mobile';
import { buildFilterFields } from './TransactionFilterFields';
import { TransactionsDesktopFilterControls } from './TransactionsDesktopFilterControls';
import { TransactionsMobileFilterControls } from './TransactionsMobileFilterControls';
import {
  dateFilterToSearch,
  formatTransactionDateFilterLabel,
} from './transactionDateFilter';
import {
  buildCleanSearch,
  filtersToSearch,
  searchToFilters,
} from './transactionFilterUrl';
import { useTransactionFilterOptions } from './useTransactionFilterOptions';
import type { TransactionSearch } from './transactionSearch';
import type {
  QuickEditTarget,
  TransactionFilterAccount,
  TransactionFilterCategory,
  TransactionFilterChangeHandlers,
  TransactionFilterMember,
  TransactionFilterTag,
} from './transactionFilterTypes';

type TransactionsFilterBarProps = {
  search: TransactionSearch;
  accounts: TransactionFilterAccount[];
  categories: TransactionFilterCategory[];
  members: TransactionFilterMember[];
  tags: TransactionFilterTag[];
};

const QUICK_EDIT_BY_FIELD: Partial<Record<string, QuickEditTarget>> = {
  type: 'type',
  dateRange: 'date',
  accountId: 'account',
  assigneeId: 'assignee',
  categoryId: 'category',
  tagIds: 'tag',
  importOutcome: 'importResult',
};

const getDateSummary = (filter: Filter<string>) =>
  filter.field === 'dateRange'
    ? formatTransactionDateFilterLabel(filter.operator, filter.values)
    : undefined;

/**
 * Transaction filter bar: quick dropdown controls on desktop, a search field
 * plus a Filters button opening the bottom-sheet filter editor on mobile, and
 * the applied-filter chips row. All state lives in the URL search params.
 */
export const TransactionsFilterBar = ({
  search,
  accounts,
  categories,
  members,
  tags,
}: TransactionsFilterBarProps) => {
  const navigate = useNavigate();
  const isMobile = useIsMobile();

  const [quickEdit, setQuickEdit] = useState<QuickEditTarget | null>(null);

  // Filter state is derived from URL search params (single source of truth).
  const activeFilters = useMemo(() => searchToFilters(search), [search]);

  // The panel edits one Filter per field — materialize empty defaults for
  // fields with no active filter so every section can render.
  const filterFields = useMemo(
    () =>
      buildFilterFields(accounts, categories, members, tags, {
        includeImportResult: Boolean(search.importBatchId),
      }),
    [accounts, categories, members, tags, search.importBatchId]
  );

  const filterOptions = useTransactionFilterOptions(
    search,
    accounts,
    categories,
    members,
    tags
  );

  const applySearch = useCallback(
    (patch: Partial<TransactionSearch>) => {
      void navigate({
        to: '/transactions',
        search: (prev) => buildCleanSearch({ ...prev, page: 1, ...patch }),
        replace: true,
      });
    },
    [navigate]
  );

  const applyFilters = useCallback(
    (filters: Filter<string>[]) => {
      const mapped = filtersToSearch(filters);
      void navigate({
        to: '/transactions',
        // Rebuild from scratch — only keep sort/pagination/text search from prev.
        // Spreading prev would leave stale filter params when a filter is removed.
        // Import batch stays only while the Import result filter remains.
        search: (prev) =>
          buildCleanSearch({
            page: 1,
            sort: prev.sort,
            order: prev.order,
            search: prev.search,
            ...mapped,
            importBatchId: mapped.importOutcome
              ? prev.importBatchId
              : undefined,
          }),
        replace: true,
      });
    },
    [navigate]
  );

  const handleRemoveFilter = useCallback(
    (filter: Filter<string>) => {
      applyFilters(activeFilters.filter((f) => f.field !== filter.field));
    },
    [applyFilters, activeFilters]
  );

  const handleSelectChip = useCallback((filter: Filter<string>) => {
    const quick = QUICK_EDIT_BY_FIELD[filter.field];
    if (quick) setQuickEdit(quick);
  }, []);

  // "Clear all" resets filters only — the text search is a separate intent.
  const handleClearFilters = useCallback(() => {
    void navigate({
      to: '/transactions',
      search: (prev) =>
        buildCleanSearch({
          sort: prev.sort,
          order: prev.order,
          search: prev.search,
        }),
      replace: true,
    });
  }, [navigate]);

  const handleTypeChange = useCallback(
    (values: string[]) => {
      applySearch({
        type: values.length > 0 ? values.join(',') : undefined,
      });
    },
    [applySearch]
  );

  const handleAccountChange = useCallback(
    (accountIds: string[]) => {
      applySearch({
        accountId: accountIds.length > 0 ? accountIds.join(',') : undefined,
      });
    },
    [applySearch]
  );

  const handleAssigneeChange = useCallback(
    (values: string[]) => {
      applySearch({
        assigneeId: values.length > 0 ? values.join(',') : undefined,
      });
    },
    [applySearch]
  );

  const handleCategoryChange = useCallback(
    (values: string[]) => {
      applySearch({
        categoryId: values.length > 0 ? values.join(',') : undefined,
      });
    },
    [applySearch]
  );

  const handleTagsChange = useCallback(
    (values: string[]) => {
      applySearch({
        tagIds: values.length > 0 ? values.join(',') : undefined,
      });
    },
    [applySearch]
  );

  const handleImportOutcomeChange = useCallback(
    (outcome: string | undefined) => {
      applySearch(
        outcome
          ? { importOutcome: outcome as TransactionSearch['importOutcome'] }
          : // Clearing the outcome also drops the batch provenance param.
            { importOutcome: undefined, importBatchId: undefined }
      );
    },
    [applySearch]
  );

  const handleDateChange = useCallback(
    (next: { operator: string; values: string[] }) => {
      applySearch(dateFilterToSearch(next.operator, next.values));
    },
    [applySearch]
  );

  const commitSearchQuery = useCallback(
    (trimmed: string) => {
      applySearch({ search: trimmed || undefined });
    },
    [applySearch]
  );

  const filterHandlers: TransactionFilterChangeHandlers = {
    onTypeChange: handleTypeChange,
    onAccountChange: handleAccountChange,
    onAssigneeChange: handleAssigneeChange,
    onCategoryChange: handleCategoryChange,
    onTagsChange: handleTagsChange,
    onDateChange: handleDateChange,
    onImportOutcomeChange: handleImportOutcomeChange,
  };

  return (
    <div className="flex flex-col gap-2">
      {isMobile ? (
        <TransactionsMobileFilterControls
          search={search}
          options={filterOptions}
          handlers={filterHandlers}
          activeFilterCount={activeFilters.length}
          quickEdit={quickEdit}
          onQuickEditChange={setQuickEdit}
          onSearchCommit={commitSearchQuery}
          onClearAllFilters={handleClearFilters}
        />
      ) : (
        <TransactionsDesktopFilterControls
          search={search}
          options={filterOptions}
          handlers={filterHandlers}
          quickEdit={quickEdit}
          onQuickEditChange={setQuickEdit}
          onSearchCommit={commitSearchQuery}
        />
      )}

      <ActiveFilterChips
        filters={activeFilters}
        fields={filterFields}
        onRemove={handleRemoveFilter}
        onSelect={handleSelectChip}
        onClearAll={activeFilters.length > 0 ? handleClearFilters : undefined}
        getSummary={getDateSummary}
      />
    </div>
  );
};
