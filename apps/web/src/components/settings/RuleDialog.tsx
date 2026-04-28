import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@ploutizo/ui/components/dialog';
import { RuleForm } from './RuleForm';
import type { MerchantRule } from '@/lib/data-access/merchant-rules';

interface RuleDialogProps {
  rule: MerchantRule | null;
  onClose: () => void;
}

export const RuleDialog = ({ rule, onClose }: RuleDialogProps) => (
  <Dialog
    open={true}
    onOpenChange={(open) => {
      if (!open) onClose();
    }}
  >
    <DialogContent className="w-[calc(100%-2rem)] max-w-md">
      <DialogHeader>
        <DialogTitle>{rule !== null ? 'Edit rule' : 'Add rule'}</DialogTitle>
      </DialogHeader>
      <RuleForm rule={rule} onClose={onClose} />
    </DialogContent>
  </Dialog>
);
