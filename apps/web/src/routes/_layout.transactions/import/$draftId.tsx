import { createFileRoute } from '@tanstack/react-router';
import { ImportReview } from '../../../components/imports/ImportReview';

const ImportReviewRoute = () => {
  const { draftId } = Route.useParams();
  return <ImportReview draftId={draftId} />;
};

export const Route = createFileRoute('/_layout/transactions/import/$draftId')({
  staticData: {
    mainContentLayout: 'viewport',
  },
  component: ImportReviewRoute,
});
