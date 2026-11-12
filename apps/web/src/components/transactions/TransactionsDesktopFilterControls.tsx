import { TransactionDateFilterControl } from './TransactionDateFilterControl';
import { TransactionMultiSelectFilter } from './TransactionMultiSelectFilter';
import { TransactionSingleSelectFilter } from './TransactionSingleSelectFilter';
import { TRANSACTION_FILTERS } from './transactionFilterConfig';
import type { TransactionFilterField } from './transactionFilterConfig';
import type { TransactionSearch } from './transactionSearch';
import type {
  TransactionFilterHandlers,
  TransactionFilterOptions,
} from './transactionFilterTypes';

type TransactionsDesktopFilterControlsProps = {
  search: TransactionSearch;
  options: TransactionFilterOptions;
  handlers: TransactionFilterHandlers;
  openField: TransactionFilterField | null;
  onOpenFieldChange: (field: TransactionFilterField | null) => void;
};

export const TransactionsDesktopFilterControls = ({
  search,
  options,
  handlers,
  openField,
  onOpenFieldChange,
}: TransactionsDesktopFilterControlsProps) => (
  // CSS-only breakpoint switch so server and client markup agree.
  <div className="hidden flex-wrap items-center gap-2 md:flex">
    {TRANSACTION_FILTERS.map((filter) => {
      const menuProps = {
        open: openField === filter.field,
        onOpenChange: (open: boolean) =>
          onOpenFieldChange(open ? filter.field : null),
      };
      switch (filter.kind) {
        case 'selection':
          return (
            <TransactionMultiSelectFilter
              key={filter.field}
              filter={filter}
              state={options.selections[filter.field]}
              onChange={(values) => handlers.onSelectionChange(filter, values)}
              {...menuProps}
            />
          );
        case 'date':
          return (
            <TransactionDateFilterControl
              key={filter.field}
              filter={filter}
              search={search}
              onChange={handlers.onDateChange}
              {...menuProps}
            />
          );
        case 'importResult':
          return search.importBatchId ? (
            <TransactionSingleSelectFilter
              key={filter.field}
              filter={filter}
              options={options.importOptions}
              value={options.importValue}
              onChange={handlers.onImportOutcomeChange}
              {...menuProps}
            />
          ) : null;
      }
    })}
  </div>
);
