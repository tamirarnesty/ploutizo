import { createFileRoute } from '@tanstack/react-router';
import { HouseholdSettings } from '@/components/settings/HouseholdSettings';

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
  component: HouseholdSettings,
});
