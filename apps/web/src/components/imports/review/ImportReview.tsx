import { Link } from '@tanstack/react-router';
import { FileQuestion } from 'lucide-react';
import { Button } from '@ploutizo/ui/components/button';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@ploutizo/ui/components/breadcrumb';
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@ploutizo/ui/components/empty';
import { useImportReviewSession } from '@/lib/data-access/imports';
import { ImportDraftReview } from './ImportDraftReview';
import { useImportReviewLeaveGuard } from './useImportReviewLeaveGuard';

interface ImportReviewProps {
  draftId: string;
}

const ImportReviewBreadcrumbs = () => (
  <Breadcrumb>
    <BreadcrumbList>
      <BreadcrumbItem>
        <BreadcrumbLink render={<Link to="/transactions/import" />}>
          Import
        </BreadcrumbLink>
      </BreadcrumbItem>
      <BreadcrumbSeparator />
      <BreadcrumbItem>
        <BreadcrumbPage>Review import</BreadcrumbPage>
      </BreadcrumbItem>
    </BreadcrumbList>
  </Breadcrumb>
);

const importReviewPageClassName = 'flex min-h-0 flex-1 flex-col gap-8';

const sessionReviewProps = (
  session: ReturnType<typeof useImportReviewSession>
) => ({
  updateRow: session.updateRow,
  setSelection: session.setSelection,
  autosaveStatus: session.autosaveStatus,
  failedRowIds: session.failedRowIds,
  hasUnsavedWork: session.hasUnsavedWork,
  retryAutosave: session.retryAutosave,
  flush: session.flush,
});

export const ImportReview = ({ draftId }: ImportReviewProps) => {
  const session = useImportReviewSession(draftId);
  const { meta, rows, isLoading, isError, hasUnsavedWork, flush } = session;
  const reviewProps = sessionReviewProps(session);

  useImportReviewLeaveGuard({ hasUnsavedWork, flush });

  const body = (() => {
    if (isLoading) {
      return <ImportDraftReview isLoading {...reviewProps} />;
    }

    if (isError || !meta) {
      return (
        <Empty className="min-h-[360px] border border-dashed">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <FileQuestion />
            </EmptyMedia>
            <EmptyTitle>Draft not available</EmptyTitle>
            <EmptyDescription>
              This import draft is missing, inactive, or was discarded.
            </EmptyDescription>
          </EmptyHeader>
          <EmptyContent>
            <Button
              nativeButton={false}
              render={<Link to="/transactions/import" />}
            >
              Back to Import
            </Button>
          </EmptyContent>
        </Empty>
      );
    }

    return <ImportDraftReview meta={meta} rows={rows} {...reviewProps} />;
  })();

  return (
    <div className={importReviewPageClassName}>
      <ImportReviewBreadcrumbs />
      {body}
    </div>
  );
};
