import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@ploutizo/ui/components/dialog';
import type { MerchantRule } from '@/lib/data-access/merchant-rules';
import { RuleForm } from './RuleForm';

interface RuleDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  rule: MerchantRule | null;
}

export const RuleDialog = ({ open, onOpenChange, rule }: RuleDialogProps) => {
  const handleClose = () => onOpenChange(false);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[calc(100%-2rem)] max-w-md">
        <DialogHeader>
          <DialogTitle>{rule !== null ? 'Edit rule' : 'Add rule'}</DialogTitle>
        </DialogHeader>
        <RuleForm key={rule?.id ?? 'new'} rule={rule} onClose={handleClose} />
      </DialogContent>
    </Dialog>
  );
};
