import '@/test/mockInputGroup';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { AssigneeRow } from './AssigneeRow';

describe('AssigneeRow', () => {
  it('updates canonical cents while a dollar edit is still focused', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();

    render(
      <AssigneeRow
        memberId="member-1"
        memberName="Ada Lovelace"
        amountCents={1000}
        percentage={50}
        mode="dollar"
        totalCents={2000}
        onChange={onChange}
        onRemove={vi.fn()}
      />
    );

    const input = screen.getByRole('textbox');
    await user.click(input);
    await user.clear(input);
    await user.type(input, '12.34');

    expect(input).toHaveFocus();
    expect(onChange).toHaveBeenLastCalledWith('member-1', {
      amountCents: 1234,
      percentage: 61.7,
    });
  });
});
