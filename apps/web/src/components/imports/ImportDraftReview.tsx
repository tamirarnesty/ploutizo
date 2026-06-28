import { Badge } from '@ploutizo/ui/components/badge';
import { Skeleton } from '@ploutizo/ui/components/skeleton';
import { Text } from '@ploutizo/ui/components/text';
import type { ImportDraft, ImportDraftSummary } from '@ploutizo/types';
import { formatDraftAccountLabel } from './importPresentation';
import { ImportDraftReviewRow } from './ImportDraftReviewRow';

interface ImportDraftReviewProps {
  draft?: ImportDraft;
  summary?: ImportDraftSummary | null;
  isLoading?: boolean;
}

const ImportDraftReviewRowsSkeleton = () => (
  <>
    {Array.from({ length: 3 }, (_, i) => (
      <tr key={i} className="border-b border-border last:border-b-0">
        <td className="px-3 py-2">
          <Skeleton className="h-4 w-8" />
        </td>
        <td className="px-3 py-2">
          <Skeleton className="h-6 w-16 rounded-full" />
        </td>
        <td className="px-3 py-2">
          <Skeleton className="h-4 w-20" />
        </td>
        <td className="px-3 py-2">
          <Skeleton className="ml-auto h-4 w-20" />
        </td>
        <td className="px-3 py-2">
          <Skeleton className="h-4 w-16" />
        </td>
        <td className="px-3 py-2">
          <Skeleton className="h-4 w-48" />
        </td>
        <td className="px-3 py-2">
          <Skeleton className="h-4 w-28" />
        </td>
        <td className="px-3 py-2">
          <Skeleton className="h-4 w-28" />
        </td>
        <td className="px-3 py-2">
          <Skeleton className="h-4 w-32" />
        </td>
        <td className="px-3 py-2">
          <Skeleton className="h-4 w-24" />
        </td>
      </tr>
    ))}
  </>
);

export const ImportDraftReview = ({
  draft,
  summary,
  isLoading = false,
}: ImportDraftReviewProps) => {
  const reviewDraft = draft ?? summary;

  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          {reviewDraft ? (
            <>
              <Text as="h2" variant="h3" className="truncate">
                {formatDraftAccountLabel(reviewDraft)}
              </Text>
              <Text
                variant="body-sm"
                className="truncate text-muted-foreground"
              >
                {reviewDraft.fileName ?? 'Untitled CSV'}
              </Text>
            </>
          ) : (
            <div className="space-y-2">
              <Skeleton className="h-7 w-48" />
              <Skeleton className="h-4 w-36" />
            </div>
          )}
        </div>
        <div className="flex gap-2">
          {reviewDraft ? (
            <>
              <Badge variant="outline">
                {reviewDraft.validRowCount} reviewable
              </Badge>
              {reviewDraft.invalidRowCount > 0 ? (
                <Badge variant="destructive">
                  {reviewDraft.invalidRowCount} invalid
                </Badge>
              ) : null}
            </>
          ) : (
            <>
              <Skeleton className="h-6 w-24 rounded-full" />
              <Skeleton className="h-6 w-20 rounded-full" />
            </>
          )}
        </div>
      </div>

      <div className="overflow-hidden rounded-md border border-border">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[980px] text-left text-sm">
            <thead className="border-b border-border bg-muted/40">
              <tr>
                <th className="w-16 px-3 py-2 font-medium">Row</th>
                <th className="w-32 px-3 py-2 font-medium">Status</th>
                <th className="w-28 px-3 py-2 font-medium">Date</th>
                <th className="w-28 px-3 py-2 text-right font-medium">
                  Amount
                </th>
                <th className="w-28 px-3 py-2 font-medium">Type</th>
                <th className="min-w-[220px] px-3 py-2 font-medium">
                  Description
                </th>
                <th className="w-40 px-3 py-2 font-medium">Category</th>
                <th className="w-40 px-3 py-2 font-medium">Assignee</th>
                <th className="w-44 px-3 py-2 font-medium">Notes</th>
                <th className="w-40 px-3 py-2 font-medium">Tags</th>
              </tr>
            </thead>
            <tbody>
              {isLoading || !draft ? (
                <ImportDraftReviewRowsSkeleton />
              ) : (
                draft.rows.map((row) => (
                  <ImportDraftReviewRow
                    key={row.id}
                    draftId={draft.id}
                    row={row}
                  />
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
};
