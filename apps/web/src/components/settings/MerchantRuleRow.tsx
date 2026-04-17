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
import { GripVertical } from "lucide-react"
import {
  SortableItem,
  SortableItemHandle,
} from "@ploutizo/ui/components/reui/sortable"
import { Button } from "@ploutizo/ui/components/button"
import { Text } from "@ploutizo/ui/components/text"
import type { MerchantRule } from "@/lib/data-access/merchant-rules"

const MATCH_TYPE_LABELS: Record<string, string> = {
  exact: "Exact",
  contains: "Contains",
  starts_with: "Starts with",
  ends_with: "Ends with",
  regex: "Regex",
}

interface MerchantRuleRowProps {
  rule: MerchantRule
  onEdit: () => void
  onDelete: () => void
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
        <span className="text-xs text-muted-foreground">
          {MATCH_TYPE_LABELS[rule.matchType]}
        </span>
        <Text variant="body-sm" className="truncate font-mono">{rule.pattern}</Text>
        {rule.renameTo && (
          <Text variant="caption">
            → {rule.renameTo}
          </Text>
        )}
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
      <DeleteRuleButton onDelete={onDelete} />
    </div>
  </SortableItem>
)

// Private helper — not exported, only used by MerchantRuleRow above in this file
const DeleteRuleButton = ({ onDelete }: { onDelete: () => void }) => (
  <AlertDialog>
    <AlertDialogTrigger
      render={
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="text-muted-foreground hover:text-destructive"
        />
      }
    >
      Delete
    </AlertDialogTrigger>
    <AlertDialogContent>
      <AlertDialogHeader>
        <AlertDialogTitle>Delete rule?</AlertDialogTitle>
        <AlertDialogDescription>
          This rule will no longer be applied during import.
        </AlertDialogDescription>
      </AlertDialogHeader>
      <AlertDialogFooter>
        <AlertDialogCancel>Cancel</AlertDialogCancel>
        <AlertDialogAction
          variant="destructive"
          onClick={onDelete}
        >
          Delete rule
        </AlertDialogAction>
      </AlertDialogFooter>
    </AlertDialogContent>
  </AlertDialog>
)
