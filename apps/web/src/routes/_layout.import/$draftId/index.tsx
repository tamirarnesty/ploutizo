import { createFileRoute } from '@tanstack/react-router';
import { isHouseholdLoaderReady } from '@/lib/access/household-loader-ready';
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
    if (!isHouseholdLoaderReady(context)) {
      return;
    }
    await Promise.all([
      context.queryClient.ensureQueryData(
        importDraftQueryOptions(params.draftId)
      ),
      context.queryClient.ensureQueryData(accountsQueryOptions(true)),
    ]);
    if (import.meta.env.SSR) {
      await getImportDraftRowsCollection(params.draftId)
        .preload()
        .catch(() => undefined);
    }
  },
  component: ImportReviewRoute,
});
