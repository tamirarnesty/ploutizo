import { useCallback, useState } from 'react';
import { Text } from '@ploutizo/ui/components/text';
import {
  ToggleGroup,
  ToggleGroupItem,
} from '@ploutizo/ui/components/toggle-group';
import { AssigneeRow } from './AssigneeRow';
import type { OrgMember } from '@ploutizo/types';
import type { AssigneeFormRow } from './types';
import { formatCurrency } from '@/lib/formatCurrency';
import { lrmSplit } from '@/lib/lrm';

interface SplitSectionProps {
  value: AssigneeFormRow[];
  onChange: (assignees: AssigneeFormRow[]) => void;
  amountCents: number;
  orgMembers: OrgMember[];
}

export const SplitSection = ({
  value,
  onChange,
  amountCents,
  orgMembers,
}: SplitSectionProps) => {
  const [mode, setMode] = useState<'percent' | 'dollar'>('percent');

  const handleRemove = useCallback(
    (memberId: string) => {
      const newMemberIds = value
        .map((r) => r.memberId)
        .filter((id) => id !== memberId);
      onChange(
        newMemberIds.length === 0 ? [] : lrmSplit(amountCents, newMemberIds)
      );
    },
    [value, amountCents, onChange]
  );

  const handleRowChange = useCallback(
    (
      memberId: string,
      patch: Partial<Pick<AssigneeFormRow, 'amountCents' | 'percentage'>>
    ) => {
      const editedRow = {
        ...value.find((r) => r.memberId === memberId)!,
        ...patch,
      };
      const otherRows = value.filter((r) => r.memberId !== memberId);

      if (otherRows.length === 0) {
        onChange(value.map((r) => (r.memberId === memberId ? editedRow : r)));
        return;
      }

      if ('percentage' in patch) {
        const remainingPct = Math.max(0, 100 - editedRow.percentage);
        const remainingCents = Math.max(0, amountCents - editedRow.amountCents);
        const perPct = parseFloat((remainingPct / otherRows.length).toFixed(3));
        const perCents = Math.floor(remainingCents / otherRows.length);
        const centsRemainder = remainingCents - perCents * otherRows.length;
        const newOtherRows = otherRows.map((r, i) => ({
          ...r,
          percentage: perPct,
          amountCents: i < centsRemainder ? perCents + 1 : perCents,
        }));
        onChange(
          value.map((r) =>
            r.memberId === memberId
              ? editedRow
              : newOtherRows.find((nr) => nr.memberId === r.memberId)!
          )
        );
      } else if ('amountCents' in patch) {
        const remainingCents = Math.max(0, amountCents - editedRow.amountCents);
        const perCents = Math.floor(remainingCents / otherRows.length);
        const centsRemainder = remainingCents - perCents * otherRows.length;
        const newOtherRows = otherRows.map((r, i) => {
          const cents = i < centsRemainder ? perCents + 1 : perCents;
          return {
            ...r,
            amountCents: cents,
            percentage:
              amountCents > 0
                ? parseFloat(((cents / amountCents) * 100).toFixed(3))
                : 0,
          };
        });
        onChange(
          value.map((r) =>
            r.memberId === memberId
              ? editedRow
              : newOtherRows.find((nr) => nr.memberId === r.memberId)!
          )
        );
      } else {
        onChange(value.map((r) => (r.memberId === memberId ? editedRow : r)));
      }
    },
    [value, onChange, amountCents]
  );

  const totalPct = value.reduce((sum, r) => sum + r.percentage, 0);
  const totalAmountCents = value.reduce((sum, r) => sum + r.amountCents, 0);

  return (
    <div className="flex flex-col gap-4">
      {/* Header: label + % | $ toggle */}
      <div className="flex items-center justify-between">
        <Text variant="label">Split</Text>
        <ToggleGroup
          value={[mode]}
          onValueChange={(v) => {
            const last = v[v.length - 1];
            if (last) setMode(last as 'percent' | 'dollar');
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
              memberName={
                orgMembers.find((m) => m.id === row.memberId)?.displayName ??
                null
              }
              imageUrl={orgMembers.find((m) => m.id === row.memberId)?.imageUrl}
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

      {/* Totals row */}
      <div className="flex items-center justify-between gap-2">
        <Text variant="caption" className="text-muted-foreground">
          Total: {totalPct.toFixed(1)}% · {formatCurrency(totalAmountCents)}
        </Text>
        {value.length > 0 && Math.abs(totalPct - 100) > 0.5 ? (
          <Text variant="caption" className="text-destructive">
            Percentages must add up to 100%.
          </Text>
        ) : null}
      </div>
    </div>
  );
};
