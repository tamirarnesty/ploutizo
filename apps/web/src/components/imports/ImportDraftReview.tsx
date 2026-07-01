import { Inbox } from 'lucide-react';
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@ploutizo/ui/components/empty';
import type { ImportDraft } from '@ploutizo/types';
import { useGetCategories } from '@/lib/data-access/categories';
import { useGetOrgMembers } from '@/lib/data-access/org';
import { PendingInputFlushProvider } from '@/lib/money/pending-input-flush';
import { ImportDraftReviewHeader } from './ImportDraftReviewHeader';
import { ImportDraftReviewProvider } from './ImportDraftReviewContext';
import { ImportDraftReviewTable } from './ImportDraftReviewTable';
import { useImportDraftReviewState } from './useImportDraftReviewState';

interface ImportDraftReviewProps {
  draft?: ImportDraft;
  isLoading?: boolean;
}

const getEmptyDraftDescription = (draft: ImportDraft): string => {
  if (draft.rows.length === 0) {
    return 'This import draft has no transactions to review.';
  }

  const parts = ['Every row in this draft is invalid or skipped.'];
  if (draft.invalidRowCount > 0) {
    parts.push(
      draft.invalidRowCount === 1
        ? '1 row is invalid.'
        : `${draft.invalidRowCount} rows are invalid.`
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
  draft,
  isLoading = false,
}: ImportDraftReviewProps) => {
  const { data: categories = [] } = useGetCategories();
  const { data: orgMembers = [] } = useGetOrgMembers();
  const reviewState = useImportDraftReviewState({ draft, isLoading });
  const { canContinue, continueBlocker, hasReviewableRows } = reviewState;

  const showEmptyState = !isLoading && draft && !hasReviewableRows;

  return (
    <section className="space-y-3">
      <ImportDraftReviewHeader
        draft={draft}
        isLoading={isLoading}
        canContinue={canContinue}
        continueBlocker={continueBlocker}
      />

      {showEmptyState ? (
        <Empty className="min-h-[280px] border border-dashed">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <Inbox />
            </EmptyMedia>
            <EmptyTitle>No transactions to review</EmptyTitle>
            <EmptyDescription>
              {getEmptyDraftDescription(draft)}
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : draft ? (
        <ImportDraftReviewProvider
          draftId={draft.id}
          categories={categories}
          orgMembers={orgMembers}
        >
          <ImportDraftReviewTable reviewState={reviewState} />
        </ImportDraftReviewProvider>
      ) : (
        <ImportDraftReviewTable reviewState={reviewState} />
      )}
    </section>
  );
};
