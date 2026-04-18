import { useCallback, useState } from 'react'
import { Text } from '@ploutizo/ui/components/text'
import { ToggleGroup, ToggleGroupItem } from '@ploutizo/ui/components/toggle-group'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@ploutizo/ui/components/select'
import { AssigneeRow } from './AssigneeRow'
import type { OrgMember } from '@ploutizo/types'
import type { AssigneeFormRow } from './types'
import { formatCurrency } from '@/lib/formatCurrency'
import { lrmSplit } from '@/lib/lrm'

interface SplitSectionProps {
  value: AssigneeFormRow[]
  onChange: (assignees: AssigneeFormRow[]) => void
  amountCents: number
  orgMembers: OrgMember[]
}

export const SplitSection = ({ value, onChange, amountCents, orgMembers }: SplitSectionProps) => {
  const [mode, setMode] = useState<'percent' | 'dollar'>('percent')

  const handleAddAssignee = useCallback(
    (memberId: string) => {
      if (!memberId) return
      const newMemberIds = [...value.map((r) => r.memberId), memberId]
      onChange(lrmSplit(amountCents, newMemberIds))
    },
    [value, amountCents, onChange],
  )

  const handleRemove = useCallback(
    (memberId: string) => {
      const newMemberIds = value.map((r) => r.memberId).filter((id) => id !== memberId)
      onChange(newMemberIds.length === 0 ? [] : lrmSplit(amountCents, newMemberIds))
    },
    [value, amountCents, onChange],
  )

  const handleRowChange = useCallback(
    (memberId: string, patch: Partial<Pick<AssigneeFormRow, 'amountCents' | 'percentage'>>) => {
      onChange(value.map((r) => (r.memberId === memberId ? { ...r, ...patch } : r)))
    },
    [value, onChange],
  )

  const totalPct = value.reduce((sum, r) => sum + r.percentage, 0)
  const totalAmountCents = value.reduce((sum, r) => sum + r.amountCents, 0)
  const availableMembers = orgMembers.filter((m) => !value.some((a) => a.memberId === m.id))

  return (
    <div className="flex flex-col gap-4">
      {/* Header: label + % | $ toggle */}
      <div className="flex items-center justify-between">
        <Text variant="label">Split</Text>
        <ToggleGroup
          value={[mode]}
          onValueChange={(v) => {
            const last = v[v.length - 1]
            if (last) setMode(last as 'percent' | 'dollar')
          }}
          variant="outline"
        >
          <ToggleGroupItem value="percent" className="h-7 px-2.5 text-xs">
            %
          </ToggleGroupItem>
          <ToggleGroupItem value="dollar" className="h-7 px-2.5 text-xs">
            $
          </ToggleGroupItem>
        </ToggleGroup>
      </div>

      {/* Assignee list or empty state */}
      {value.length === 0 ? (
        <Text variant="body-sm" className="text-muted-foreground">
          No assignees yet. Add one to split this transaction.
        </Text>
      ) : (
        <div className="flex flex-col gap-2">
          {value.map((row) => (
            <AssigneeRow
              key={row.memberId}
              memberId={row.memberId}
              memberName={orgMembers.find((m) => m.id === row.memberId)?.displayName ?? null}
              amountCents={row.amountCents}
              percentage={row.percentage}
              mode={mode}
              totalCents={amountCents}
              onChange={handleRowChange}
              onRemove={handleRemove}
            />
          ))}
        </div>
      )}

      {/* Add assignee picker — filtered to exclude already-assigned members */}
      <Select
        value={null}
        onValueChange={(v) => {
          if (v) handleAddAssignee(v)
        }}
        disabled={availableMembers.length === 0}
      >
        <SelectTrigger className="w-full">
          <SelectValue placeholder="Add assignee…" />
        </SelectTrigger>
        <SelectContent>
          {availableMembers.map((m) => (
            <SelectItem key={m.id} value={m.id}>
              {m.displayName}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Totals row */}
      <div className="flex items-center justify-between gap-2">
        <Text variant="caption" className="text-muted-foreground">
          Total: {totalPct.toFixed(1)}% · {formatCurrency(totalAmountCents)}
        </Text>
        {value.length > 0 && Math.round(totalPct * 10) !== 1000 ? (
          <Text variant="caption" className="text-destructive">
            Percentages must add up to 100%.
          </Text>
        ) : null}
      </div>
    </div>
  )
}
