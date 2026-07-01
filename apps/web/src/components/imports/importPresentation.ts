import { formatAccountLabel } from '@ploutizo/utils';
import { IMPORT_TRANSACTION_TYPE_VALUES } from '@ploutizo/types';
import { cn } from '@ploutizo/ui/lib/utils';
import type {
  ImportDraft,
  ImportDraftRow,
  ImportDraftSummary,
  ImportTransactionType,
  OrgMember,
} from '@ploutizo/types';

export { formatAccountLabel };

const IMPORT_TRANSACTION_TYPE_LABELS: Record<ImportTransactionType, string> = {
  expense: 'Expense',
  refund: 'Refund',
  settlement: 'Settlement',
};

const isImportTransactionType = (
  value: string | null | undefined
): value is ImportTransactionType =>
  IMPORT_TRANSACTION_TYPE_VALUES.includes(value as ImportTransactionType);

export const resolveImportRowType = (
  row: ImportDraftRow
): ImportTransactionType | null =>
  row.reviewType ??
  row.parsedType ??
  (isImportTransactionType(row.sourceType) ? row.sourceType : null);

export const formatImportTransactionTypeLabel = (
  type: ImportTransactionType
): string => IMPORT_TRANSACTION_TYPE_LABELS[type];

const importTypeBadgeClassName: Record<ImportTransactionType, string> = {
  expense: '',
  refund:
    'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
  settlement:
    'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
};

const importTypeBadgeVariant: Record<
  ImportTransactionType,
  'destructive' | 'secondary' | 'default' | 'outline' | undefined
> = {
  expense: 'destructive',
  refund: undefined,
  settlement: undefined,
};

export const renderImportTransactionTypeBadgeProps = (
  type: ImportTransactionType
) => ({
  label: formatImportTransactionTypeLabel(type),
  variant: importTypeBadgeVariant[type],
  className: cn(
    importTypeBadgeClassName[type],
    type === 'settlement' && 'opacity-60'
  ),
});

export const formatDraftAccountLabel = (
  draft: ImportDraftSummary | ImportDraft
): string =>
  formatAccountLabel({
    name: draft.accountName,
    institution: draft.accountInstitution,
    lastFour: draft.accountLastFour,
  });

export const importStatusVariant = (status: ImportDraftRow['status']) => {
  if (status === 'invalid') return 'destructive' as const;
  if (status === 'ready') return 'outline' as const;
  return 'secondary' as const;
};

const CSV_ASSIGNEE_HINT_KEYS = [
  'assignee hint',
  'assignee_hint',
  'assignee',
  'Assignee Hint',
] as const;

export const getImportRowCsvAssigneeHint = (
  row: ImportDraftRow
): string | null => {
  for (const key of CSV_ASSIGNEE_HINT_KEYS) {
    const value = row.rawData[key];
    if (value) {
      const trimmed = value.trim();
      if (trimmed) return trimmed;
    }
  }
  return null;
};

export const matchOrgMemberIdByHint = (
  hint: string | null | undefined,
  orgMembers: OrgMember[]
): string | null => {
  if (!hint) return null;
  const normalized = hint.trim().toLowerCase();
  if (!normalized) return null;

  const exact = orgMembers.find(
    (member) => member.displayName.trim().toLowerCase() === normalized
  );
  if (exact) return exact.id;

  const partial = orgMembers.find((member) => {
    const displayName = member.displayName.trim().toLowerCase();
    return displayName.includes(normalized) || normalized.includes(displayName);
  });
  return partial?.id ?? null;
};

export const resolveCategoryIdByName = (
  categoryName: string | null | undefined,
  categories: { id: string; name: string }[]
): string => {
  if (!categoryName) return '';
  const normalized = categoryName.trim().toLowerCase();
  return (
    categories.find(
      (category) => category.name.trim().toLowerCase() === normalized
    )?.id ?? ''
  );
};
