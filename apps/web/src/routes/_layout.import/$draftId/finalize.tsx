import { createFileRoute } from '@tanstack/react-router';
import { ImportFinalize } from '../../../components/imports/finalize/ImportFinalize';

const ImportFinalizeRoute = () => {
  const { draftId } = Route.useParams();
  return <ImportFinalize draftId={draftId} />;
};

export const Route = createFileRoute('/_layout/import/$draftId/finalize')({
  component: ImportFinalizeRoute,
});
