import { createFileRoute } from '@tanstack/react-router';
import { requireActiveHousehold } from '@/lib/auth/require-active-household';
import {
  getImportDraftRowsCollection,
  importDraftQueryOptions,
} from '../../../lib/data-access/imports';
import { accountsQueryOptions } from '../../../lib/data-access/accounts';
import { ImportReview } from '../../../components/imports/review/ImportReview';

const ImportReviewRoute = () => {
  const { draftId } = Route.useParams();
  return <ImportReview draftId={draftId} />;
};

export const Route = createFileRoute('/_layout/import/$draftId/')({
  /**
   * TanStack DB collections are client-only. Intent preload warms Query, then
   * `preload()` materializes the review working copy before the route renders.
   */
  loader: async ({ context, params }) => {
    const access = requireActiveHousehold(context.access);
    await Promise.all([
      context.queryClient
        .ensureQueryData(importDraftQueryOptions(access, params.draftId))
        .catch(() => undefined),
      context.queryClient
        .ensureQueryData(accountsQueryOptions(access, true))
        .catch(() => undefined),
    ]);
    await getImportDraftRowsCollection(access, params.draftId)
      .preload()
      .catch(() => undefined);
  },
  component: ImportReviewRoute,
});
