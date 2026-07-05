import { createFileRoute } from '@tanstack/react-router';
import { Text } from '@ploutizo/ui/components/text';

const ImportReviewRoutePlaceholder = () => {
  const { draftId } = Route.useParams();

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-8" data-draft-id={draftId}>
      <Text as="h1" variant="h3">
        Review import
      </Text>
    </div>
  );
};

export const Route = createFileRoute('/_layout/transactions/import/$draftId')({
  staticData: {
    mainContentLayout: 'viewport',
  },
  component: ImportReviewRoutePlaceholder,
});
