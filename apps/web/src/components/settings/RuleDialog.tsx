import type { MerchantRule } from '@ploutizo/validators';
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
    description={
      rule !== null
        ? 'Update this merchant rule.'
        : 'Create a new merchant rule.'
    }
    formKey={rule?.id ?? 'new'}
  >
    <RuleForm rule={rule} onClose={() => onOpenChange(false)} />
  </SettingsFormDialog>
);
