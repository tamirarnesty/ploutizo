import {
  Avatar,
  AvatarFallback,
  AvatarGroup,
  AvatarGroupCount,
  AvatarImage,
} from '@ploutizo/ui/components/avatar'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@ploutizo/ui/components/tooltip'
import { getInitials } from '@/lib/getInitials'

export interface MemberAvatarItem {
  id: string
  name: string
  imageUrl?: string | null
}

interface MemberAvatarGroupProps {
  members: MemberAvatarItem[]
  max?: number
  withTooltips?: boolean
  emptyFallback?: React.ReactNode
}

export const MemberAvatarGroup = ({
  members,
  max = 3,
  withTooltips = false,
  emptyFallback = <span className="text-sm text-muted-foreground">—</span>,
}: MemberAvatarGroupProps) => {
  if (members.length === 0) return <>{emptyFallback}</>

  const visible = members.slice(0, max)
  const overflow = members.length - max

  return (
    <AvatarGroup>
      {visible.map((member) =>
        withTooltips ? (
          <Tooltip key={member.id}>
            {/* render={<Avatar />} is base-ui's equivalent of Radix asChild:
                Avatar becomes the trigger element directly, preserving AvatarGroup stacking */}
            <TooltipTrigger render={<Avatar size="sm" aria-label={member.name} />}>
              {member.imageUrl ? (
                <AvatarImage src={member.imageUrl} alt={member.name} />
              ) : null}
              <AvatarFallback>{getInitials(member.name)}</AvatarFallback>
            </TooltipTrigger>
            <TooltipContent>{member.name}</TooltipContent>
          </Tooltip>
        ) : (
          <Avatar key={member.id} size="sm" aria-label={member.name}>
            {member.imageUrl ? (
              <AvatarImage src={member.imageUrl} alt={member.name} />
            ) : null}
            <AvatarFallback>{getInitials(member.name)}</AvatarFallback>
          </Avatar>
        )
      )}
      {overflow > 0 && (
        <AvatarGroupCount aria-label={`and ${overflow} more`}>
          +{overflow}
        </AvatarGroupCount>
      )}
    </AvatarGroup>
  )
}
