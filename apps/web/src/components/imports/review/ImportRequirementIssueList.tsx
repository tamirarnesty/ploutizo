import { Text } from '@ploutizo/ui/components/text';
import type { ImportRequirementFailure } from '@ploutizo/types';
import { getImportRequirementCopy } from '@/lib/data-access/imports';

interface ImportRequirementIssueListProps {
  issues: readonly ImportRequirementFailure[];
  rowLabels: ReadonlyMap<string, string>;
  onFocusRow?: (rowId: string) => void;
}

export const ImportRequirementIssueList = ({
  issues,
  rowLabels,
  onFocusRow,
}: ImportRequirementIssueListProps) => {
  if (issues.length === 0) return null;

  return (
    <div
      className="rounded-md border border-destructive/30 bg-destructive/5 p-3"
      role="alert"
    >
      <Text as="h3" variant="label" className="text-destructive">
        Fix these import issues
      </Text>
      <ul className="mt-2 space-y-1">
        {issues.map((issue, index) => {
          const rowLabel = rowLabels.get(issue.batchRowId) ?? 'this row';
          return (
            <li key={`${issue.batchRowId}-${issue.key}-${index}`}>
              <button
                type="button"
                className="text-left text-sm text-destructive underline-offset-2 hover:underline"
                onClick={() => onFocusRow?.(issue.batchRowId)}
              >
                {rowLabel}: {getImportRequirementCopy(issue.key)}
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
};
