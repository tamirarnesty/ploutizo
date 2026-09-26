import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { DashboardPeriodSelector } from '@/components/dashboard/DashboardPeriodSelector';

describe('DashboardPeriodSelector', () => {
  beforeEach(() => {
    vi.setSystemTime(new Date('2026-03-24T12:00:00'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('commits a custom range only after Apply', async () => {
    const user = userEvent.setup();
    const onApplyCustomRange = vi.fn();
    const onSelectShortcut = vi.fn();

    render(
      <DashboardPeriodSelector
        selection={{ kind: 'shortcut', shortcut: 'mtd' }}
        label="MTD"
        onSelectShortcut={onSelectShortcut}
        onApplyCustomRange={onApplyCustomRange}
      />
    );

    const clickDay = async (day: string) => {
      const cell = screen
        .getAllByText(day, { exact: true })
        .map((node) => node.closest('button'))
        .find(Boolean);
      if (!cell) {
        throw new Error(`Day ${day} not found`);
      }
      await user.click(cell);
    };

    await user.click(
      screen.getByRole('button', { name: 'Custom period: MTD' })
    );
    await clickDay('15');
    await clickDay('20');
    await user.click(screen.getByRole('button', { name: 'Cancel' }));

    expect(onApplyCustomRange).not.toHaveBeenCalled();

    await user.click(
      screen.getByRole('button', { name: 'Custom period: MTD' })
    );
    await clickDay('15');
    await clickDay('20');
    await user.click(screen.getByRole('button', { name: 'Apply' }));

    expect(onApplyCustomRange).toHaveBeenCalledWith('2026-03-15', '2026-03-20');
  });

  it('calls shortcut handlers from the toggle group', async () => {
    const user = userEvent.setup();
    const onSelectShortcut = vi.fn();

    render(
      <DashboardPeriodSelector
        selection={{ kind: 'shortcut', shortcut: 'mtd' }}
        label="MTD"
        onSelectShortcut={onSelectShortcut}
        onApplyCustomRange={vi.fn()}
      />
    );

    await user.click(screen.getByRole('button', { name: 'All' }));
    expect(onSelectShortcut).toHaveBeenCalledWith('all');
  });
});
