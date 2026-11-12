import { useState } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { ListFilterIcon } from 'lucide-react';
import { ActiveFilterChips } from '@ploutizo/ui/components/active-filter-chips';
import { Badge } from '@ploutizo/ui/components/badge';
import { Button } from '@ploutizo/ui/components/button';
import { useIsMobile } from '@ploutizo/ui/hooks/use-mobile';
import { useToday } from '@ploutizo/ui/hooks/use-today';
import { TransactionFilterSearch } from './TransactionFilterSearch';
import { TransactionFiltersSheet } from './TransactionFiltersSheet';
import { TransactionsDesktopFilterControls } from './TransactionsDesktopFilterControls';
import { dateFilterToSearch } from './transactionDateFilter';
import { TRANSACTION_FILTERS } from './transactionFilterConfig';
import { buildTransactionFilterChips } from './transactionFilterSummary';
import {
  buildCleanSearch,
  clearFilterPatch,
  selectionPatch,
} from './transactionFilterUrl';
import { parseImportOutcome } from './transactionSearch';
import { useTransactionFilterOptions } from './useTransactionFilterOptions';
import type { TransactionFilterField } from './transactionFilterConfig';
import type {
  TransactionFilterHandlers,
  TransactionFilterReferenceData,
} from './transactionFilterTypes';
import type { TransactionSearch } from './transactionSearch';

type TransactionsFilterBarProps = {
  search: TransactionSearch;
  referenceData: TransactionFilterReferenceData;
};

type SheetState = { open: boolean; focus: TransactionFilterField | null };

export const TransactionsFilterBar = ({
  search,
  referenceData,
}: TransactionsFilterBarProps) => {
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const today = useToday();

  const [openField, setOpenField] = useState<TransactionFilterField | null>(
    null
  );
  const [sheet, setSheet] = useState<SheetState>({
    open: false,
    focus: null,
  });

  const options = useTransactionFilterOptions(search, referenceData);
  const chips = buildTransactionFilterChips(search, options, today);

  const applySearch = (patch: Partial<TransactionSearch>) =>
    navigate({
      to: '/transactions',
      search: (prev) => buildCleanSearch({ ...prev, page: 1, ...patch }),
      replace: true,
    });

  const handlers: TransactionFilterHandlers = {
    onSelectionChange: (filter, values) =>
      applySearch(selectionPatch(filter.param, values)),
    onDateChange: (filter) => applySearch(dateFilterToSearch(filter)),
    onImportOutcomeChange: (value) => {
      const outcome = parseImportOutcome(value);
      void applySearch(
        outcome
          ? { importOutcome: outcome }
          : { importOutcome: undefined, importBatchId: undefined }
      );
    },
  };

  const handleRemoveChip = (field: TransactionFilterField) => {
    const filter = TRANSACTION_FILTERS.find((f) => f.field === field);
    if (filter) void applySearch(clearFilterPatch(filter));
  };

  const handleSelectChip = (field: TransactionFilterField) => {
    if (isMobile) setSheet({ open: true, focus: field });
    else setOpenField(field);
  };

  // "Clear all" resets filters only — the text search is a separate intent.
  const handleClearFilters = () =>
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

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center gap-2">
        <TransactionFilterSearch
          urlQuery={search.search ?? ''}
          onCommit={(trimmed) =>
            void applySearch({ search: trimmed || undefined })
          }
        />
        <TransactionsDesktopFilterControls
          search={search}
          options={options}
          handlers={handlers}
          openField={openField}
          onOpenFieldChange={setOpenField}
        />
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="shrink-0 gap-1.5 md:hidden"
          onClick={() => setSheet({ open: true, focus: null })}
        >
          <ListFilterIcon className="size-3.5" aria-hidden="true" />
          Filters
          {chips.length > 0 ? (
            <Badge variant="secondary" className="h-4 min-w-4 px-1 text-[10px]">
              {chips.length}
            </Badge>
          ) : null}
        </Button>
      </div>

      <TransactionFiltersSheet
        open={sheet.open}
        focusField={sheet.focus}
        onOpenChange={(open) => setSheet((prev) => ({ ...prev, open }))}
        search={search}
        options={options}
        handlers={handlers}
        activeFilterCount={chips.length}
        onClearAllFilters={handleClearFilters}
      />

      <ActiveFilterChips
        chips={chips}
        onRemove={handleRemoveChip}
        onSelect={handleSelectChip}
        onClearAll={chips.length > 0 ? handleClearFilters : undefined}
      />
    </div>
  );
};
