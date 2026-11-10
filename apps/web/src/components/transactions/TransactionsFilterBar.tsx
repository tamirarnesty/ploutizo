import { useCallback, useMemo, useState } from 'react';
import { useNavigate } from '@tanstack/react-router';
import {
  ArrowLeftRightIcon,
  ImportIcon,
  Layers2Icon,
  ListFilterIcon,
  TagsIcon,
  UsersIcon,
  WalletIcon,
} from 'lucide-react';
import { memberFullLabel } from '@ploutizo/utils';
import { ActiveFilterChips } from '@ploutizo/ui/components/active-filter-chips';
import { Badge } from '@ploutizo/ui/components/badge';
import { Button } from '@ploutizo/ui/components/button';
import type { Filter } from '@ploutizo/ui/components/filters-types';
import { useIsMobile } from '@/hooks/use-mobile';
import { TransactionFilterSearch } from './TransactionFilterSearch';
import { TransactionDateFilterControl } from './TransactionDateFilterControl';
import { TransactionMultiSelectFilter } from './TransactionMultiSelectFilter';
import { TransactionSingleSelectFilter } from './TransactionSingleSelectFilter';
import { TransactionFiltersSheet } from './TransactionFiltersSheet';
import {
  ASSIGNEE_SHAPE_OPTIONS,
  IMPORT_OUTCOME_OPTIONS,
  TRANSACTION_TYPE_OPTIONS,
  buildFilterFields,
} from './TransactionFilterFields';
import {
  dateFilterToSearch,
  formatTransactionDateFilterLabel,
} from './transactionDateFilter';
import {
  buildCleanSearch,
  filtersToSearch,
  searchToFilters,
} from './transactionFilterUrl';
import type { TransactionSearch } from './transactionSearch';

type Account = { id: string; name: string };
type Category = { id: string; name: string };
type Member = {
  id: string;
  firstName: string | null;
  lastName: string | null;
  email: string;
};
type Tag = { id: string; name: string };

type TransactionsFilterBarProps = {
  search: TransactionSearch;
  accounts: Account[];
  categories: Category[];
  members: Member[];
  tags: Tag[];
};

type QuickEditTarget =
  | 'type'
  | 'date'
  | 'account'
  | 'assignee'
  | 'category'
  | 'tag'
  | 'importResult'
  | 'all';

const QUICK_EDIT_BY_FIELD: Partial<Record<string, QuickEditTarget>> = {
  type: 'type',
  dateRange: 'date',
  accountId: 'account',
  assigneeId: 'assignee',
  categoryId: 'category',
  tagIds: 'tag',
  importOutcome: 'importResult',
};

