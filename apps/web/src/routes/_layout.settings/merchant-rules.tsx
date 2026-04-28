import { createFileRoute } from '@tanstack/react-router';
import { MerchantRulesSettings } from '@/components/settings/MerchantRulesSettings';

export const Route = createFileRoute('/_layout/settings/merchant-rules')({
  component: MerchantRulesSettings,
});
