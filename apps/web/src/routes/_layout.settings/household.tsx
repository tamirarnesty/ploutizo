import { createFileRoute } from '@tanstack/react-router';
import { isHouseholdLoaderReady } from '@/lib/access/household-loader-ready';
import { HouseholdSettings } from '@/components/settings/HouseholdSettings';
import {
  householdMembersQueryOptions,
  householdOverviewQueryOptions,
  householdSettingsQueryOptions,
} from '@/lib/data-access/household';
import { orgInvitationsQueryOptions } from '@/lib/data-access/org';

export const Route = createFileRoute('/_layout/settings/household')({
  staticData: {
    nav: {
      label: 'Household',
      keywords: ['settings', 'members', 'household'],
      group: 'settings',
      sidebar: false,
      order: 3,
    },
  },
  loader: async ({ context }) => {
    if (!(await isHouseholdLoaderReady(context))) {
      return;
    }
    await Promise.all([
      context.queryClient.ensureQueryData(householdOverviewQueryOptions),
      context.queryClient.ensureQueryData(householdMembersQueryOptions),
      context.queryClient.ensureQueryData(orgInvitationsQueryOptions),
      context.queryClient.ensureQueryData(householdSettingsQueryOptions),
    ]);
  },
  component: HouseholdSettings,
});
