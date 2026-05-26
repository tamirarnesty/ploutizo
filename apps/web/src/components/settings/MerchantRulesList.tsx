import { Sortable } from '@ploutizo/ui/components/reui/sortable';
import { Skeleton } from '@ploutizo/ui/components/skeleton';
import { Text } from '@ploutizo/ui/components/text';
import type { MerchantRule } from '@/lib/data-access/merchant-rules';
import { MerchantRuleRow } from './MerchantRuleRow';

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
}: MerchantRulesListProps) => {
  if (isLoading) {
    return (
      <div className="flex flex-col gap-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-12" />
        ))}
      </div>
    );
  }

  if (rules.length === 0) {
    return (
      <Text variant="body-sm" className="text-muted-foreground">
        No merchant rules
      </Text>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <Text variant="caption" className="font-medium">
          Priority order
        </Text>
        <Text variant="caption">
          Rules are applied in order. First match wins. Drag to reorder.
        </Text>
      </div>
      <Sortable
        value={rules}
        onValueChange={onReorder}
        getItemValue={(r) => r.id}
        strategy="vertical"
        className="flex flex-col gap-2"
      >
        {rules.map((rule) => (
          <MerchantRuleRow
            key={rule.id}
            rule={rule}
            onEdit={() => onEdit(rule)}
            onDelete={() => onDelete(rule.id)}
          />
        ))}
      </Sortable>
    </div>
  );
};
