import { useCallback, useEffect, useRef, useState } from 'react'
import { ChevronDown } from 'lucide-react'
import { Toggle } from '@ploutizo/ui/components/toggle'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@ploutizo/ui/components/collapsible'
import { Avatar, AvatarFallback, AvatarImage } from '@ploutizo/ui/components/avatar'
import { Text } from '@ploutizo/ui/components/text'
import { cn } from '@ploutizo/ui/lib/utils'
import { SplitSection } from './SplitSection'
import type { OrgMember } from '@ploutizo/types'
import type { AssigneeFormRow } from './types'
import type { TransactionRow } from '@/lib/data-access/transactions'
import { lrmSplit } from '@/lib/lrm'

interface AssigneeSectionProps {
  value: AssigneeFormRow[]
  onChange: (assignees: AssigneeFormRow[]) => void
  amountCents: number
  orgMembers: OrgMember[]
  transaction?: TransactionRow | null
  refundAssigneeIds?: string[]
}

/**
 * Toggle-based assignee section that replaces SplitSection at the top level.
 *
 * Each org member gets a Toggle. Pressing a Toggle adds them to the split and
 * recalculates an LRM even split across all pressed members. The "Customize split"
 * Collapsible exposes the full SplitSection row editor when needed.
 *
 * Pressed defaults (D-17):
 *   - 1 org member → auto-pressed (100% split) in create mode
 *   - 2+ org members → all un-pressed in create mode
 *
 * Edit mode (D-18):
 *   - Pressed = member in transaction.assignees; un-pressed = absent
 *   - Collapsible pre-opened if distribution is non-even
 */
export const AssigneeSection = ({
  value,
  onChange,
  amountCents,
  orgMembers,
  transaction,
  refundAssigneeIds,
}: AssigneeSectionProps) => {
  // Initialize pressed member IDs
  const initialPressedIds = transaction
    ? (transaction.assignees?.map((a) => a.memberId) ?? [])
    : orgMembers.length === 1
      ? [orgMembers[0].id]
      : []

  const [pressedMemberIds, setPressedMemberIds] = useState<string[]>(initialPressedIds)

  // Skips initial render to preserve saved edit-mode splits on mount, then fires on
  // every subsequent amountCents change in both create and edit mode.
  const isInitialRender = useRef(true)
  useEffect(() => {
    if (isInitialRender.current) {
      isInitialRender.current = false
      return
    }
    if (amountCents > 0 && pressedMemberIds.length > 0) {
      onChange(lrmSplit(amountCents, pressedMemberIds))
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [amountCents])

  // Issue 6: pre-fill assignees from the original transaction when creating a refund
  useEffect(() => {
    if (!transaction && refundAssigneeIds && refundAssigneeIds.length > 0) {
      setPressedMemberIds(refundAssigneeIds)
      if (amountCents > 0) {
        onChange(lrmSplit(amountCents, refundAssigneeIds))
      }
    }
    // Only re-run when refundAssigneeIds changes (new refundOf selected)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refundAssigneeIds])

  // Determine initial Collapsible state: open in edit mode if distribution is non-even
  const isNonEven = (assignees: AssigneeFormRow[]): boolean => {
    if (assignees.length <= 1) return false
    const expectedPct = parseFloat((100 / assignees.length).toFixed(3))
    return assignees.some(
      (a) => Math.abs(a.percentage - expectedPct) > 0.1,
    )
  }

  const [customizeOpen, setCustomizeOpen] = useState(() =>
    transaction ? isNonEven(transaction.assignees ?? []) : false,
  )

  const handleToggle = useCallback(
    (memberId: string, pressed: boolean) => {
      if (pressed) {
        const newMemberIds = [...pressedMemberIds, memberId]
        setPressedMemberIds(newMemberIds)
        onChange(lrmSplit(amountCents, newMemberIds))
      } else {
        const newMemberIds = pressedMemberIds.filter((id) => id !== memberId)
        setPressedMemberIds(newMemberIds)
        onChange(newMemberIds.length === 0 ? [] : lrmSplit(amountCents, newMemberIds))
      }
    },
    [pressedMemberIds, amountCents, onChange],
  )

  // Only the pressed members are passed to SplitSection
  const pressedMembers = orgMembers.filter((m) => pressedMemberIds.includes(m.id))

  return (
    <div className="flex flex-col gap-3">
      <Text variant="label">Assignees</Text>

      {/* Toggle row — one per org member */}
      <div className="flex flex-wrap gap-2">
        {orgMembers.map((member) => {
          const isPressed = pressedMemberIds.includes(member.id)
          const initials = member.displayName
            .split(' ')
            .map((n) => n[0])
            .join('')
            .toUpperCase()
            .slice(0, 2)
          return (
            <Toggle
              key={member.id}
              variant="outline"
              size="lg"
              pressed={isPressed}
              onPressedChange={(pressed) => handleToggle(member.id, pressed)}
              className={cn(
                'px-3',
                // Override default data-[state=on]:bg-muted with primary tint
                // (CLAUDE.md: override at usage site, never in toggle.tsx)
                'data-[state=on]:bg-primary/10 data-[state=on]:text-primary data-[state=on]:border-primary/30',
              )}
              aria-label={`${isPressed ? 'Remove' : 'Add'} ${member.displayName}`}
            >
              <Avatar size="sm">
                {member.imageUrl ? (
                  <AvatarImage src={member.imageUrl} alt={member.displayName} />
                ) : null}
                <AvatarFallback>{initials}</AvatarFallback>
              </Avatar>
              <span className="ml-1.5 text-sm">{member.displayName.split(' ')[0]}</span>
            </Toggle>
          )
        })}
      </div>

      {/* "Customize split" Collapsible — only shown when 2+ members are pressed */}
      {pressedMemberIds.length > 1 ? (
        <Collapsible open={customizeOpen} onOpenChange={setCustomizeOpen}>
          <CollapsibleTrigger className="w-fit">
            <Text
              as="span"
              variant="body-sm"
              className="flex cursor-pointer items-center gap-1 text-muted-foreground hover:text-foreground"
            >
              Customize split
              <ChevronDown
                className={cn(
                  'size-4 transition-transform',
                  customizeOpen && 'rotate-180',
                )}
                aria-hidden="true"
              />
            </Text>
          </CollapsibleTrigger>
          <CollapsibleContent className="pt-3">
            <SplitSection
              value={value}
              onChange={onChange}
              amountCents={amountCents}
              orgMembers={pressedMembers}
            />
          </CollapsibleContent>
        </Collapsible>
      ) : null}
    </div>
  )
}
