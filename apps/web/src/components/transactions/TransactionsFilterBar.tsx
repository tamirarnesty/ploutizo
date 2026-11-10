import { useCallback, useMemo, useState } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { ArrowLeftRightIcon, ListFilterIcon, WalletIcon } from 'lucide-react';
import { Button } from '@ploutizo/ui/components/button';
import { ActiveFilterChips } from '@ploutizo/ui/components/active-filter-chips';
import { FilterPanel } from '@ploutizo/ui/components/filter-panel';
import {
  createPinnedFilterId,
  getDefaultFilterOperator,
} from '@ploutizo/ui/components/filters-utils';
import type { Filter } from '@ploutizo/ui/components/filters-types';
import { TransactionFilterSearch } from './TransactionFilterSearch';
import { TransactionDateFilterControl } from './TransactionDateFilterControl';
import { TransactionMultiSelectFilter } from './TransactionMultiSelectFilter';
import { buildFilterFields } from './TransactionFilterFields';
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

/** Fields with dedicated quick controls — excluded from the Filter panel. */
const QUICK_FILTER_FIELDS = new Set(['type', 'dateRange', 'accountId']);

type QuickEditTarget = 'type' | 'date' | 'account';

const QUICK_EDIT_BY_FIELD: Partial<Record<string, QuickEditTarget>> = {
  type: 'type',
  dateRange: 'date',
  accountId: 'account',
};

const splitParam = (value: string | undefined): string[] =>
  value ? value.split(',').filter(Boolean) : [];

const TYPE_OPTIONS = [
  { value: 'expense', label: 'Expense' },
  { value: 'income', label: 'Income' },
  { value: 'transfer', label: 'Transfer' },
  { value: 'settlement', label: 'Settlement' },
  { value: 'refund', label: 'Refund' },
  { value: 'contribution', label: 'Contribution' },
];

const getDateSummary = (filter: Filter<string>) =>
  filter.field === 'dateRange'
    ? formatTransactionDateFilterLabel(filter.operator, filter.values)
    : undefined;

/**
 * Transaction filter bar: quick controls inline on desktop, the full filter
 * panel (popover on desktop, bottom sheet on mobile), and the applied-filter
 * chips row. All state lives in the URL search params.
 */
export const TransactionsFilterBar = ({
  search,
  accounts,
  categories,
  members,
  tags,
}: TransactionsFilterBarProps) => {
  const navigate = useNavigate();

  const [panelOpen, setPanelOpen] = useState(false);
  const [panelFocusField, setPanelFocusField] = useState<string | undefined>();
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

  const panelFilters = useMemo<Filter<string>[]>(() => {
    const byField = new Map(activeFilters.map((f) => [f.field, f]));
    return filterFields.map(
      (field) =>
        byField.get(field.key as string) ?? {
          id: createPinnedFilterId(field.key as string),
          field: field.key as string,
          operator: getDefaultFilterOperator(field),
          values: [],
        }
    );
  }, [activeFilters, filterFields]);

  // The panel only edits fields without a quick control; filters for the
  // quick fields stay in `panelFilters` so panel edits preserve them.
  const panelFields = useMemo(
    () =>
      filterFields.filter(
        (field) => !field.key || !QUICK_FILTER_FIELDS.has(field.key)
      ),
    [filterFields]
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

  const handlePanelChange = useCallback(
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
      handlePanelChange(
        panelFilters.map((f) =>
          f.field === filter.field
            ? {
                ...f,
                operator: getDefaultFilterOperator(
                  filterFields.find((field) => field.key === f.field) ?? {}
                ),
                values: [],
              }
            : f
        )
      );
    },
    [handlePanelChange, panelFilters, filterFields]
  );

  const handleSelectChip = useCallback((filter: Filter<string>) => {
    const quick = QUICK_EDIT_BY_FIELD[filter.field];
    if (quick) {
      setPanelOpen(false);
      setPanelFocusField(undefined);
      setQuickEdit(quick);
      return;
    }
    setPanelFocusField(filter.field);
    setPanelOpen(true);
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
        type_op: undefined,
      });
    },
    [applySearch]
  );

  const handleAccountChange = useCallback(
    (accountIds: string[]) => {
      applySearch({
        accountId: accountIds.length > 0 ? accountIds.join(',') : undefined,
        accountId_op: undefined,
      });
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

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center gap-2">
        <TransactionFilterSearch
          urlQuery={search.search ?? ''}
          onCommit={commitSearchQuery}
        />
        <div className="flex items-center gap-2">
          <TransactionMultiSelectFilter
            icon={<ArrowLeftRightIcon className="size-3.5" />}
            options={TYPE_OPTIONS}
            values={typeValues}
            operator={search.type_op}
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
            options={accountOptions}
            values={accountIds}
            operator={search.accountId_op}
            allLabel="All accounts"
            onChange={handleAccountChange}
            open={quickEdit === 'account'}
            onOpenChange={(open) => setQuickEdit(open ? 'account' : null)}
          />
        </div>
        <FilterPanel
          open={panelOpen}
          onOpenChange={(open) => {
            setPanelOpen(open);
            setQuickEdit(null);
            if (!open) setPanelFocusField(undefined);
          }}
          fields={panelFields}
          filters={panelFilters}
          onChange={handlePanelChange}
          focusFieldKey={panelFocusField}
          getSummary={getDateSummary}
          title="Filters"
          trigger={
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="hidden gap-1.5 text-xs md:inline-flex"
            >
              <ListFilterIcon className="size-3.5" />
              Filters
              {activeFilters.length > 0 ? (
                <span className="rounded-full bg-muted px-1.5 py-0.5 text-[0.65rem] leading-none font-semibold">
                  {activeFilters.length}
                </span>
              ) : null}
            </Button>
          }
        />
        <Button
          type="button"
          variant="outline"
          size="icon-sm"
          className="relative md:hidden"
          aria-label={
            activeFilters.length > 0
              ? `Filters, ${activeFilters.length} active`
              : 'Filters'
          }
          onClick={() => {
            setQuickEdit(null);
            setPanelOpen(true);
          }}
        >
          <ListFilterIcon />
          {activeFilters.length > 0 ? (
            <span className="absolute -end-1 -top-1 flex size-4 items-center justify-center rounded-full bg-primary text-[0.6rem] font-semibold text-primary-foreground">
              {activeFilters.length}
            </span>
          ) : null}
        </Button>
      </div>

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
