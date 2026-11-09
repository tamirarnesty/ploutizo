import { Button } from '@ploutizo/ui/components/button';
import { Page } from '@ploutizo/ui/components/page';
import type { MerchantRule } from '@ploutizo/validators';
import { PageHeader } from '@/components/PageHeader';
import {
  useDeleteMerchantRule,
  useGetMerchantRules,
  useReorderMerchantRules,
} from '@/lib/data-access/merchant-rules';
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
    <Page>
      <PageHeader
        actions={
          <Button type="button" onClick={dialog.openCreate}>
            Add rule
          </Button>
        }
      />

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <MerchantRulesList
          isLoading={isLoading}
          rules={rules}
          onReorder={handleReorder}
          onEdit={dialog.openEdit}
          onDelete={(id) => deleteRule.mutate(id)}
        />
      </div>

      <RuleDialog
        open={dialog.open}
        onOpenChange={dialog.onOpenChange}
        rule={dialog.entity}
      />
    </Page>
  );
};
