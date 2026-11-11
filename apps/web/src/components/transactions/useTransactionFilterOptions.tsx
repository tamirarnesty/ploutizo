import { useMemo } from 'react';
import { memberFullLabel } from '@ploutizo/utils';
import { ACCOUNT_TYPE_OPTIONS } from '@/components/accounts/accountTypes';
import { CachedLucideIcon } from '@/components/categories/CachedLucideIcon';
import { UserAvatar } from '@/components/members/UserAvatar';
import {
  ASSIGNEE_SHAPE_OPTIONS,
  IMPORT_OUTCOME_ICONS,
  IMPORT_OUTCOME_OPTIONS,
  TRANSACTION_TYPE_ICONS,
  TRANSACTION_TYPE_OPTIONS,
} from './TransactionFilterFields';
import type { TransactionSearch } from './transactionSearch';
import type {
  TransactionFilterAccount,
  TransactionFilterCategory,
  TransactionFilterMember,
  TransactionFilterOptions,
  TransactionFilterTag,
} from './transactionFilterTypes';

const splitParam = (value: string | undefined): string[] =>
  value ? value.split(',').filter(Boolean) : [];

/** Selected values and labelled options for every transaction quick filter. */
export const useTransactionFilterOptions = (
  search: TransactionSearch,
  accounts: TransactionFilterAccount[],
  categories: TransactionFilterCategory[],
  members: TransactionFilterMember[],
  tags: TransactionFilterTag[]
): TransactionFilterOptions => {
  const typeValues = useMemo(() => splitParam(search.type), [search.type]);
  const typeOptions = useMemo(
    () =>
      TRANSACTION_TYPE_OPTIONS.map((option) => {
        const Icon = TRANSACTION_TYPE_ICONS[option.value];
        return {
          ...option,
          icon: <Icon className="size-3.5" aria-hidden="true" />,
        };
      }),
    []
  );
  const accountValues = useMemo(
    () => splitParam(search.accountId),
    [search.accountId]
  );
  const accountGroups = useMemo(
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
              icon: <Icon className="size-3.5" aria-hidden="true" />,
            })),
        };
      }).filter((group) => group.options.length > 0),
    [accounts]
  );
  const assigneeValues = useMemo(
    () => splitParam(search.assigneeId),
    [search.assigneeId]
  );
  const assigneeGroups = useMemo(
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
                className="size-5 bg-muted"
              />
            ),
          };
        }),
      },
      {
        key: 'sharing',
        label: 'Sharing',
        options: ASSIGNEE_SHAPE_OPTIONS,
      },
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
        icon: <CachedLucideIcon name={category.icon ?? null} size={14} />,
      })),
    [categories]
  );
  const tagValues = useMemo(() => splitParam(search.tagIds), [search.tagIds]);
  const tagOptions = useMemo(
    () =>
      tags.map((tag) => ({
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
    [tags]
  );
  const importOptions = useMemo(
    () =>
      IMPORT_OUTCOME_OPTIONS.map((option) => {
        const Icon = IMPORT_OUTCOME_ICONS[option.value];
        return {
          ...option,
          icon: <Icon className="size-3.5" aria-hidden="true" />,
        };
      }),
    []
  );

  return {
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
    hasImportResult: Boolean(search.importBatchId),
    importValue: search.importOutcome,
  };
};
