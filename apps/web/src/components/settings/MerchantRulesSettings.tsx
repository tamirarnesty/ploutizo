import { useCallback, useState } from 'react';
import { Button } from '@ploutizo/ui/components/button';
import { Text } from '@ploutizo/ui/components/text';
import {
  useDeleteMerchantRule,
  useGetMerchantRules,
  useReorderMerchantRules,
} from '@/lib/data-access/merchant-rules';
import type { MerchantRule } from '@/lib/data-access/merchant-rules';
import { MerchantRulesList } from './MerchantRulesList';
import { RuleDialog } from './RuleDialog';

export const MerchantRulesSettings = () => {
  const { data: rules = [], isLoading } = useGetMerchantRules();
  const deleteRule = useDeleteMerchantRule();
  const reorderRules = useReorderMerchantRules();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingRule, setEditingRule] = useState<MerchantRule | null>(null);

  const handleReorder = (newOrder: MerchantRule[]) => {
    reorderRules.mutate(newOrder.map((r) => r.id));
  };

  const openCreateDialog = useCallback(() => {
    setEditingRule(null);
    setDialogOpen(true);
  }, []);

  const openEditDialog = useCallback((rule: MerchantRule) => {
    setEditingRule(rule);
    setDialogOpen(true);
  }, []);

  const handleDialogOpenChange = useCallback((open: boolean) => {
    setDialogOpen(open);
    if (!open) {
      setEditingRule(null);
    }
  }, []);

  return (
    <div className="flex max-w-2xl flex-col gap-6">
      <div className="flex items-center justify-between">
        <Text as="h1" variant="h3">
          Merchant Rules
        </Text>
        <Button type="button" onClick={openCreateDialog}>
          Add rule
        </Button>
      </div>

      <MerchantRulesList
        isLoading={isLoading}
        rules={rules}
        onReorder={handleReorder}
        onEdit={openEditDialog}
        onDelete={(id) => deleteRule.mutate(id)}
      />

      <RuleDialog
        open={dialogOpen}
        onOpenChange={handleDialogOpenChange}
        rule={editingRule}
      />
    </div>
  );
};
