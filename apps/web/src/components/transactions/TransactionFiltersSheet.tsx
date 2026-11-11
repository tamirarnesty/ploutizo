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
import { TransactionDatePopoverBody } from './TransactionDateFilterControl';
import {
  dateFilterFromSearch,
  formatTransactionDateFilterLabel,
} from './transactionDateFilter';
import { useOptimisticSelection } from './useOptimisticSelection';
import type { TransactionSearch } from './transactionSearch';
import type { ReactNode } from 'react';

type Option = { value: string; label: string; icon?: ReactNode };
type OptionGroup = { key: string; label?: string; options: Option[] };

/** Fields the sheet can expand to; `dateRange` is the date section's key. */
export type TransactionFilterSheetField =
  | 'type'
  | 'date'
  | 'account'
  | 'assignee'
  | 'category'
  | 'tag'
  | 'importResult';

type TransactionFiltersSheetProps = {
  open: boolean;
  /** Section expanded on open; null opens with every section collapsed. */
  focusField: TransactionFilterSheetField | null;
  onOpenChange: (open: boolean) => void;
  search: TransactionSearch;
  typeValues: string[];
  accountValues: string[];
  assigneeValues: string[];
  categoryValues: string[];
  tagValues: string[];
  typeOptions: Option[];
  accountGroups: OptionGroup[];
  categoryOptions: Option[];
  tagOptions: Option[];
  assigneeGroups: OptionGroup[];
  importOptions: Option[];
  hasImportResult: boolean;
  importValue: string | undefined;
  onTypeChange: (values: string[]) => void;
  onAccountChange: (values: string[]) => void;
  onAssigneeChange: (values: string[]) => void;
  onCategoryChange: (values: string[]) => void;
  onTagsChange: (values: string[]) => void;
  onDateChange: (next: { operator: string; values: string[] }) => void;
  onImportOutcomeChange: (value: string | undefined) => void;
  activeFilterCount: number;
  onClearAllFilters: () => void;
};

const selectionLabel = (
  values: string[],
  groups: OptionGroup[],
  allLabel: string
) => {
  if (values.length === 0) return allLabel;
  const byValue = new Map(
    groups.flatMap((group) =>
      group.options.map((option) => [option.value, option.label])
    )
  );
  return values.map((value) => byValue.get(value) ?? value).join(', ');
};

const dateLabel = (search: TransactionSearch) => {
  const state = dateFilterFromSearch(search);
  return formatTransactionDateFilterLabel(state.operator, state.values);
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
    onClick={onClick}
    className="flex w-full items-center justify-between gap-3 px-4 py-2.5 text-left text-sm transition-colors hover:bg-accent"
  >
    <span className="flex min-w-0 items-center gap-2">
      {icon}
      <span className="truncate">{label}</span>
    </span>
    {checked ? (
      <CheckIcon className="size-4 shrink-0" />
    ) : (
      <span className="size-4 shrink-0" aria-hidden="true" />
    )}
  </button>
);

/** Multi-select checklist — draft mirrors the dropdown's optimistic toggle
 *  behavior while the URL catches up. */
