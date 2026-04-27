import { useEffect, useRef, useState } from 'react'
import { X } from 'lucide-react'
import { Button } from '@ploutizo/ui/components/button'
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from '@ploutizo/ui/components/input-group'
import { Text } from '@ploutizo/ui/components/text'
import type { AssigneeFormRow } from './types'
import { formatCurrency } from '@/lib/formatCurrency'
import { UserAvatar } from '@/components/members/UserAvatar'

interface AssigneeRowProps {
  memberId: string
  memberName: string | null
  imageUrl?: string | null
  amountCents: number
  percentage: number
  mode: 'percent' | 'dollar'
  totalCents: number
  onChange: (memberId: string, patch: Partial<Pick<AssigneeFormRow, 'amountCents' | 'percentage'>>) => void
  onRemove: (memberId: string) => void
}

const toDisplay = (mode: 'percent' | 'dollar', percentage: number, amountCents: number) =>
  mode === 'percent' ? percentage.toFixed(1) : (amountCents / 100).toFixed(2)

export const AssigneeRow = ({
  memberId,
  memberName,
  imageUrl,
  amountCents,
  percentage,
  mode,
  totalCents,
  onChange,
  onRemove,
}: AssigneeRowProps) => {
  const [displayValue, setDisplayValue] = useState(toDisplay(mode, percentage, amountCents))
  const isFocusedRef = useRef(false)
  const prevModeRef = useRef(mode)

  useEffect(() => {
    const modeChanged = prevModeRef.current !== mode
    prevModeRef.current = mode
    // Always sync on mode switch; sync on value change only when not typing
    if (modeChanged || !isFocusedRef.current) {
      setDisplayValue(toDisplay(mode, percentage, amountCents))
    }
  }, [mode, percentage, amountCents])

  return (
    <div className="flex items-center gap-2">
      <UserAvatar size="sm" name={memberName ?? 'Unknown member'} imageUrl={imageUrl} />

      <Text as="span" variant="body-sm" className="min-w-0 flex-1 truncate">
        {memberName ?? 'Unknown'}
      </Text>

      <InputGroup className="w-24 shrink-0">
        <InputGroupAddon align="inline-start">
          {mode === 'percent' ? '%' : '$'}
        </InputGroupAddon>
        <InputGroupInput
          type="text"
          inputMode="decimal"
          autoComplete="off"
          className="text-right"
          value={displayValue}
          onFocus={() => { isFocusedRef.current = true }}
          onBlur={() => {
            isFocusedRef.current = false
            setDisplayValue(toDisplay(mode, percentage, amountCents))
          }}
          onChange={(e) => {
            const raw = e.target.value
            setDisplayValue(raw)
            if (mode === 'percent') {
              const p = parseFloat(raw)
              if (!isNaN(p)) {
                onChange(memberId, {
                  percentage: p,
                  amountCents: Math.round((p / 100) * totalCents),
                })
              }
            } else {
              const dollars = parseFloat(raw)
              if (!isNaN(dollars)) {
                const cents = Math.round(dollars * 100)
                onChange(memberId, {
                  amountCents: cents,
                  percentage: totalCents > 0 ? Math.round((cents / totalCents) * 1000) / 10 : 0,
                })
              }
            }
          }}
        />
      </InputGroup>

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
