import { createFileRoute } from '@tanstack/react-router';
import { importDraftQueryOptions } from '../../../lib/data-access/imports';
import { ImportReview } from '../../../components/imports/ImportReview';

const ImportReviewRoute = () => {
  const { draftId } = Route.useParams();
  return <ImportReview draftId={draftId} />;
};

export const Route = createFileRoute('/_layout/transactions/import/$draftId')({
  staticData: {
    mainContentLayout: 'viewport',
  },
  /**
   * Intent preload (`defaultPreload: 'intent'` + Link hover/focus) runs this
   * loader and warms the Query cache before navigation. Components still read
   * via `useGetImportDraft` — see PLO-51 reference notes.
   */
  loader: async ({ context, params }) => {
    await context.queryClient
      .ensureQueryData(importDraftQueryOptions(params.draftId))
      .catch(() => undefined);
  },
  component: ImportReviewRoute,
});
