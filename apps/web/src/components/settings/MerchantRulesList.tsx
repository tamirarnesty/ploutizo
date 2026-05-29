import type { MerchantRule } from '@/lib/data-access/merchant-rules';
import { Text } from '@ploutizo/ui/components/text';
import { MerchantRuleRow } from './MerchantRuleRow';
import { SortableSettingsList } from './SortableSettingsList';

interface MerchantRulesListProps {
  isLoading: boolean;
  rules: MerchantRule[];
  onReorder: (rules: MerchantRule[]) => void;
  onEdit: (rule: MerchantRule) => void;
  onDelete: (ruleId: string) => void;
}

export const MerchantRulesList = ({
  isLoading,
  rules,
  onReorder,
  onEdit,
  onDelete,
}: MerchantRulesListProps) => (
  <SortableSettingsList
    isLoading={isLoading}
    items={rules}
    emptyMessage="No merchant rules"
    loadingSkeletonClassName="h-12"
    header={
      <div className="flex flex-col gap-1">
        <Text variant="caption" className="font-medium">
          Priority order
        </Text>
        <Text variant="caption">
          Rules are applied in order. First match wins. Drag to reorder.
        </Text>
      </div>
    }
    sortableClassName="flex flex-col gap-2"
    onReorder={onReorder}
    renderRow={(rule) => (
      <MerchantRuleRow
        key={rule.id}
        rule={rule}
        onEdit={() => onEdit(rule)}
        onDelete={() => onDelete(rule.id)}
      />
    )}
  />
);
