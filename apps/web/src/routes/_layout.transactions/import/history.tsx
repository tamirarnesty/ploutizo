import { createFileRoute } from '@tanstack/react-router';
import { ImportHistoryPage } from '../../../components/imports/hub/ImportHistoryPage';

export const Route = createFileRoute('/_layout/transactions/import/history')({
  component: ImportHistoryPage,
});
