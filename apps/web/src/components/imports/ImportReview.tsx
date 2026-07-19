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

export const ImportReview = ({ draftId }: ImportReviewProps) => {
  const { meta, rows, isLoading, isError } = useImportReviewSession(draftId);

  if (isLoading) {
    return (
      <div className={importReviewPageClassName}>
        <ImportReviewBreadcrumbs />
        <ImportDraftReview isLoading />
      </div>
    );
  }

  if (isError || !meta) {
    return (
      <div className={importReviewPageClassName}>
        <ImportReviewBreadcrumbs />
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
            <Button render={<Link to="/transactions/import" />}>
              Back to Import
            </Button>
          </EmptyContent>
        </Empty>
      </div>
    );
  }

  return (
    <div className={importReviewPageClassName}>
      <ImportReviewBreadcrumbs />
      <ImportDraftReview meta={meta} rows={rows} />
    </div>
  );
};