const OptionChecklist = ({
  groups,
  values,
  onChange,
}: {
  groups: OptionGroup[];
  values: string[];
  onChange: (values: string[]) => void;
}) => {
  const { selectedSet, toggle } = useOptimisticSelection(values, onChange);

  return (
    <div className="py-1">
      {groups.map((group) => (
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
  options: Option[];
  value: string | undefined;
  allLabel: string;
  onChange: (value: string | undefined) => void;
}) => {
  return (
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
};

/** Accordion row: field name + current value summary, expands to its options. */
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
    <CollapsibleContent>{children}</CollapsibleContent>
  </Collapsible>
);

/**
 * Mobile filter sheet: every transaction filter as a collapsed accordion
 * section with its current value as the summary. Multi-select sections commit
 * on each tap; the date section stages edits behind its own Apply.
 */
export const TransactionFiltersSheet = ({
  open,
  focusField,
  onOpenChange,
  search,
  typeValues,
  accountValues,
  assigneeValues,
  categoryValues,
  tagValues,
  typeOptions,
  accountGroups,
  categoryOptions,
  tagOptions,
  assigneeGroups,
  importOptions,
  hasImportResult,
  importValue,
  onTypeChange,
  onAccountChange,
  onAssigneeChange,
  onCategoryChange,
  onTagsChange,
  onDateChange,
  onImportOutcomeChange,
  activeFilterCount,
  onClearAllFilters,
}: TransactionFiltersSheetProps) => {
  const [expanded, setExpanded] = useState<TransactionFilterSheetField | null>(
    null
  );
  const [openState, setOpenState] = useState({ open, focusField });

  // Opening via an applied chip expands that field's section; the Filters
  // button (focusField null) opens with every section collapsed. Adjusted
  // during render so the sheet body never flashes the previous section.
  if (openState.open !== open || openState.focusField !== focusField) {
    setOpenState({ open, focusField });
    if (open) setExpanded(focusField);
  }

  const dateState = dateFilterFromSearch(search);
  const expand = (field: TransactionFilterSheetField) => (next: boolean) =>
    setExpanded(next ? field : null);

  const importSummary =
    importOptions.find((option) => option.value === importValue)?.label ??
    'All results';

  return (
    <Sheet
      open={open}
      onOpenChange={(next) => {
        if (!next) onOpenChange(false);
      }}
    >
      <SheetContent side="bottom" className="max-h-[85dvh] gap-0 p-0">
        <SheetHeader className="border-b px-4 py-3">
          <SheetTitle>Filters</SheetTitle>
        </SheetHeader>
        <div className="flex-1 overflow-y-auto pb-2">
          <AccordionSection
            title="Type"
            summary={selectionLabel(
              typeValues,
              [{ key: 'type', options: typeOptions }],
              'All types'
            )}
            open={expanded === 'type'}
            onOpenChange={expand('type')}
          >
            <OptionChecklist
              groups={[{ key: 'type', options: typeOptions }]}
              values={typeValues}
              onChange={onTypeChange}
            />
          </AccordionSection>
          <AccordionSection
            title="Date"
            summary={dateLabel(search)}
            open={expanded === 'date'}
            onOpenChange={expand('date')}
          >
            {expanded === 'date' ? (
              <TransactionDatePopoverBody
                operator={dateState.operator}
                values={dateState.values}
                onApply={(next) => {
                  if (next) onDateChange(next);
                  setExpanded(null);
                }}
              />
            ) : null}
          </AccordionSection>
          <AccordionSection
            title="Account"
            summary={selectionLabel(
              accountValues,
              accountGroups,
              'All accounts'
            )}
            open={expanded === 'account'}
            onOpenChange={expand('account')}
          >
            <OptionChecklist
              groups={accountGroups}
              values={accountValues}
              onChange={onAccountChange}
            />
          </AccordionSection>
          <AccordionSection
            title="Assignee"
            summary={selectionLabel(
              assigneeValues,
              assigneeGroups,
              'All assignees'
            )}
            open={expanded === 'assignee'}
            onOpenChange={expand('assignee')}
          >
            <OptionChecklist
              groups={assigneeGroups}
              values={assigneeValues}
              onChange={onAssigneeChange}
            />
          </AccordionSection>
          <AccordionSection
            title="Category"
            summary={selectionLabel(
              categoryValues,
              [{ key: 'category', options: categoryOptions }],
              'All categories'
            )}
            open={expanded === 'category'}
            onOpenChange={expand('category')}
          >
            <OptionChecklist
              groups={[{ key: 'category', options: categoryOptions }]}
              values={categoryValues}
              onChange={onCategoryChange}
            />
          </AccordionSection>
          <AccordionSection
            title="Tags"
            summary={selectionLabel(
              tagValues,
              [{ key: 'tag', options: tagOptions }],
              'All tags'
            )}
            open={expanded === 'tag'}
            onOpenChange={expand('tag')}
          >
            <OptionChecklist
              groups={[{ key: 'tag', options: tagOptions }]}
              values={tagValues}
              onChange={onTagsChange}
            />
          </AccordionSection>
          {hasImportResult ? (
            <AccordionSection
              title="Import result"
              summary={importSummary}
              open={expanded === 'importResult'}
              onOpenChange={expand('importResult')}
            >
              <SingleChoiceList
                options={importOptions}
                value={importValue}
                allLabel="All results"
                onChange={(value) => {
                  onImportOutcomeChange(value);
                  setExpanded(null);
                }}
              />
            </AccordionSection>
          ) : null}
        </div>
        <SheetFooter className="flex-row justify-between border-t">
          <Button
            type="button"
            variant="ghost"
            disabled={activeFilterCount === 0}
            onClick={onClearAllFilters}
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
