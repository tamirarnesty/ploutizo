import { createFileRoute } from '@tanstack/react-router';
import { Text } from '@ploutizo/ui/components/text';

const ImportRoutePlaceholder = () => (
  <div className="space-y-3">
    <Text as="h1" variant="h3">
      Import
    </Text>
  </div>
);

export const Route = createFileRoute('/_layout/transactions/import/')({
  component: ImportRoutePlaceholder,
});
