import {
  ArrowLeftRightIcon,
  ImportIcon,
  Layers2Icon,
  TagsIcon,
  UsersIcon,
  WalletIcon,
} from 'lucide-react';
import { TransactionDateFilterControl } from './TransactionDateFilterControl';
import { TransactionFilterSearch } from './TransactionFilterSearch';
import { TransactionMultiSelectFilter } from './TransactionMultiSelectFilter';
import { TransactionSingleSelectFilter } from './TransactionSingleSelectFilter';
import type { TransactionSearch } from './transactionSearch';
import type {
  QuickEditTarget,
  TransactionFilterChangeHandlers,
  TransactionFilterOptions,
} from './transactionFilterTypes';

type TransactionsDesktopFilterControlsProps = {
  search: TransactionSearch;
  options: TransactionFilterOptions;
  handlers: TransactionFilterChangeHandlers;
  quickEdit: QuickEditTarget | null;
  onQuickEditChange: (target: QuickEditTarget | null) => void;
  onSearchCommit: (query: string) => void;
};

/** Desktop quick controls: every transaction filter stays one click away. */
export const TransactionsDesktopFilterControls = ({
  search,
  options,
  handlers,
  quickEdit,
  onQuickEditChange,
  onSearchCommit,
}: TransactionsDesktopFilterControlsProps) => {
  const quickEditProps = (target: Exclude<QuickEditTarget, 'all'>) => ({
    open: quickEdit === target,
    onOpenChange: (open: boolean) => onQuickEditChange(open ? target : null),
  });

  return (
    <div className="flex flex-wrap items-center gap-2">
      <TransactionFilterSearch
        urlQuery={search.search ?? ''}
        onCommit={onSearchCommit}
      />
      <div className="flex items-center gap-2">
        <TransactionMultiSelectFilter
          icon={<ArrowLeftRightIcon className="size-3.5" />}
          groups={[{ key: 'type', options: options.typeOptions }]}
          values={options.typeValues}
          allLabel="All types"
          onChange={handlers.onTypeChange}
          {...quickEditProps('type')}
        />
        <TransactionDateFilterControl
          search={search}
          onChange={handlers.onDateChange}
          {...quickEditProps('date')}
        />
        <TransactionMultiSelectFilter
          icon={<WalletIcon className="size-3.5" />}
          groups={options.accountGroups}
          values={options.accountValues}
          allLabel="All accounts"
          onChange={handlers.onAccountChange}
          {...quickEditProps('account')}
        />
        <TransactionMultiSelectFilter
          icon={<UsersIcon className="size-3.5" />}
          groups={options.assigneeGroups}
          values={options.assigneeValues}
          allLabel="All assignees"
          onChange={handlers.onAssigneeChange}
          {...quickEditProps('assignee')}
        />
        <TransactionMultiSelectFilter
          icon={<Layers2Icon className="size-3.5" />}
          groups={[{ key: 'category', options: options.categoryOptions }]}
          values={options.categoryValues}
          allLabel="All categories"
          onChange={handlers.onCategoryChange}
          {...quickEditProps('category')}
        />
        <TransactionMultiSelectFilter
          icon={<TagsIcon className="size-3.5" />}
          groups={[{ key: 'tag', options: options.tagOptions }]}
          values={options.tagValues}
          allLabel="All tags"
          onChange={handlers.onTagsChange}
          {...quickEditProps('tag')}
        />
        {search.importBatchId ? (
          <TransactionSingleSelectFilter
            icon={<ImportIcon className="size-3.5" />}
            options={options.importOptions}
            value={options.importValue}
            allLabel="All results"
            onChange={handlers.onImportOutcomeChange}
            {...quickEditProps('importResult')}
          />
        ) : null}
      </div>
    </div>
  );
};
