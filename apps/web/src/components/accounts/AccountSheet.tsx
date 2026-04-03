import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@ploutizo/ui/components/sheet"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@ploutizo/ui/components/alert-dialog"
import { Button } from "@ploutizo/ui/components/button"
import { AccountForm } from "./AccountForm"
import type { Account } from "@ploutizo/types"
import { useArchiveAccount } from "@/lib/data-access/accounts"

interface AccountSheetProps {
  open: boolean
  account: Account | null
  onClose: () => void
}

export const AccountSheet = ({ open, account, onClose }: AccountSheetProps) => {
  const isEditing = account !== null
  const archiveAccount = useArchiveAccount()

  return (
    <Sheet open={open} onOpenChange={(o) => { if (!o) onClose() }}>
      <SheetContent side="right" className="flex w-[440px] flex-col p-0 sm:w-[440px]">
        <SheetHeader className="border-b border-border px-6 py-4">
          <SheetTitle>{isEditing ? "Edit account" : "Add account"}</SheetTitle>
        </SheetHeader>

        <AccountForm account={account} onClose={onClose} />

        {isEditing && !account.archivedAt && (
          <div className="border-t border-border px-6 py-4">
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="ghost" type="button" className="text-destructive hover:text-destructive">
                  Archive
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Archive account?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Transactions linked to this account will not be affected.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    onClick={() => archiveAccount.mutate(account.id, { onSuccess: onClose })}
                  >
                    Archive account
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        )}
      </SheetContent>
    </Sheet>
  )
}