const splitParam = (value: string | undefined): string[] =>
  value ? value.split(',').filter(Boolean) : [];

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

  const typeValues = useMemo(() => splitParam(search.type), [search.type]);
  const accountIds = useMemo(
    () => splitParam(search.accountId),
    [search.accountId]
  );
  const accountOptions = useMemo(
    () =>
      accounts.map((account) => ({ value: account.id, label: account.name })),
    [accounts]
  );
  const assigneeValues = useMemo(
    () => splitParam(search.assigneeId),
    [search.assigneeId]
  );
  const assigneeGroups = useMemo(
    () => [
      {
        label: 'Members',
        options: members.map((member) => ({
          value: member.id,
          label: memberFullLabel(member),
        })),
      },
      { label: 'Sharing', options: ASSIGNEE_SHAPE_OPTIONS },
    ],
    [members]
  );
  const categoryValues = useMemo(
    () => splitParam(search.categoryId),
    [search.categoryId]
  );
  const categoryOptions = useMemo(
    () =>
      categories.map((category) => ({
        value: category.id,
        label: category.name,
      })),
    [categories]
  );
  const tagValues = useMemo(() => splitParam(search.tagIds), [search.tagIds]);
  const tagOptions = useMemo(
    () => tags.map((tag) => ({ value: tag.id, label: tag.name })),
    [tags]
  );

  return (
    <div className="flex flex-col gap-2">
      {isMobile ? (
        <div className="flex items-center gap-2">
          <TransactionFilterSearch
            urlQuery={search.search ?? ''}
            onCommit={commitSearchQuery}
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="shrink-0 gap-1.5"
            onClick={() => setQuickEdit('all')}
          >
            <ListFilterIcon className="size-3.5" />
            Filters
            {activeFilters.length > 0 ? (
              <Badge
                variant="secondary"
                className="h-4 min-w-4 px-1 text-[10px]"
              >
                {activeFilters.length}
              </Badge>
            ) : null}
          </Button>
        </div>
      ) : (
        <div className="flex flex-wrap items-center gap-2">
          <TransactionFilterSearch
            urlQuery={search.search ?? ''}
            onCommit={commitSearchQuery}
          />
          <div className="flex items-center gap-2">
            <TransactionMultiSelectFilter
              icon={<ArrowLeftRightIcon className="size-3.5" />}
              groups={[{ options: TRANSACTION_TYPE_OPTIONS }]}
              values={typeValues}
              allLabel="All types"
              onChange={handleTypeChange}
              open={quickEdit === 'type'}
              onOpenChange={(open) => setQuickEdit(open ? 'type' : null)}
            />
            <TransactionDateFilterControl
              search={search}
              onChange={handleDateChange}
              open={quickEdit === 'date'}
              onOpenChange={(open) => setQuickEdit(open ? 'date' : null)}
            />
            <TransactionMultiSelectFilter
              icon={<WalletIcon className="size-3.5" />}
              groups={[{ options: accountOptions }]}
              values={accountIds}
              allLabel="All accounts"
              onChange={handleAccountChange}
              open={quickEdit === 'account'}
              onOpenChange={(open) => setQuickEdit(open ? 'account' : null)}
            />
            <TransactionMultiSelectFilter
              icon={<UsersIcon className="size-3.5" />}
              groups={assigneeGroups}
              values={assigneeValues}
              allLabel="All assignees"
              onChange={handleAssigneeChange}
              open={quickEdit === 'assignee'}
              onOpenChange={(open) => setQuickEdit(open ? 'assignee' : null)}
            />
            <TransactionMultiSelectFilter
              icon={<Layers2Icon className="size-3.5" />}
              groups={[{ options: categoryOptions }]}
              values={categoryValues}
              allLabel="All categories"
              onChange={handleCategoryChange}
              open={quickEdit === 'category'}
              onOpenChange={(open) => setQuickEdit(open ? 'category' : null)}
            />
            <TransactionMultiSelectFilter
              icon={<TagsIcon className="size-3.5" />}
              groups={[{ options: tagOptions }]}
              values={tagValues}
              allLabel="All tags"
              onChange={handleTagsChange}
              open={quickEdit === 'tag'}
              onOpenChange={(open) => setQuickEdit(open ? 'tag' : null)}
            />
            {search.importBatchId ? (
              <TransactionSingleSelectFilter
                icon={<ImportIcon className="size-3.5" />}
                options={IMPORT_OUTCOME_OPTIONS}
                value={search.importOutcome}
                allLabel="All results"
                onChange={handleImportOutcomeChange}
                open={quickEdit === 'importResult'}
                onOpenChange={(open) =>
                  setQuickEdit(open ? 'importResult' : null)
                }
              />
            ) : null}
          </div>
        </div>
      )}

      <ActiveFilterChips
        filters={activeFilters}
        fields={filterFields}
        onRemove={handleRemoveFilter}
        onSelect={handleSelectChip}
        onClearAll={activeFilters.length > 0 ? handleClearFilters : undefined}
        getSummary={getDateSummary}
      />

      {isMobile ? (
        <TransactionFiltersSheet
          open={quickEdit !== null}
          focusField={quickEdit === 'all' ? null : quickEdit}
          onOpenChange={(next) => {
            if (!next) setQuickEdit(null);
          }}
          search={search}
          typeValues={typeValues}
          accountValues={accountIds}
          assigneeValues={assigneeValues}
          categoryValues={categoryValues}
          tagValues={tagValues}
          accountOptions={accountOptions}
          categoryOptions={categoryOptions}
          tagOptions={tagOptions}
          assigneeGroups={assigneeGroups}
          importOptions={IMPORT_OUTCOME_OPTIONS}
          hasImportResult={Boolean(search.importBatchId)}
          importValue={search.importOutcome}
          onTypeChange={handleTypeChange}
          onAccountChange={handleAccountChange}
          onAssigneeChange={handleAssigneeChange}
          onCategoryChange={handleCategoryChange}
          onTagsChange={handleTagsChange}
          onDateChange={handleDateChange}
          onImportOutcomeChange={handleImportOutcomeChange}
          activeFilterCount={activeFilters.length}
          onClearAllFilters={handleClearFilters}
        />
      ) : null}
    </div>
  );
};
