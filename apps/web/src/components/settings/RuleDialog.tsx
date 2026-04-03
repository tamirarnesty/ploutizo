import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@ploutizo/ui/components/dialog"
import type { MerchantRule } from "@/lib/data-access/merchant-rules"
import { RuleForm } from "./RuleForm"

interface RuleDialogProps {
  rule: MerchantRule | null
  onClose: () => void
}

export const RuleDialog = ({ rule, onClose }: RuleDialogProps) => (
  <Dialog open={true} onOpenChange={(open) => { if (!open) onClose() }}>
    <DialogContent className="max-w-md">
      <DialogHeader>
        <DialogTitle>{rule !== null ? "Edit rule" : "Add rule"}</DialogTitle>
      </DialogHeader>
      <RuleForm rule={rule} onClose={onClose} />
    </DialogContent>
  </Dialog>
)
