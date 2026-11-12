import { useMemo } from 'react';
import { memberFullLabel } from '@ploutizo/utils';
import { ACCOUNT_TYPE_OPTIONS } from '@/components/accounts/accountTypes';
import { CachedLucideIcon } from '@/components/categories/CachedLucideIcon';
import { UserAvatar } from '@/components/members/UserAvatar';
import {
  ASSIGNEE_SHAPE_OPTIONS,
  IMPORT_OUTCOME_OPTIONS,
  TRANSACTION_TYPE_OPTIONS,
  UNCATEGORIZED_OPTION,
  UNTAGGED_OPTION,
  mapSelectionFilters,
} from './transactionFilterConfig';
import { parseFilterList } from './transactionSearch';
import type { SelectionFilterConfig } from './transactionFilterConfig';
import type { TransactionSearch } from './transactionSearch';
import type {
  SelectionFilterState,
  TransactionFilterOptionGroup,
  TransactionFilterOptions,
  TransactionFilterReferenceData,
} from './transactionFilterTypes';

const ICON_CLASS = 'size-3.5';

const buildSelection = (
  config: SelectionFilterConfig,
  values: string[],
  groups: TransactionFilterOptionGroup[],
  referencesLoaded: boolean
): SelectionFilterState => {
  const labels = new Map(
    groups.flatMap((group) =>
      group.options.map((option) => [option.value, option.label] as const)
    )
  );
  // A selected value with no option is a deleted entity — or, until the
  // reference lists arrive, simply not resolved yet.
  const unresolved = referencesLoaded ? config.missingLabel : 'Loading…';
  for (const value of values) {
    if (!labels.has(value)) labels.set(value, unresolved);
  }
  return { values, groups, labels };
};

/** Selected values and labelled options for every transaction filter. */
export const useTransactionFilterOptions = (
  search: TransactionSearch,
  {
    accounts,
    categories,
    members,
    tags,
    loaded,
  }: TransactionFilterReferenceData
): TransactionFilterOptions => {
  const typeGroups = useMemo<TransactionFilterOptionGroup[]>(
    () => [
      {
        key: 'type',
        options: TRANSACTION_TYPE_OPTIONS.map(({ icon: Icon, ...option }) => ({
          ...option,
          icon: <Icon className={ICON_CLASS} aria-hidden="true" />,
        })),
      },
    ],
    []
  );

  const accountGroups = useMemo<TransactionFilterOptionGroup[]>(
    () =>
      ACCOUNT_TYPE_OPTIONS.map((typeOption) => {
        const Icon = typeOption.icon;
        return {
          key: `account-type-${typeOption.value}`,
          label: typeOption.label,
          options: accounts
            .filter((account) => account.type === typeOption.value)
            .map((account) => ({
              value: account.id,
              label: account.name,
              icon: <Icon className={ICON_CLASS} aria-hidden="true" />,
            })),
        };
      }).filter((group) => group.options.length > 0),
    [accounts]
  );

  const assigneeGroups = useMemo<TransactionFilterOptionGroup[]>(
    () => [
      {
        key: 'members',
        label: 'Members',
        options: members.map((member) => {
          const label = memberFullLabel(member);
          return {
            value: member.id,
            label,
            icon: (
              <UserAvatar
                name={label}
                imageUrl={member.imageUrl}
                size="sm"
                // Menu popups are translucent; the muted fill keeps initials legible.
                className="size-5 bg-muted"
              />
            ),
          };
        }),
      },
      { key: 'sharing', label: 'Sharing', options: ASSIGNEE_SHAPE_OPTIONS },
    ],
    [members]
  );

  const categoryGroups = useMemo<TransactionFilterOptionGroup[]>(
    () => [
      {
        key: 'category',
        options: [
          UNCATEGORIZED_OPTION,
          ...categories.map((category) => ({
            value: category.id,
            label: category.name,
            icon: <CachedLucideIcon name={category.icon ?? null} size={14} />,
          })),
        ],
      },
    ],
    [categories]
  );

  const tagGroups = useMemo<TransactionFilterOptionGroup[]>(
    () => [
      {
        key: 'tag',
        options: [
          UNTAGGED_OPTION,
          ...tags.map((tag) => ({
            value: tag.id,
            label: tag.name,
            icon: tag.colour ? (
              <span
                className="size-2.5 shrink-0 rounded-full"
                style={{ backgroundColor: tag.colour }}
                aria-hidden="true"
              />
            ) : undefined,
          })),
        ],
      },
    ],
    [tags]
  );

  const importOptions = useMemo(
    () =>
      IMPORT_OUTCOME_OPTIONS.map(({ icon: Icon, ...option }) => ({
        ...option,
        icon: <Icon className={ICON_CLASS} aria-hidden="true" />,
      })),
    []
  );

  const selections = useMemo(() => {
    const groupsByField = {
      type: typeGroups,
      account: accountGroups,
      assignee: assigneeGroups,
      category: categoryGroups,
      tag: tagGroups,
    };
    return mapSelectionFilters((config) =>
      buildSelection(
        config,
        parseFilterList(search[config.param]),
        groupsByField[config.field],
        loaded
      )
    );
  }, [
    search,
    typeGroups,
    accountGroups,
    assigneeGroups,
    categoryGroups,
    tagGroups,
    loaded,
  ]);

  return { selections, importOptions, importValue: search.importOutcome };
};
