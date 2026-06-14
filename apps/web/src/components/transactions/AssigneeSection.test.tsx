import '@/test/mockInputGroup';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import type { OrgMember } from '@ploutizo/types';
import type { TransactionRow } from '@/lib/data-access/transactions';
import { AssigneeSection } from './AssigneeSection';
import type { AssigneeFormRow } from './types';

vi.mock('@/components/members/MemberToggleGroup', () => ({
  MemberToggleGroup: ({
    onChange,
  }: {
    value: string[];
    onChange: (ids: string[]) => void;
  }) => (
    <button type="button" onClick={() => onChange(['member-a', 'member-b'])}>
      Select two members
    </button>
  ),
}));

const readAssigneesFromDom = (): AssigneeFormRow[] => {
  const text = screen.getByTestId('assignees').textContent;
  expect(text).toBeTruthy();
  return JSON.parse(text) as AssigneeFormRow[];
};

const members: OrgMember[] = [
  {
    id: 'member-a',
    orgId: 'org-1',
    displayName: 'Member A',
    role: 'admin',
    joinedAt: '2026-01-01T00:00:00.000Z',
    externalId: 'ext-a',
    imageUrl: null,
    firstName: 'Member',
    lastName: 'A',
  },
  {
    id: 'member-b',
    orgId: 'org-1',
    displayName: 'Member B',
    role: 'admin',
    joinedAt: '2026-01-01T00:00:00.000Z',
    externalId: 'ext-b',
    imageUrl: null,
    firstName: 'Member',
    lastName: 'B',
  },
];

const customTransaction = {
  id: 'tx-1',
  assignees: [
    {
      transactionId: 'tx-1',
      memberId: 'member-a',
      amountCents: 6000,
      percentage: '60',
      memberName: 'Member A',
      imageUrl: null,
    },
    {
      transactionId: 'tx-1',
      memberId: 'member-b',
      amountCents: 4000,
      percentage: '40',
      memberName: 'Member B',
      imageUrl: null,
    },
  ],
} as TransactionRow;

const AssigneeSectionHarness = ({
  initialAssignees,
  initialAmountCents,
  transaction = customTransaction,
}: {
  initialAssignees: AssigneeFormRow[];
  initialAmountCents: number;
  transaction?: TransactionRow | null;
}) => {
  const [assignees, setAssignees] = useState(initialAssignees);
  const [amountCents, setAmountCents] = useState(initialAmountCents);

  return (
    <>
      <AssigneeSection
        value={assignees}
        onChange={setAssignees}
        amountCents={amountCents}
        orgMembers={members}
        transaction={transaction}
      />
      <output data-testid="assignees">{JSON.stringify(assignees)}</output>
      <button type="button" onClick={() => setAmountCents(20000)}>
        Set amount to 200
      </button>
    </>
  );
};

describe('AssigneeSection', () => {
  it('preserves a customized split instead of resetting to even', async () => {
    render(
      <AssigneeSectionHarness
        initialAssignees={[
          { memberId: 'member-a', amountCents: 6000, percentage: 60 },
          { memberId: 'member-b', amountCents: 4000, percentage: 40 },
        ]}
        initialAmountCents={10000}
      />
    );

    await waitFor(() => {
      expect(screen.getByTestId('assignees')).toHaveTextContent(
        '"amountCents":6000'
      );
      expect(screen.getByTestId('assignees')).toHaveTextContent(
        '"amountCents":4000'
      );
    });
  });

  it('scales customized splits proportionally when amount changes', async () => {
    const user = userEvent.setup();

    render(
      <AssigneeSectionHarness
        initialAssignees={[
          { memberId: 'member-a', amountCents: 6000, percentage: 60 },
          { memberId: 'member-b', amountCents: 4000, percentage: 40 },
        ]}
        initialAmountCents={10000}
      />
    );

    await user.click(screen.getByRole('button', { name: 'Set amount to 200' }));

    await waitFor(() => {
      const assignees = readAssigneesFromDom();
      expect(assignees).toEqual([
        { memberId: 'member-a', amountCents: 12000, percentage: 60 },
        { memberId: 'member-b', amountCents: 8000, percentage: 40 },
      ]);
    });
  });

  it('re-evens when member toggles change', async () => {
    const user = userEvent.setup();

    render(
      <AssigneeSectionHarness
        initialAssignees={[
          { memberId: 'member-a', amountCents: 6000, percentage: 60 },
          { memberId: 'member-b', amountCents: 4000, percentage: 40 },
        ]}
        initialAmountCents={10000}
        transaction={null}
      />
    );

    await user.click(
      screen.getByRole('button', { name: 'Select two members' })
    );

    await waitFor(() => {
      const assignees = readAssigneesFromDom();
      expect(assignees).toEqual([
        { memberId: 'member-a', amountCents: 5000, percentage: 50 },
        { memberId: 'member-b', amountCents: 5000, percentage: 50 },
      ]);
    });
  });
});
