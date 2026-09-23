import { createFileRoute } from '@tanstack/react-router';
import { assertImportFinalizePreviewSession } from '@/lib/data-access/imports/importFinalizeRouteGuard';
import { ImportFinalize } from '../../../components/imports/finalize/ImportFinalize';

const ImportFinalizeRoute = () => {
  const { draftId } = Route.useParams();
  return <ImportFinalize draftId={draftId} />;
};

export const Route = createFileRoute('/_layout/import/$draftId/finalize')({
  beforeLoad: ({ context, params }) => {
    assertImportFinalizePreviewSession(context.queryClient, params.draftId);
  },
  component: ImportFinalizeRoute,
});
