import { createFileRoute } from '@tanstack/react-router';
import { ensureHouseholdQueryData } from '@/lib/access';
import {
  activeImportDraftsQueryOptions,
  importHistoryPageQueryOptions,
  importTargetsQueryOptions,
} from '@/lib/data-access/imports';
import { Import } from '../../components/imports/hub/Import';

export const Route = createFileRoute('/_layout/import/')({
  loader: async ({ context }) => {
    await Promise.all([
      ensureHouseholdQueryData(context.queryClient, importTargetsQueryOptions),
      ensureHouseholdQueryData(
        context.queryClient,
        importHistoryPageQueryOptions()
      ),
      ensureHouseholdQueryData(
        context.queryClient,
        activeImportDraftsQueryOptions
      ),
    ]);
  },
  component: Import,
});
