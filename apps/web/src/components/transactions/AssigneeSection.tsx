import { useEffect, useRef, useState } from 'react';
import { ChevronDown } from 'lucide-react';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@ploutizo/ui/components/collapsible';
import { Text } from '@ploutizo/ui/components/text';
import { cn } from '@ploutizo/ui/lib/utils';
import { SplitSection } from './SplitSection';
import type { OrgMember } from '@ploutizo/types';
import type { AssigneeFormRow } from './types';
import type { TransactionRow } from '@/lib/data-access/transactions';
import { MemberToggleGroup } from '@/components/members/MemberToggleGroup';
import { lrmSplit } from '@/lib/lrm';

interface AssigneeSectionProps {
  value: AssigneeFormRow[];
  onChange: (assignees: AssigneeFormRow[]) => void;
  amountCents: number;
  orgMembers: OrgMember[];
  transaction?: TransactionRow | null;
  refundAssigneeIds?: string[];
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
    ? transaction.assignees.map((a) => a.memberId)
    : orgMembers.length === 1
      ? [orgMembers[0].id]
      : [];

  const [pressedMemberIds, setPressedMemberIds] =
    useState<string[]>(initialPressedIds);

  // Skips initial render to preserve saved edit-mode splits on mount, then fires on
  // every subsequent amountCents change in both create and edit mode.
  const isInitialRender = useRef(true);
  useEffect(() => {
    if (isInitialRender.current) {
      isInitialRender.current = false;
      return;
    }
    if (amountCents > 0 && pressedMemberIds.length > 0) {
      onChange(lrmSplit(amountCents, pressedMemberIds));
    }
  }, [amountCents]);

  // Issue 6: pre-fill assignees from the original transaction when creating a refund
  useEffect(() => {
    if (!transaction && refundAssigneeIds && refundAssigneeIds.length > 0) {
      setPressedMemberIds(refundAssigneeIds);
      if (amountCents > 0) {
        onChange(lrmSplit(amountCents, refundAssigneeIds));
      }
    }
    // Only re-run when refundAssigneeIds changes (new refundOf selected)
  }, [refundAssigneeIds]);

  // percentage from TransactionAssignee is string|null; from AssigneeFormRow is number
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

  // Only the pressed members are passed to SplitSection
  const pressedMembers = orgMembers.filter((m) =>
    pressedMemberIds.includes(m.id)
  );

  return (
    <div className="flex flex-col gap-3">
      <Text variant="label">Assignees</Text>

      <MemberToggleGroup
        members={orgMembers}
        value={pressedMemberIds}
        onChange={(newIds) => {
          setPressedMemberIds(newIds);
          onChange(newIds.length === 0 ? [] : lrmSplit(amountCents, newIds));
        }}
      />

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
                  customizeOpen && 'rotate-180'
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
  );
};
