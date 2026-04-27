import { Avatar, AvatarFallback, AvatarImage } from '@ploutizo/ui/components/avatar'
import { getInitials } from '@/lib/getInitials'

type UserAvatarProps = Omit<React.ComponentProps<typeof Avatar>, 'children' | 'aria-label'> & {
  name: string
  imageUrl?: string | null
}

export const UserAvatar = ({ name, imageUrl, size = 'default', className, ...props }: UserAvatarProps) => (
  <Avatar {...props} size={size} aria-label={name} className={className}>
    {imageUrl ? <AvatarImage src={imageUrl} alt={name} /> : null}
    <AvatarFallback>{getInitials(name)}</AvatarFallback>
  </Avatar>
)
