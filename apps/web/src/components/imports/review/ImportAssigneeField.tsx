import type { ImportDraftRow, OrgMember } from '@ploutizo/types';
import { MemberToggleGroup } from '@/components/members/MemberToggleGroup';
import { resolveImportRowAssigneeMemberIds } from '../lib/importPresentation';

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
    <div className="min-w-52">
      <MemberToggleGroup
        multiple
        members={orgMembers}
        value={selectedMemberIds}
        disabled={disabled}
        ariaLabel={ariaLabel}
        onChange={(memberIds) => {
          onSave(memberIds);
        }}
      />
    </div>
  );
};
