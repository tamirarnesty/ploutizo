import type { MerchantRule } from '@/lib/data-access/merchant-rules';
import { RuleForm } from './RuleForm';
import { SettingsFormDialog } from './SettingsFormDialog';

interface RuleDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  rule: MerchantRule | null;
}

export const RuleDialog = ({ open, onOpenChange, rule }: RuleDialogProps) => (
  <SettingsFormDialog
    open={open}
    onOpenChange={onOpenChange}
    title={rule !== null ? 'Edit rule' : 'Add rule'}
    formKey={rule?.id ?? 'new'}
  >
    <RuleForm rule={rule} onClose={() => onOpenChange(false)} />
  </SettingsFormDialog>
);
