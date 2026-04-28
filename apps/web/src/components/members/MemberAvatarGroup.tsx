import { AvatarGroup, AvatarGroupCount } from '@ploutizo/ui/components/avatar';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@ploutizo/ui/components/tooltip';
import { UserAvatar } from './UserAvatar';

export interface MemberAvatarItem {
  id: string;
  name: string;
  imageUrl?: string | null;
}

interface MemberAvatarGroupProps {
  members: MemberAvatarItem[];
  max?: number;
  withTooltips?: boolean;
  emptyFallback?: React.ReactNode;
}

export const MemberAvatarGroup = ({
  members,
  max = 3,
  withTooltips = false,
  emptyFallback = <span className="text-sm text-muted-foreground">—</span>,
}: MemberAvatarGroupProps) => {
  if (members.length === 0) return <>{emptyFallback}</>;

  const visible = members.slice(0, max);
  const overflow = members.length - max;

  return (
    <AvatarGroup>
      {visible.map((member) =>
        withTooltips ? (
          <Tooltip key={member.id}>
            {/* UserAvatar spreads ...props to Avatar → AvatarPrimitive.Root, so
                base-ui's render prop can inject trigger event handlers through the chain */}
            <TooltipTrigger
              render={
                <UserAvatar
                  name={member.name}
                  imageUrl={member.imageUrl}
                  size="sm"
                />
              }
            />
            <TooltipContent>{member.name}</TooltipContent>
          </Tooltip>
        ) : (
          <UserAvatar
            key={member.id}
            name={member.name}
            imageUrl={member.imageUrl}
            size="sm"
          />
        )
      )}
      {overflow > 0 && (
        <AvatarGroupCount aria-label={`and ${overflow} more`}>
          +{overflow}
        </AvatarGroupCount>
      )}
    </AvatarGroup>
  );
};
