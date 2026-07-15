import { createFileRoute } from '@tanstack/react-router';
import { Import } from '../../../components/imports/Import';

export const Route = createFileRoute('/_layout/transactions/import/')({
  component: Import,
});
