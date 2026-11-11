import { ListFilterIcon } from 'lucide-react';
import { Badge } from '@ploutizo/ui/components/badge';
import { Button } from '@ploutizo/ui/components/button';
import { TransactionFilterSearch } from './TransactionFilterSearch';
import { TransactionFiltersSheet } from './TransactionFiltersSheet';
import type { TransactionSearch } from './transactionSearch';
import type {
  QuickEditTarget,
  TransactionFilterChangeHandlers,
  TransactionFilterOptions,
} from './transactionFilterTypes';

type TransactionsMobileFilterControlsProps = {
  search: TransactionSearch;
  options: TransactionFilterOptions;
  handlers: TransactionFilterChangeHandlers;
  activeFilterCount: number;
  quickEdit: QuickEditTarget | null;
  onQuickEditChange: (target: QuickEditTarget | null) => void;
  onSearchCommit: (query: string) => void;
  onClearAllFilters: () => void;
};

/** Mobile filter entry point: search plus one button opening the sheet. */
export const TransactionsMobileFilterControls = ({
  search,
  options,
  handlers,
  activeFilterCount,
  quickEdit,
  onQuickEditChange,
  onSearchCommit,
  onClearAllFilters,
}: TransactionsMobileFilterControlsProps) => (
  <>
    <div className="flex items-center gap-2">
      <TransactionFilterSearch
        urlQuery={search.search ?? ''}
        onCommit={onSearchCommit}
      />
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="shrink-0 gap-1.5"
        onClick={() => onQuickEditChange('all')}
      >
        <ListFilterIcon className="size-3.5" />
        Filters
        {activeFilterCount > 0 ? (
          <Badge variant="secondary" className="h-4 min-w-4 px-1 text-[10px]">
            {activeFilterCount}
          </Badge>
        ) : null}
      </Button>
    </div>
    <TransactionFiltersSheet
      open={quickEdit !== null}
      focusField={quickEdit === 'all' ? null : quickEdit}
      onOpenChange={(next) => {
        if (!next) onQuickEditChange(null);
      }}
      search={search}
      typeValues={options.typeValues}
      accountValues={options.accountValues}
      assigneeValues={options.assigneeValues}
      categoryValues={options.categoryValues}
      tagValues={options.tagValues}
      typeOptions={options.typeOptions}
      accountGroups={options.accountGroups}
      categoryOptions={options.categoryOptions}
      tagOptions={options.tagOptions}
      assigneeGroups={options.assigneeGroups}
      importOptions={options.importOptions}
      hasImportResult={options.hasImportResult}
      importValue={options.importValue}
      onTypeChange={handlers.onTypeChange}
      onAccountChange={handlers.onAccountChange}
      onAssigneeChange={handlers.onAssigneeChange}
      onCategoryChange={handlers.onCategoryChange}
      onTagsChange={handlers.onTagsChange}
      onDateChange={handlers.onDateChange}
      onImportOutcomeChange={handlers.onImportOutcomeChange}
      activeFilterCount={activeFilterCount}
      onClearAllFilters={onClearAllFilters}
    />
  </>
);
