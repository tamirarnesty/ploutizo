import { Inbox } from 'lucide-react';
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@ploutizo/ui/components/empty';
import type { ImportDraftRow } from '@ploutizo/types';
import type { ImportDraftMeta } from '@/lib/data-access/imports';
import { useGetCategories } from '@/lib/data-access/categories';
import { useGetOrgMembers } from '@/lib/data-access/org';
import { PendingInputFlushProvider } from '@/lib/money/pending-input-flush';
import { ImportDraftReviewHeader } from './ImportDraftReviewHeader';
import { ImportDraftReviewProvider } from './ImportDraftReviewContext';
import { ImportDraftReviewTable } from './ImportDraftReviewTable';
import { useImportDraftReviewState } from './useImportDraftReviewState';

interface ImportDraftReviewProps {
  meta?: ImportDraftMeta;
  rows?: ImportDraftRow[];
  isLoading?: boolean;
}

const getEmptyDraftDescription = (
  meta: ImportDraftMeta,
  rows: ImportDraftRow[]
): string => {
  if (rows.length === 0) {
    return 'This import draft has no transactions to review.';
  }

  const parts = ['Every row in this draft is invalid or skipped.'];
  if (meta.invalidRowCount > 0) {
    parts.push(
      meta.invalidRowCount === 1
        ? '1 row is invalid.'
        : `${meta.invalidRowCount} rows are invalid.`
    );
  }
  return parts.join(' ');
};

export const ImportDraftReview = (props: ImportDraftReviewProps) => (
  <PendingInputFlushProvider>
    <ImportDraftReviewContent {...props} />
  </PendingInputFlushProvider>
);

const ImportDraftReviewContent = ({
  meta,
  rows = [],
  isLoading = false,
}: ImportDraftReviewProps) => {
  const { data: categories = [] } = useGetCategories();
  const { data: orgMembers = [] } = useGetOrgMembers();
  const reviewState = useImportDraftReviewState({ meta, rows, isLoading });
  const { canContinue, continueBlocker, hasReviewableRows } = reviewState;

  const showEmptyState = !isLoading && meta && !hasReviewableRows;

  return (
    <section className="flex min-h-0 flex-1 flex-col gap-3">
      <ImportDraftReviewHeader
        meta={meta}
        isLoading={isLoading}
        canContinue={canContinue}
        continueBlocker={continueBlocker}
      />

      <div className="flex min-h-0 flex-1 flex-col">
        {showEmptyState ? (
          <Empty className="min-h-[280px] border border-dashed">
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <Inbox />
              </EmptyMedia>
              <EmptyTitle>No transactions to review</EmptyTitle>
              <EmptyDescription>
                {getEmptyDraftDescription(meta, rows)}
              </EmptyDescription>
            </EmptyHeader>
          </Empty>
        ) : meta ? (
          <ImportDraftReviewProvider
            draftId={meta.id}
            categories={categories}
            orgMembers={orgMembers}
          >
            <ImportDraftReviewTable reviewState={reviewState} />
          </ImportDraftReviewProvider>
        ) : (
          <ImportDraftReviewTable reviewState={reviewState} />
        )}
      </div>
    </section>
  );
};
