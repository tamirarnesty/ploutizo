import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useRouterState } from '@tanstack/react-router';
import { FileQuestion } from 'lucide-react';
import { toast } from '@ploutizo/ui/components/sonner';
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
import { useQueryClient } from '@tanstack/react-query';
import type { ImportRequirementFailure } from '@ploutizo/types';
import {
  IMPORT_REVIEW_PREPARE_AGAIN_MESSAGE,
  importDraftQueryKey,
  useImportReviewSession,
} from '@/lib/data-access/imports';
import { ImportDraftReview } from './ImportDraftReview';
import { ImportReviewLeaveGuard } from './ImportReviewLeaveGuard';

interface ImportReviewProps {
  draftId: string;
}

const ImportReviewBreadcrumbs = () => (
  <Breadcrumb>
    <BreadcrumbList>
      <BreadcrumbItem>
        <BreadcrumbLink render={<Link to="/import" />}>Import</BreadcrumbLink>
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
  retryAutosave: session.retryAutosave,
  flush: session.flush,
});

export const ImportReview = ({ draftId }: ImportReviewProps) => {
  const session = useImportReviewSession(draftId);
  const { meta, rows, isLoading, isError, flush } = session;
  const reviewProps = sessionReviewProps(session);
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const importReviewState = useRouterState({
    select: (state) => state.location.state.importReview,
  });
  const consumedStateKey = useRef<string | null>(null);
  const [inboundIssues, setInboundIssues] = useState<
    ImportRequirementFailure[]
  >([]);

  useEffect(() => {
    if (!importReviewState) return;
    const stateKey = JSON.stringify(importReviewState);
    if (consumedStateKey.current === stateKey) return;
    consumedStateKey.current = stateKey;

    if (importReviewState.prepareAgain) {
      toast.info(IMPORT_REVIEW_PREPARE_AGAIN_MESSAGE);
    }
    if (importReviewState.issues && importReviewState.issues.length > 0) {
      setInboundIssues(importReviewState.issues);
    }

    void queryClient.invalidateQueries({
      queryKey: importDraftQueryKey(draftId),
    });

    void navigate({
      to: '/import/$draftId',
      params: { draftId },
      replace: true,
      state: { importReview: undefined },
    });
  }, [draftId, importReviewState, navigate, queryClient]);

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
            <Button nativeButton={false} render={<Link to="/import" />}>
              Back to Import
            </Button>
          </EmptyContent>
        </Empty>
      );
    }

    return (
      <ImportDraftReview
        meta={meta}
        rows={rows}
        inboundIssues={inboundIssues}
        {...reviewProps}
      />
    );
  })();

  return (
    <div className={importReviewPageClassName}>
      <ImportReviewLeaveGuard draftId={draftId} flush={flush} />
      <ImportReviewBreadcrumbs />
      {body}
    </div>
  );
};
