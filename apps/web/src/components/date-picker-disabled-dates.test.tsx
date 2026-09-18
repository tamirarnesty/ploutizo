import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { DatePicker } from '@ploutizo/ui/components/date-picker';

describe('DatePicker disabledDates', () => {
  it('disables days after the last allowed calendar date', async () => {
    const user = userEvent.setup();
    render(
      <DatePicker
        value="2026-01-15"
        onChange={() => undefined}
        disabledDates={{ after: '2026-01-15' }}
        aria-label="Transaction date"
      />
    );

    await user.click(screen.getByRole('button', { name: 'Transaction date' }));

    expect(
      screen.getByRole('button', { name: /January 15th, 2026/i })
    ).not.toBeDisabled();
    expect(
      screen.getByRole('button', { name: /January 16th, 2026/i })
    ).toBeDisabled();
  });
});
