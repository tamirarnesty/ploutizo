import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { ImportDiscardDraftAction } from './ImportDiscardDraftAction';

describe('ImportDiscardDraftAction', () => {
  it('does not discard until the confirmation is accepted', async () => {
    const user = userEvent.setup();
    const onDiscard = vi.fn();
    render(
      <ImportDiscardDraftAction
        discardingThisDraft={false}
        disabled={false}
        onDiscard={onDiscard}
      />
    );

    await user.click(screen.getByRole('button', { name: 'Discard' }));

    expect(onDiscard).not.toHaveBeenCalled();
    expect(
      screen.getByRole('heading', { name: 'Discard draft?' })
    ).toBeInTheDocument();
  });

  it('discards when confirmation is accepted', async () => {
    const user = userEvent.setup();
    const onDiscard = vi.fn();
    render(
      <ImportDiscardDraftAction
        discardingThisDraft={false}
        disabled={false}
        onDiscard={onDiscard}
      />
    );

    await user.click(screen.getByRole('button', { name: 'Discard' }));
    await user.click(screen.getByRole('button', { name: 'Discard draft' }));

    expect(onDiscard).toHaveBeenCalledTimes(1);
  });
});
