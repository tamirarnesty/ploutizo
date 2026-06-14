import { useCallback, useEffect, useRef, useState } from 'react';
import { ChevronDown } from 'lucide-react';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@ploutizo/ui/components/collapsible';
import { Text } from '@ploutizo/ui/components/text';
import { cn } from '@ploutizo/ui/lib/utils';
import { lrmSplit, scaleAssigneeSplitProportionally } from '@ploutizo/utils';
import type { OrgMember } from '@ploutizo/types';
import { MemberToggleGroup } from '@/components/members/MemberToggleGroup';
import type { TransactionRow } from '@/lib/data-access/transactions';
import { SplitSection } from './SplitSection';
import type { AssigneeFormRow } from './types';

interface AssigneeSectionProps {
  value: AssigneeFormRow[];
  onChange: (assignees: AssigneeFormRow[]) => void;
  amountCents: number;
  orgMembers: OrgMember[];
  transaction?: TransactionRow | null;
  refundAssigneeIds?: string[];
}

const matchesLrmSplit = (
  assignees: AssigneeFormRow[],
  totalCents: number,
  memberIds: string[]
): boolean => {
  if (memberIds.length === 0) {
    return assignees.length === 0;
  }
  const expected = lrmSplit(totalCents, memberIds);
  return JSON.stringify(expected) === JSON.stringify(assignees);
};

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
  const initialPressedIds = transaction
    ? transaction.assignees.map((a) => a.memberId)
    : orgMembers.length === 1
      ? [orgMembers[0].id]
      : [];

  const [pressedMemberIds, setPressedMemberIds] =
    useState<string[]>(initialPressedIds);

  const splitCustomized = useRef(
    transaction
      ? !matchesLrmSplit(value, amountCents, initialPressedIds)
      : false
  );

  const valueRef = useRef(value);
  valueRef.current = value;

  const isInitialRender = useRef(true);
  useEffect(() => {
    if (isInitialRender.current) {
      isInitialRender.current = false;
      return;
    }
    if (pressedMemberIds.length === 0) return;

    const current = valueRef.current;

    if (amountCents === 0) {
      const next = current.map((row) => ({
        ...row,
        amountCents: 0,
        percentage: 0,
      }));
      if (JSON.stringify(next) !== JSON.stringify(current)) {
        onChange(next);
      }
      return;
    }

    const next = splitCustomized.current
      ? scaleAssigneeSplitProportionally(current, amountCents)
      : lrmSplit(amountCents, pressedMemberIds);

    if (JSON.stringify(next) !== JSON.stringify(current)) {
      onChange(next);
    }
  }, [amountCents, pressedMemberIds, onChange]);

  useEffect(() => {
    if (!transaction && refundAssigneeIds && refundAssigneeIds.length > 0) {
      setPressedMemberIds(refundAssigneeIds);
      splitCustomized.current = false;
      if (amountCents > 0) {
        onChange(lrmSplit(amountCents, refundAssigneeIds));
      }
    }
  }, [refundAssigneeIds]);

  const isNonEven = (
    assignees: { percentage: number | string | null }[]
  ): boolean => {
    if (assignees.length <= 1) return false;
    const expectedPct = parseFloat((100 / assignees.length).toFixed(3));
    return assignees.some(
      (a) => Math.abs(Number(a.percentage) - expectedPct) > 0.1
    );
  };

  const [customizeOpen, setCustomizeOpen] = useState(() =>
    transaction ? isNonEven(transaction.assignees) : false
  );

  const pressedMembers = orgMembers.filter((m) =>
    pressedMemberIds.includes(m.id)
  );

  const handleSplitChange = useCallback(
    (next: AssigneeFormRow[]) => {
      splitCustomized.current = !matchesLrmSplit(
        next,
        amountCents,
        pressedMemberIds
      );
      onChange(next);
    },
    [amountCents, onChange, pressedMemberIds]
  );

  return (
    <div className="flex flex-col gap-3">
      <Text variant="label">Assignees</Text>

      <MemberToggleGroup
        members={orgMembers}
        value={pressedMemberIds}
        onChange={(newIds) => {
          setPressedMemberIds(newIds);
          splitCustomized.current = false;
          if (newIds.length === 0) {
            onChange([]);
            return;
          }
          if (amountCents <= 0) return;
          const next = lrmSplit(amountCents, newIds);
          if (JSON.stringify(next) !== JSON.stringify(value)) {
            onChange(next);
          }
        }}
      />

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
                  customizeOpen && 'rotate-180'
                )}
                aria-hidden="true"
              />
            </Text>
          </CollapsibleTrigger>
          <CollapsibleContent className="pt-3">
            <SplitSection
              value={value}
              onChange={handleSplitChange}
              amountCents={amountCents}
              orgMembers={pressedMembers}
            />
          </CollapsibleContent>
        </Collapsible>
      ) : null}
    </div>
  );
};
