import { createFileRoute } from '@tanstack/react-router';
import {
  activeImportDraftsQueryOptions,
  importHistoryPageQueryOptions,
  importTargetsQueryOptions,
} from '@/lib/data-access/imports';
import { Import } from '../../components/imports/hub/Import';

export const Route = createFileRoute('/_layout/import/')({
  loader: async ({ context }) => {
    await Promise.all([
      context.queryClient
        .ensureQueryData(importTargetsQueryOptions())
        .catch(() => undefined),
      context.queryClient
        .ensureQueryData(importHistoryPageQueryOptions())
        .catch(() => undefined),
      context.queryClient
        .ensureQueryData(activeImportDraftsQueryOptions())
        .catch(() => undefined),
    ]);
  },
  component: Import,
});
