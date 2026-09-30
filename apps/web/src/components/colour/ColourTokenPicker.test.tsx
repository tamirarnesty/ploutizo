import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { cloneElement, createContext, isValidElement, useContext } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { ColourTokenPicker } from '@/components/colour/ColourTokenPicker';
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
        children,
      } as { onClick: () => void });
    }

    return <div onClick={() => popover?.setOpen(true)}>{children}</div>;
  },
  PopoverContent: ({ children }: { children: ReactNode }) => (
    <div>{children}</div>
  ),
}));

const optionNames = () =>
  screen
    .getAllByRole('option')
    .map((option) => option.getAttribute('aria-label'));

describe('ColourTokenPicker', () => {
  it('shows the selected colour on the trigger', () => {
    render(<ColourTokenPicker value="teal-600" onChange={vi.fn()} />);

    expect(
      screen.getByRole('button', { name: 'Category colour: Teal 600' })
    ).toBeInTheDocument();
  });

  it('offers every hue at five shades', async () => {
    const user = userEvent.setup();
    render(<ColourTokenPicker value="red-500" onChange={vi.fn()} />);

    await user.click(screen.getByRole('button'));

    expect(screen.getAllByRole('option')).toHaveLength(90);
    expect(
      screen.getByRole('option', { name: 'Red 500', selected: true })
    ).toBeInTheDocument();
  });

  it('narrows to one hue when searching by hue name', async () => {
    const user = userEvent.setup();
    render(<ColourTokenPicker value="red-500" onChange={vi.fn()} />);

    await user.click(screen.getByRole('button'));
    await user.type(screen.getByPlaceholderText('Search colours…'), 'fuchsia');

    expect(optionNames()).toEqual([
      'Fuchsia 300',
      'Fuchsia 400',
      'Fuchsia 500',
      'Fuchsia 600',
      'Fuchsia 700',
    ]);
  });

  it('narrows to a single swatch when searching by hue and shade', async () => {
    const user = userEvent.setup();
    render(<ColourTokenPicker value="red-500" onChange={vi.fn()} />);

    await user.click(screen.getByRole('button'));
    await user.type(screen.getByPlaceholderText('Search colours…'), 'sky 300');

    expect(optionNames()).toEqual(['Sky 300']);
  });

  it('calls onChange with the clicked swatch token and closes', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<ColourTokenPicker value="red-500" onChange={onChange} />);

    await user.click(screen.getByRole('button'));
    await user.type(screen.getByPlaceholderText('Search colours…'), 'fuchsia');
    await user.click(screen.getByRole('option', { name: 'Fuchsia 700' }));

    expect(onChange).toHaveBeenCalledWith('fuchsia-700');
    expect(
      screen.getByRole('button', { name: /^Category colour/ })
    ).toHaveAttribute('aria-expanded', 'false');
  });
});
