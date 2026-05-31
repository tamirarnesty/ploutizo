import { Button } from '@ploutizo/ui/components/button';
import { Text } from '@ploutizo/ui/components/text';
import {
  useDeleteMerchantRule,
  useGetMerchantRules,
  useReorderMerchantRules,
} from '@/lib/data-access/merchant-rules';
import type { MerchantRule } from '@/lib/data-access/merchant-rules';
import { useSettingsEntityDialog } from '@/hooks/useSettingsEntityDialog';
import { MerchantRulesList } from './MerchantRulesList';
import { RuleDialog } from './RuleDialog';

export const MerchantRulesSettings = () => {
  const { data: rules = [], isLoading } = useGetMerchantRules();
  const deleteRule = useDeleteMerchantRule();
  const reorderRules = useReorderMerchantRules();
  const dialog = useSettingsEntityDialog<MerchantRule>();

  const handleReorder = (newOrder: MerchantRule[]) => {
    reorderRules.mutate(newOrder.map((r) => r.id));
  };

  return (
    <div className="flex max-w-2xl flex-col gap-6">
      <div className="flex items-center justify-between">
        <Text as="h1" variant="h3">
          Merchant Rules
        </Text>
        <Button type="button" onClick={dialog.openCreate}>
          Add rule
        </Button>
      </div>

      <MerchantRulesList
        isLoading={isLoading}
        rules={rules}
        onReorder={handleReorder}
        onEdit={dialog.openEdit}
        onDelete={(id) => deleteRule.mutate(id)}
      />

      <RuleDialog
        open={dialog.open}
        onOpenChange={dialog.onOpenChange}
        rule={dialog.entity}
      />
    </div>
  );
};
