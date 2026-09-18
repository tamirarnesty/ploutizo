import { createFileRoute } from '@tanstack/react-router';
import { isHouseholdLoaderReady } from '@/lib/access/household-loader-ready';
import { MerchantRulesSettings } from '@/components/settings/MerchantRulesSettings';
import { merchantRulesQueryOptions } from '@/lib/data-access/merchant-rules';

export const Route = createFileRoute('/_layout/settings/merchant-rules')({
  staticData: {
    nav: {
      label: 'Merchant Rules',
      keywords: ['settings', 'merchant', 'rules'],
      group: 'settings',
      sidebar: false,
      order: 2,
    },
  },
  loader: async ({ context }) => {
    if (!(await isHouseholdLoaderReady(context))) {
      return;
    }
    await context.queryClient.ensureQueryData(merchantRulesQueryOptions);
  },
  component: MerchantRulesSettings,
});
