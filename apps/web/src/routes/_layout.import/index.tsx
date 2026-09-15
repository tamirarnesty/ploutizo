import { createFileRoute } from '@tanstack/react-router';
import { requireActiveHousehold } from '@/lib/auth/require-active-household';
import {
  activeImportDraftsQueryOptions,
  importHistoryPageQueryOptions,
  importTargetsQueryOptions,
} from '@/lib/data-access/imports';
import { Import } from '../../components/imports/hub/Import';

export const Route = createFileRoute('/_layout/import/')({
  loader: async ({ context }) => {
    const access = requireActiveHousehold(context.access);
    await Promise.all([
      context.queryClient
        .ensureQueryData(importTargetsQueryOptions(access))
        .catch(() => undefined),
      context.queryClient
        .ensureQueryData(importHistoryPageQueryOptions(access))
        .catch(() => undefined),
      context.queryClient
        .ensureQueryData(activeImportDraftsQueryOptions(access))
        .catch(() => undefined),
    ]);
  },
  component: Import,
});
