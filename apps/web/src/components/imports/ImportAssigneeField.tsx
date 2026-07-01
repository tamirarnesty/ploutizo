import { Badge } from '@ploutizo/ui/components/badge';
import { Text } from '@ploutizo/ui/components/text';
import type { ImportDraftRow, OrgMember } from '@ploutizo/types';
import { MemberToggleGroup } from '@/components/members/MemberToggleGroup';
import {
  getImportRowCsvAssigneeHint,
  matchOrgMemberIdByHint,
} from './importPresentation';

interface ImportAssigneeFieldProps {
  row: ImportDraftRow;
  orgMembers: OrgMember[];
  disabled?: boolean;
  onSave: (assigneeHint: string | null) => void;
}

export const ImportAssigneeField = ({
  row,
  orgMembers,
  disabled = false,
  onSave,
}: ImportAssigneeFieldProps) => {
  const csvAssigneeHint = getImportRowCsvAssigneeHint(row);
  const selectedMemberId = matchOrgMemberIdByHint(
    row.reviewAssigneeHint,
    orgMembers
  );

  return (
    <div className="flex min-w-[220px] flex-col gap-2">
      {csvAssigneeHint ? (
        <Badge
          variant="outline"
          className="w-fit border-primary/30 bg-primary/10 text-primary"
        >
          CSV: {csvAssigneeHint}
        </Badge>
      ) : (
        <Text variant="body-sm" className="text-muted-foreground">
          No assignee in CSV
        </Text>
      )}
      {disabled ? null : (
        <MemberToggleGroup
          multiple={false}
          members={orgMembers}
          value={selectedMemberId ? [selectedMemberId] : []}
          onChange={(memberIds) => {
            const member = orgMembers.find(
              (option) => option.id === memberIds.at(-1)
            );
            onSave(member?.displayName ?? null);
          }}
        />
      )}
    </div>
  );
};
