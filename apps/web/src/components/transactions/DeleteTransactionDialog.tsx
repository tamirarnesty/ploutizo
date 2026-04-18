import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@ploutizo/ui/components/alert-dialog'

interface DeleteTransactionDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onConfirm: () => void
  isPending?: boolean
}

export const DeleteTransactionDialog = ({
  open,
  onOpenChange,
  onConfirm,
  isPending = false,
}: DeleteTransactionDialogProps) => (
  <AlertDialog open={open} onOpenChange={onOpenChange}>
    <AlertDialogContent>
      <AlertDialogHeader>
        <AlertDialogTitle>Delete transaction?</AlertDialogTitle>
        <AlertDialogDescription>
          This will permanently remove this transaction. This action cannot be undone.
        </AlertDialogDescription>
      </AlertDialogHeader>
      <AlertDialogFooter>
        <AlertDialogCancel>Cancel</AlertDialogCancel>
        {/* AlertDialogAction is a plain Button (not a Close primitive) — call onOpenChange(false)
            explicitly so the dialog dismisses after confirming. */}
        <AlertDialogAction
          variant="destructive"
          onClick={() => {
            onConfirm()
            onOpenChange(false)
          }}
          disabled={isPending}
        >
          Delete transaction
        </AlertDialogAction>
      </AlertDialogFooter>
    </AlertDialogContent>
  </AlertDialog>
)
