import { GripVertical } from 'lucide-react';
import {
  SortableItem,
  SortableItemHandle,
} from '@ploutizo/ui/components/reui/sortable';
import { Button } from '@ploutizo/ui/components/button';
import { Text } from '@ploutizo/ui/components/text';
import type { MerchantRule } from '@/lib/data-access/merchant-rules';
import { MATCH_TYPE_LABELS } from './merchant-rule-labels';
import { SettingsRowAlertDialog } from './SettingsRowAlertDialog';

interface MerchantRuleRowProps {
  rule: MerchantRule;
  onEdit: () => void;
  onDelete: () => void;
}

export const MerchantRuleRow = ({
  rule,
  onEdit,
  onDelete,
}: MerchantRuleRowProps) => (
  <SortableItem value={rule.id}>
    <div className="flex items-center gap-3 rounded-md border border-border bg-card px-3 py-3">
      <SortableItemHandle
        aria-label="Drag to reorder"
        className="cursor-grab text-muted-foreground"
      >
        <GripVertical size={16} />
      </SortableItemHandle>
      <div className="min-w-0 flex-1">
        <Text as="span" variant="caption">
          {MATCH_TYPE_LABELS[rule.matchType]}
        </Text>
        <Text variant="body-sm" className="truncate font-mono">
          {rule.pattern}
        </Text>
        {rule.renameTo ? (
          <Text variant="caption">→ {rule.renameTo}</Text>
        ) : null}
      </div>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={onEdit}
        className="text-muted-foreground"
      >
        Edit
      </Button>
      <SettingsRowAlertDialog
        triggerLabel="Delete"
        title="Delete rule?"
        description="This rule will no longer be applied during import."
        confirmLabel="Delete rule"
        onConfirm={onDelete}
      />
    </div>
  </SortableItem>
);
