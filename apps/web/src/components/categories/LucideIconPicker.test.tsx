import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { cloneElement, createContext, isValidElement, useContext } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { LucideIconPicker } from '@/components/categories/LucideIconPicker';
import type { ReactElement, ReactNode } from 'react';

const PopoverContext = createContext<{
  open: boolean;
  setOpen: (open: boolean) => void;
} | null>(null);

vi.mock('@ploutizo/ui/components/popover', () => ({
  Popover: ({
    open,
    onOpenChange,
    children,
  }: {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    children: ReactNode;
  }) => (
    <PopoverContext.Provider
      value={{ open, setOpen: (nextOpen) => onOpenChange(nextOpen) }}
    >
      <div data-open={open}>{children}</div>
    </PopoverContext.Provider>
  ),
  PopoverTrigger: ({
    render: trigger,
    children,
  }: {
    render?: ReactElement;
    children?: ReactNode;
  }) => {
    const popover = useContext(PopoverContext);

    if (trigger && isValidElement<{ onClick?: () => void }>(trigger)) {
      return cloneElement(trigger, {
        onClick: () => popover?.setOpen(true),
      });
    }

    return <div onClick={() => popover?.setOpen(true)}>{children}</div>;
  },
  PopoverContent: ({ children }: { children: ReactNode }) => (
    <div>{children}</div>
  ),
}));

describe('LucideIconPicker', () => {
  it('searches the full Lucide catalog for icons outside the old whitelist', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();

    render(<LucideIconPicker value={null} onChange={onChange} />);

    await user.click(screen.getByRole('button'));

    const search = screen.getByPlaceholderText('Search icons…');
    await user.type(search, 'anchor');

    const anchorOption = await waitFor(() =>
      screen.getByRole('option', { name: 'Anchor' })
    );
    await user.click(anchorOption);

    expect(onChange).toHaveBeenCalledWith('Anchor');
  });

  it('virtualizes the full catalog instead of mounting every icon at once', async () => {
    const user = userEvent.setup();

    render(<LucideIconPicker value={null} onChange={vi.fn()} />);

    await user.click(screen.getByRole('button'));

    await waitFor(() => {
      expect(screen.getAllByRole('option').length).toBeLessThan(100);
    });
  });
});
