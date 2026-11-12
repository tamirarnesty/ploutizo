import { useState } from 'react';
import { CheckIcon, ChevronDownIcon } from 'lucide-react';
import { Button } from '@ploutizo/ui/components/button';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@ploutizo/ui/components/collapsible';
import {
  Sheet,
  SheetContent,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from '@ploutizo/ui/components/sheet';
import { useToday } from '@ploutizo/ui/hooks/use-today';
import { TransactionDateEditor } from './TransactionDateFilterControl';
import {
  dateFilterFromSearch,
  formatTransactionDateFilterLabel,
} from './transactionDateFilter';
import { TRANSACTION_FILTERS } from './transactionFilterConfig';
import { summarizeSelection } from './transactionFilterSummary';
import { useOptimisticSelection } from './useOptimisticSelection';
import type { ReactNode } from 'react';
import type { TransactionFilterField } from './transactionFilterConfig';
import type { TransactionSearch } from './transactionSearch';
import type {
  SelectionFilterState,
  TransactionFilterHandlers,
  TransactionFilterOption,
  TransactionFilterOptions,
} from './transactionFilterTypes';

type TransactionFiltersSheetProps = {
  open: boolean;
  focusField: TransactionFilterField | null;
  onOpenChange: (open: boolean) => void;
  search: TransactionSearch;
  options: TransactionFilterOptions;
  handlers: TransactionFilterHandlers;
  activeFilterCount: number;
  onClearAllFilters: () => void;
};

const OptionRow = ({
  label,
  icon,
  checked,
  onClick,
}: {
  label: string;
  icon?: ReactNode;
  checked: boolean;
  onClick: () => void;
}) => (
  <button
    type="button"
    aria-pressed={checked}
    onClick={onClick}
    className="flex w-full items-center justify-between gap-3 px-4 py-2.5 text-left text-sm transition-colors hover:bg-accent"
  >
    <span className="flex min-w-0 items-center gap-2">
      {icon}
      <span className="truncate">{label}</span>
    </span>
    {checked ? (
      <CheckIcon className="size-4 shrink-0" aria-hidden="true" />
    ) : (
      <span className="size-4 shrink-0" aria-hidden="true" />
    )}
  </button>
);

const OptionChecklist = ({
  state,
  onChange,
}: {
  state: SelectionFilterState;
  onChange: (values: string[]) => Promise<void>;
}) => {
  const { selected, toggle } = useOptimisticSelection(state.values, onChange);
  const selectedSet = new Set(selected);

  return (
    <div className="py-1">
      {state.groups.map((group) => (
        <div key={group.key}>
          {group.label ? (
            <div className="px-4 pt-3 pb-1 text-xs font-medium text-muted-foreground">
              {group.label}
            </div>
          ) : null}
          {group.options.map((option) => (
            <OptionRow
              key={option.value}
              label={option.label}
              icon={option.icon}
              checked={selectedSet.has(option.value)}
              onClick={() => toggle(option.value)}
            />
          ))}
        </div>
      ))}
    </div>
  );
};

const SingleChoiceList = ({
  options,
  value,
  allLabel,
  onChange,
}: {
  options: TransactionFilterOption[];
  value: string | undefined;
  allLabel: string;
  onChange: (value: string | undefined) => void;
}) => (
  <div className="py-1">
    <OptionRow
      label={allLabel}
      checked={value === undefined}
      onClick={() => onChange(undefined)}
    />
    {options.map((option) => (
      <OptionRow
        key={option.value}
        label={option.label}
        icon={option.icon}
        checked={value === option.value}
        onClick={() => onChange(option.value)}
      />
    ))}
  </div>
);

const AccordionSection = ({
  title,
  summary,
  open,
  onOpenChange,
  children,
}: {
  title: string;
  summary: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  children: ReactNode;
}) => (
  <Collapsible
    open={open}
    onOpenChange={onOpenChange}
    className="border-b border-border last:border-b-0"
  >
    <CollapsibleTrigger className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left transition-colors hover:bg-accent">
      <span className="flex min-w-0 items-baseline gap-2 text-sm">
        <span className="font-medium">{title}</span>
        <span className="truncate text-muted-foreground">{summary}</span>
      </span>
      <ChevronDownIcon
        className={`size-4 shrink-0 text-muted-foreground transition-transform ${open ? 'rotate-180' : ''}`}
      />
    </CollapsibleTrigger>
    {/* Closed panels unmount after their exit animation, so editors inside
        start from the committed value each time a section expands. */}
    <CollapsibleContent>{children}</CollapsibleContent>
  </Collapsible>
);

export const TransactionFiltersSheet = ({
  open,
  focusField,
  onOpenChange,
  search,
  options,
  handlers,
  activeFilterCount,
  onClearAllFilters,
}: TransactionFiltersSheetProps) => {
  const today = useToday();
  const [expanded, setExpanded] = useState<TransactionFilterField | null>(null);
  const [openState, setOpenState] = useState({ open, focusField });

  // Synced during render so the sheet body never flashes the previous section.
  if (openState.open !== open || openState.focusField !== focusField) {
    setOpenState({ open, focusField });
    if (open) setExpanded(focusField);
  }

  const dateFilter = dateFilterFromSearch(search);
  const dateFilterKey = [
    search.dateFrom ?? '',
    search.dateTo ?? '',
    search.dateRange_op ?? '',
  ].join(':');
  const sectionProps = (field: TransactionFilterField) => ({
    open: expanded === field,
    onOpenChange: (next: boolean) => setExpanded(next ? field : null),
  });

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="max-h-[85dvh] gap-0 p-0">
        <SheetHeader className="border-b px-4 py-3">
          <SheetTitle>Filters</SheetTitle>
        </SheetHeader>
        <div className="flex-1 overflow-y-auto pb-2">
          {TRANSACTION_FILTERS.map((filter) => {
            switch (filter.kind) {
              case 'selection': {
                const state = options.selections[filter.field];
                return (
                  <AccordionSection
                    key={filter.field}
                    title={filter.label}
                    summary={summarizeSelection(
                      state.values,
                      state.labels,
                      filter.allLabel
                    )}
                    {...sectionProps(filter.field)}
                  >
                    <OptionChecklist
                      state={state}
                      onChange={(values) =>
                        handlers.onSelectionChange(filter, values)
                      }
                    />
                  </AccordionSection>
                );
              }
              case 'date':
                return (
                  <AccordionSection
                    key={filter.field}
                    title={filter.label}
                    summary={formatTransactionDateFilterLabel(
                      dateFilter,
                      today
                    )}
                    {...sectionProps(filter.field)}
                  >
                    <TransactionDateEditor
                      key={dateFilterKey}
                      filter={dateFilter}
                      numberOfMonths={1}
                      onApply={(next) => {
                        handlers.onDateChange(next);
                        setExpanded(null);
                      }}
                      onCancel={() => setExpanded(null)}
                    />
                  </AccordionSection>
                );
              case 'importResult':
                return search.importBatchId ? (
                  <AccordionSection
                    key={filter.field}
                    title={filter.label}
                    summary={
                      options.importOptions.find(
                        (option) => option.value === options.importValue
                      )?.label ?? filter.allLabel
                    }
                    {...sectionProps(filter.field)}
                  >
                    <SingleChoiceList
                      options={options.importOptions}
                      value={options.importValue}
                      allLabel={filter.allLabel}
                      onChange={(value) => {
                        handlers.onImportOutcomeChange(value);
                        setExpanded(null);
                      }}
                    />
                  </AccordionSection>
                ) : null;
            }
          })}
        </div>
        <SheetFooter className="flex-row justify-between border-t">
          <Button
            type="button"
            variant="ghost"
            disabled={activeFilterCount === 0}
            onClick={() => {
              setExpanded(null);
              onClearAllFilters();
            }}
          >
            Clear all
          </Button>
          <Button type="button" onClick={() => onOpenChange(false)}>
            Done
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
};
