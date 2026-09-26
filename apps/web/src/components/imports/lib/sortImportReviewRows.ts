import { resolveReviewedImportValues } from '@ploutizo/utils/reviewed-import-values';
import { memberFullLabel } from '@ploutizo/utils/member-label';
import type {
  ImportReviewRow,
  ImportRowStatus,
  MemberIdentity,
} from '@ploutizo/types';
import type { SortingState } from '@tanstack/react-table';

const STATUS_RANK: Record<ImportRowStatus, number> = {
  invalid: 0,
  needs_review: 1,
  ready: 2,
};

interface ImportReviewSortSources {
  categories: readonly { id: string; name: string }[];
  accounts: readonly { id: string; name: string }[];
  orgMembers: readonly Pick<
    MemberIdentity,
    'id' | 'firstName' | 'lastName' | 'email'
  >[];
}

interface ImportReviewSortKey {
  row: ImportReviewRow;
  status: number;
  date: string | null;
  amount: number | null;
  type: string | null;
  description: string | null;
  category: string | null;
  assignee: string | null;
}

const compareOptionalText = (
  left: string | null,
  right: string | null
): number => {
  if (!left && !right) return 0;
  if (!left) return -1;
  if (!right) return 1;
  return left.localeCompare(right, undefined, { sensitivity: 'base' });
};

const compareOptionalNumber = (
  left: number | null,
  right: number | null
): number => {
  if (left == null && right == null) return 0;
  if (left == null) return -1;
  if (right == null) return 1;
  return left - right;
};

const namedValue = (
  id: string | null,
  names: ReadonlyMap<string, string>
): string | null => (id ? (names.get(id) ?? null) : null);

const assigneeLabel = (
  memberIds: readonly string[],
  memberLabelById: ReadonlyMap<string, string>
): string | null => {
  const labels = memberIds
    .map((id) => memberLabelById.get(id))
    .filter((label): label is string => Boolean(label))
    .sort((left, right) =>
      left.localeCompare(right, undefined, { sensitivity: 'base' })
    );
  return labels.length > 0 ? labels.join(', ') : null;
};

const compareSortKey = (
  columnId: string,
  left: ImportReviewSortKey,
  right: ImportReviewSortKey
): number => {
  switch (columnId) {
    case 'selection':
      return left.status - right.status;
    case 'date':
      return compareOptionalText(left.date, right.date);
    case 'amount':
      return compareOptionalNumber(left.amount, right.amount);
    case 'type':
      return compareOptionalText(left.type, right.type);
    case 'description':
      return compareOptionalText(left.description, right.description);
    case 'category':
      return compareOptionalText(left.category, right.category);
    case 'assignee':
      return compareOptionalText(left.assignee, right.assignee);
    default:
      return 0;
  }
};

const sortKeyForRow = (
  row: ImportReviewRow,
  categoryNameById: ReadonlyMap<string, string>,
  accountNameById: ReadonlyMap<string, string>,
  memberLabelById: ReadonlyMap<string, string>
): ImportReviewSortKey => {
  const values = resolveReviewedImportValues(row);
  const category =
    values.type === 'settlement'
      ? namedValue(values.counterpartAccountId, accountNameById)
      : namedValue(values.categoryId, categoryNameById);

  return {
    row,
    status: STATUS_RANK[row.status],
    date: values.date,
    amount: values.amount,
    type: values.type,
    description: values.description,
    category,
    assignee: assigneeLabel(values.assigneeMemberIds, memberLabelById),
  };
};

export const sortImportReviewRows = (
  rows: readonly ImportReviewRow[],
  sorting: SortingState,
  { categories, accounts, orgMembers }: ImportReviewSortSources
): readonly ImportReviewRow[] => {
  if (sorting.length === 0) return rows;

  const categoryNameById = new Map(
    categories.map((category) => [category.id, category.name])
  );
  const accountNameById = new Map(
    accounts.map((account) => [account.id, account.name])
  );
  const memberLabelById = new Map(
    orgMembers.map((member) => [member.id, memberFullLabel(member)])
  );
  const keys = rows.map((row) =>
    sortKeyForRow(row, categoryNameById, accountNameById, memberLabelById)
  );

  keys.sort((left, right) => {
    for (const sort of sorting) {
      const compared = compareSortKey(sort.id, left, right);
      if (compared !== 0) return sort.desc ? -compared : compared;
    }
    return left.row.rowNumber - right.row.rowNumber;
  });

  return keys.map((key) => key.row);
};
