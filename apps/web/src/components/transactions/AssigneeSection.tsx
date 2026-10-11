import { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@ploutizo/ui/components/collapsible';
import { Text } from '@ploutizo/ui/components/text';
import { cn } from '@ploutizo/ui/lib/utils';
import type { OrgMember, TransactionRow } from '@ploutizo/validators';
import { MemberToggleGroup } from '@/components/members/MemberToggleGroup';
import { splitAssigneesEvenly } from './assigneeSplit';
import { SplitSection } from './SplitSection';
import type { AssigneeFormRow } from './types';

interface AssigneeSectionProps {
  value: AssigneeFormRow[];
  onChange: (assignees: AssigneeFormRow[]) => void;
  amountCents: number;
  orgMembers: OrgMember[];
  transaction?: TransactionRow | null;
}

const isNonEven = (assignees: { percentage: number | null }[]): boolean => {
  if (assignees.length <= 1) return false;
  const expectedPct = parseFloat((100 / assignees.length).toFixed(3));
  return assignees.some(
    (a) => Math.abs((a.percentage ?? 0) - expectedPct) > 0.1
  );
};

/**
 * Toggle-based assignee section that replaces SplitSection at the top level.
 *
 * Each org member gets a Toggle; the pressed members are the split's rows.
 * Pressing a Toggle re-splits the amount evenly across all pressed members.
 * The "Customize split" Collapsible exposes the full SplitSection row editor
 * when needed. Amount changes are carried over to the split by the amount field.
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
}: AssigneeSectionProps) => {
  const [customizeOpen, setCustomizeOpen] = useState(() =>
    transaction ? isNonEven(transaction.assignees) : false
  );

  const pressedMemberIds = value.map((row) => row.memberId);
  const pressedSet = new Set(pressedMemberIds);
  const pressedMembers = orgMembers.filter((m) => pressedSet.has(m.id));

  return (
    <div className="flex flex-col gap-3">
      <Text variant="label">Assignees</Text>

      <MemberToggleGroup
        members={orgMembers}
        value={pressedMemberIds}
        onChange={(newIds) => {
          onChange(splitAssigneesEvenly(amountCents, newIds));
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
