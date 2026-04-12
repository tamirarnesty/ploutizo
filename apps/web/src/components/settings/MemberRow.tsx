import { Trash2 } from "lucide-react"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@ploutizo/ui/components/alert-dialog"
import { Avatar, AvatarFallback, AvatarImage } from "@ploutizo/ui/components/avatar"
import { Badge } from "@ploutizo/ui/components/badge"
import type { OrgMember } from "@ploutizo/types"

interface MemberRowProps {
  member: OrgMember
  isCurrentUser: boolean
  onRemove: (memberId: string) => void
}

export const MemberRow = ({ member, isCurrentUser, onRemove }: MemberRowProps) => (
  <li className="flex items-center justify-between rounded-md border border-border px-4 py-3 text-sm">
    <span className="flex min-w-0 items-center gap-2">
      <Avatar className="size-8 shrink-0">
        <AvatarImage src={member.imageUrl ?? undefined} />
        <AvatarFallback>
          {(member.firstName ?? member.displayName).charAt(0).toUpperCase()}
        </AvatarFallback>
      </Avatar>
      <span className="min-w-0 truncate font-semibold">{member.displayName}</span>
      {isCurrentUser ? <Badge variant="secondary">You</Badge> : null}
    </span>
    <span className="ml-4 flex shrink-0 items-center gap-2">
      <span className="text-xs capitalize text-muted-foreground">{member.role}</span>
      {!isCurrentUser ? (
        <AlertDialog>
          <AlertDialogTrigger
            className="inline-flex size-9 items-center justify-center rounded-md text-muted-foreground hover:bg-destructive/10 hover:text-destructive focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            aria-label={`Remove ${member.displayName}`}
          >
            <Trash2 className="size-4" />
          </AlertDialogTrigger>
          <AlertDialogContent className="w-[calc(100%-2rem)] max-w-md">
            <AlertDialogTitle>
              Remove {member.firstName ?? member.displayName}?
            </AlertDialogTitle>
            <AlertDialogDescription>
              Remove {member.displayName} from this household? They will lose access immediately.
            </AlertDialogDescription>
            <AlertDialogFooter>
              <AlertDialogCancel>Keep member</AlertDialogCancel>
              <AlertDialogAction
                variant="destructive"
                onClick={() => onRemove(member.id)}
              >
                Remove
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      ) : null}
    </span>
  </li>
)
