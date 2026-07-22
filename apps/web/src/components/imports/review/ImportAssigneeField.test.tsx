import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { OrgMember } from '@ploutizo/types';
import { makeImportDraftRow } from '../test-fixtures/importDraft';
import { ImportAssigneeField } from './ImportAssigneeField';

vi.mock('@/components/members/MemberToggleGroup', () => ({
  MemberToggleGroup: ({ disabled }: { disabled?: boolean }) => (
    <div data-testid="member-toggle-group" data-disabled={disabled}>
      Toggle
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
  it('renders a disabled toggle group when disabled', () => {
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

    expect(screen.getByTestId('member-toggle-group')).toHaveAttribute(
      'data-disabled',
      'true'
    );
  });

  it('renders the editable toggle group when not disabled', () => {
    render(
      <ImportAssigneeField
        row={makeImportDraftRow({ reviewAssigneeMemberIds: ['member_1'] })}
        orgMembers={orgMembers}
        onSave={vi.fn()}
      />
    );

    expect(screen.getByTestId('member-toggle-group')).toHaveAttribute(
      'data-disabled',
      'false'
    );
  });
});
