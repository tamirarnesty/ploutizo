import { X } from 'lucide-react'
import { Avatar, AvatarFallback } from '@ploutizo/ui/components/avatar'
import { Button } from '@ploutizo/ui/components/button'
import { Input } from '@ploutizo/ui/components/input'
import { Text } from '@ploutizo/ui/components/text'
import type { AssigneeFormRow } from './types'
import { formatCurrency } from '@/lib/formatCurrency'

interface AssigneeRowProps {
  memberId: string
  memberName: string | null
  amountCents: number
  percentage: number
  mode: 'percent' | 'dollar'
  totalCents: number
  onChange: (memberId: string, patch: Partial<Pick<AssigneeFormRow, 'amountCents' | 'percentage'>>) => void
  onRemove: (memberId: string) => void
}

const getInitials = (name: string | null): string =>
  name ? name.split(' ').map((w) => w[0]).join('').toUpperCase().slice(0, 2) : '?'

export const AssigneeRow = ({
  memberId,
  memberName,
  amountCents,
  percentage,
  mode,
  totalCents,
  onChange,
  onRemove,
}: AssigneeRowProps) => {
  return (
    <div className="flex items-center gap-2">
      <Avatar size="sm" aria-label={memberName ?? 'Unknown member'}>
        <AvatarFallback>{getInitials(memberName)}</AvatarFallback>
      </Avatar>

      <Text as="span" variant="body-sm" className="min-w-0 flex-1 truncate">
        {memberName ?? 'Unknown'}
      </Text>

      {mode === 'percent' ? (
        <Input
          type="number"
          autoComplete="off"
          value={percentage.toFixed(1)}
          onChange={(e) => {
            const p = parseFloat(e.target.value)
            if (!isNaN(p)) {
              onChange(memberId, {
                percentage: p,
                amountCents: Math.round((p / 100) * totalCents),
              })
            }
          }}
          className="w-20 text-right"
        />
      ) : (
        <Input
          type="number"
          autoComplete="off"
          value={(amountCents / 100).toFixed(2)}
          onChange={(e) => {
            const dollars = parseFloat(e.target.value)
            if (!isNaN(dollars)) {
              const cents = Math.round(dollars * 100)
              onChange(memberId, {
                amountCents: cents,
                percentage: totalCents > 0 ? Math.round((cents / totalCents) * 1000) / 10 : 0,
              })
            }
          }}
          className="w-20 text-right"
        />
      )}

      <Text as="span" variant="body-sm" className="w-20 text-right text-muted-foreground">
        {mode === 'percent' ? formatCurrency(amountCents) : `${percentage.toFixed(1)}%`}
      </Text>

      <Button
        variant="ghost"
        size="icon"
        type="button"
        aria-label={`Remove ${memberName ?? 'assignee'}`}
        onClick={() => onRemove(memberId)}
        className="h-8 w-8 shrink-0"
      >
        <X size={16} aria-hidden="true" />
      </Button>
    </div>
  )
}
