import { cn } from '@ploutizo/ui/lib/utils'
import { ToggleGroup, ToggleGroupItem } from '@ploutizo/ui/components/toggle-group'
import { UserAvatar } from './UserAvatar'
import type { OrgMember } from '@ploutizo/types'

interface MemberToggleGroupProps {
  members: OrgMember[]
  value: string[]
  onChange: (ids: string[]) => void
  multiple?: boolean
  className?: string
}

export const MemberToggleGroup = ({
  members,
  value,
  onChange,
  multiple = true,
  className,
}: MemberToggleGroupProps) => {
  const handleChange = (newIds: string[]) => {
    // Prevent deselecting the only item in single-select mode
    if (!multiple && newIds.length === 0 && value.length > 0) return
    onChange(newIds)
  }

  return (
    <ToggleGroup
      multiple={multiple}
      value={value}
      onValueChange={handleChange}
      variant="outline"
      size="lg"
      spacing={2}
      className={cn('w-full flex-wrap', className)}
    >
      {members.map((member) => (
        <ToggleGroupItem
          key={member.id}
          value={member.id}
          className="px-3 data-[state=on]:border-primary/30 data-[state=on]:bg-primary/10 data-[state=on]:text-primary"
          aria-label={member.displayName}
        >
          <UserAvatar size="sm" name={member.displayName} imageUrl={member.imageUrl} />
          <span className="ml-1.5 text-sm">{member.displayName.split(' ')[0]}</span>
        </ToggleGroupItem>
      ))}
    </ToggleGroup>
  )
}
