import { createFileRoute } from '@tanstack/react-router';
import { isHouseholdLoaderReady } from '@/lib/access/household-loader-ready';
import {
  activeImportDraftsQueryOptions,
  importHistoryPageQueryOptions,
  importTargetsQueryOptions,
} from '@/lib/data-access/imports';
import { Import } from '../../components/imports/hub/Import';

export const Route = createFileRoute('/_layout/import/')({
  loader: async ({ context }) => {
    if (!isHouseholdLoaderReady(context)) {
      return;
    }
    await Promise.all([
      context.queryClient.ensureQueryData(importTargetsQueryOptions),
      context.queryClient.ensureQueryData(importHistoryPageQueryOptions()),
      context.queryClient.ensureQueryData(activeImportDraftsQueryOptions),
    ]);
  },
  component: Import,
});
