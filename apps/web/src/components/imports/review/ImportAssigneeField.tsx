import type { ImportDraftRow, OrgMember } from '@ploutizo/types';
import { MemberAvatarGroup } from '@/components/members/MemberAvatarGroup';
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
  const selectedMembers = selectedMemberIds
    .map((id) => orgMembers.find((member) => member.id === id))
    .filter((member): member is OrgMember => member !== undefined)
    .map((member) => ({
      id: member.id,
      name: member.displayName,
      imageUrl: member.imageUrl,
    }));

  return (
    <div className="min-w-52">
      {disabled ? (
        <MemberAvatarGroup members={selectedMembers} withTooltips />
      ) : (
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
