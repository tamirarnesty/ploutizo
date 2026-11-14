import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it } from 'vitest';
import { TooltipProvider } from '@ploutizo/ui/components/tooltip';
import { TRANSACTION_COLUMN_LAYOUT_STORAGE_KEY } from '@/lib/prefs/transactionColumnLayout';
import {
  ensureTransactionColumnLayoutHydrated,
  useTransactionColumnLayoutStore,
} from '@/lib/prefs/transactionColumnLayoutStore';
import { ResetTransactionColumnsButton } from './ResetTransactionColumnsButton';

describe('ResetTransactionColumnsButton', () => {
  beforeEach(async () => {
    localStorage.removeItem(TRANSACTION_COLUMN_LAYOUT_STORAGE_KEY);
    await ensureTransactionColumnLayoutHydrated();
    useTransactionColumnLayoutStore.getState().reset();
  });

  it('stays hidden when the table is still on the default layout', () => {
    render(
      <TooltipProvider delay={0}>
        <ResetTransactionColumnsButton />
      </TooltipProvider>
    );
    expect(
      screen.queryByRole('button', { name: 'Reset columns' })
    ).not.toBeInTheDocument();
  });

  it('clears a customized sequence and widths', async () => {
    const user = userEvent.setup();
    useTransactionColumnLayoutStore.getState().setOrder(['amount', 'date']);
    useTransactionColumnLayoutStore.getState().setWidths({ date: 180 });
    render(
      <TooltipProvider delay={0}>
        <ResetTransactionColumnsButton />
      </TooltipProvider>
    );

    await user.click(screen.getByRole('button', { name: 'Reset columns' }));

    expect(
      screen.queryByRole('button', { name: 'Reset columns' })
    ).not.toBeInTheDocument();
    expect(
      localStorage.getItem(TRANSACTION_COLUMN_LAYOUT_STORAGE_KEY)
    ).toBeNull();
  });
});
