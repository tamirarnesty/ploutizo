import { createFileRoute } from '@tanstack/react-router';
import { MerchantRulesSettings } from '@/components/settings/MerchantRulesSettings';

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
  component: MerchantRulesSettings,
});
