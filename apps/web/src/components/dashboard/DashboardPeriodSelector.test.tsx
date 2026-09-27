import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { DashboardPeriodSelector } from '@/components/dashboard/DashboardPeriodSelector';

const MTD_PERIOD = {
  kind: 'ranged',
  from: '2026-03-01',
  to: '2026-03-24',
  bucket: 'day',
  prior: { from: '2026-02-01', to: '2026-02-24' },
} as const;

describe('DashboardPeriodSelector', () => {
  beforeEach(() => {
    vi.setSystemTime(new Date('2026-03-24T12:00:00'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('opens the calendar on the resolved range and commits edits only after Apply', async () => {
    const user = userEvent.setup();
    const onApplyCustomRange = vi.fn();

    render(
      <DashboardPeriodSelector
        selection={{ kind: 'shortcut', shortcut: 'mtd' }}
        period={MTD_PERIOD}
        label="Mar 1 – Mar 24, 2026"
        onSelectShortcut={vi.fn()}
        onApplyCustomRange={onApplyCustomRange}
      />
    );

    const trigger = screen.getByRole('button', {
      name: 'Custom period: Mar 1 – Mar 24, 2026',
    });
    const dayButton = (name: RegExp) => screen.getByRole('button', { name });

    await user.click(trigger);
    expect(dayButton(/March 1st, 2026/)).toHaveAccessibleName(/selected/);
    expect(dayButton(/March 24th, 2026/)).toHaveAccessibleName(/selected/);

    await user.click(dayButton(/March 20th, 2026/));
    await user.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(onApplyCustomRange).not.toHaveBeenCalled();

    await user.click(trigger);
    await user.click(dayButton(/March 20th, 2026/));
    await user.click(screen.getByRole('button', { name: 'Apply' }));
    expect(onApplyCustomRange).toHaveBeenCalledWith('2026-03-01', '2026-03-20');
  });

  it('calls shortcut handlers from the toggle group', async () => {
    const user = userEvent.setup();
    const onSelectShortcut = vi.fn();

    render(
      <DashboardPeriodSelector
        selection={{ kind: 'shortcut', shortcut: 'mtd' }}
        period={MTD_PERIOD}
        label="Mar 1 – Mar 24, 2026"
        onSelectShortcut={onSelectShortcut}
        onApplyCustomRange={vi.fn()}
      />
    );

    await user.click(screen.getByRole('button', { name: 'All' }));
    expect(onSelectShortcut).toHaveBeenCalledWith('all');
  });
});
