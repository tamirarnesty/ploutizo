import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { OrgMember } from '@ploutizo/types';
import { ImportAssigneeField } from './ImportAssigneeField';
import { makeImportDraftRow } from './test-fixtures/importDraft';

vi.mock('@/components/members/MemberToggleGroup', () => ({
  MemberToggleGroup: () => <div data-testid="member-toggle-group">Toggle</div>,
}));

vi.mock('@/components/members/MemberAvatarGroup', () => ({
  MemberAvatarGroup: ({
    members,
    emptyFallback = <span>—</span>,
  }: {
    members: { id: string; name: string }[];
    emptyFallback?: React.ReactNode;
  }) =>
    members.length === 0 ? (
      emptyFallback
    ) : (
      <div data-testid="member-avatar-group">
        {members.map((member) => (
          <span key={member.id} data-testid="member-avatar">
            {member.name}
          </span>
        ))}
      </div>
    ),
}));

const orgMembers: OrgMember[] = [
  {
    id: 'member_1',
    orgId: 'org_1',
    displayName: 'Tamir Arnesty',
    role: 'admin',
    joinedAt: '2026-01-01T00:00:00.000Z',
    externalId: 'user_1',
    firstName: 'Tamir',
    lastName: 'Arnesty',
    imageUrl: null,
  },
];

describe('ImportAssigneeField', () => {
  it('renders read-only avatars when disabled', () => {
    render(
      <ImportAssigneeField
        row={makeImportDraftRow({
          status: 'invalid',
          reviewAssigneeMemberIds: ['member_1'],
        })}
        orgMembers={orgMembers}
        disabled
        onSave={vi.fn()}
      />
    );

    expect(screen.getByTestId('member-avatar-group')).toBeInTheDocument();
    expect(screen.getByText('Tamir Arnesty')).toBeInTheDocument();
    expect(screen.queryByTestId('member-toggle-group')).not.toBeInTheDocument();
  });

  it('renders the editable toggle group when not disabled', () => {
    render(
      <ImportAssigneeField
        row={makeImportDraftRow({ reviewAssigneeMemberIds: ['member_1'] })}
        orgMembers={orgMembers}
        onSave={vi.fn()}
      />
    );

    expect(screen.getByTestId('member-toggle-group')).toBeInTheDocument();
    expect(screen.queryByTestId('member-avatar-group')).not.toBeInTheDocument();
  });

  it('shows the empty avatar fallback when disabled with no assignees', () => {
    render(
      <ImportAssigneeField
        row={makeImportDraftRow({
          status: 'invalid',
          reviewAssigneeMemberIds: [],
        })}
        orgMembers={orgMembers}
        disabled
        onSave={vi.fn()}
      />
    );

    expect(screen.getByText('—')).toBeInTheDocument();
    expect(screen.queryByTestId('member-toggle-group')).not.toBeInTheDocument();
  });
});
