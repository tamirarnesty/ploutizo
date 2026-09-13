import { createFileRoute } from '@tanstack/react-router';
import { getAuthOrgId } from '@/lib/auth/require-access';
import {
  activeImportDraftsQueryOptions,
  importHistoryPageQueryOptions,
  importTargetsQueryOptions,
} from '@/lib/data-access/imports';
import { Import } from '../../components/imports/hub/Import';

export const Route = createFileRoute('/_layout/import/')({
  loader: async ({ context }) => {
    const warmup: Promise<unknown>[] = [
      context.queryClient.ensureQueryData(importTargetsQueryOptions()),
      context.queryClient.ensureQueryData(importHistoryPageQueryOptions()),
    ];

    // Child loaders run on client intent preload; raw Clerk auth() has no
    // Start context there. resolve orgId through a server fn instead.
    const orgId = await getAuthOrgId().catch(() => null);
    if (orgId) {
      warmup.push(
        context.queryClient.ensureQueryData(
          activeImportDraftsQueryOptions(orgId)
        )
      );
    }

    await Promise.all(warmup.map((promise) => promise.catch(() => undefined)));
  },
  component: Import,
});
