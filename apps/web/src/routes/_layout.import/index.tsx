import { createFileRoute } from '@tanstack/react-router';
import { auth } from '@clerk/tanstack-react-start/server';
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

    const { orgId } = await auth();
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
