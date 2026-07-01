import type { ImportDraftRow, OrgMember } from '@ploutizo/types';
import { MemberToggleGroup } from '@/components/members/MemberToggleGroup';
import { resolveImportRowAssigneeMemberIds } from './importPresentation';

interface ImportAssigneeFieldProps {
  row: ImportDraftRow;
  orgMembers: OrgMember[];
  disabled?: boolean;
  ariaLabel?: string;
  onSave: (memberIds: string[]) => void;
}

export const ImportAssigneeField = ({
  row,
  orgMembers,
  disabled = false,
  ariaLabel,
  onSave,
}: ImportAssigneeFieldProps) => {
  const selectedMemberIds = resolveImportRowAssigneeMemberIds(row, orgMembers);

  return (
    <div className="min-w-[220px]">
      {disabled ? null : (
        <MemberToggleGroup
          multiple
          members={orgMembers}
          value={selectedMemberIds}
          ariaLabel={ariaLabel}
          onChange={(memberIds) => {
            onSave(memberIds);
          }}
        />
      )}
    </div>
  );
};
