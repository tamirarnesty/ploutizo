import { createFileRoute } from '@tanstack/react-router';
import { Import } from '../../components/imports/hub/Import';

export const Route = createFileRoute('/_layout/import/')({
  component: Import,
});
