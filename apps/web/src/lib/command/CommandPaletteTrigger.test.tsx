import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { CommandPaletteTrigger } from './CommandPaletteTrigger';
import { CommandPaletteContextProvider } from './useCommandPalette';

describe('CommandPaletteTrigger', () => {
  it('opens the palette from an accessible Search control', async () => {
    const user = userEvent.setup();
    const setOpen = vi.fn();

    render(
      <CommandPaletteContextProvider value={{ open: false, setOpen }}>
        <CommandPaletteTrigger />
      </CommandPaletteContextProvider>
    );

    const trigger = screen.getByRole('button', {
      name: 'Open command palette',
    });
    expect(trigger).toHaveTextContent('Search');

    await user.click(trigger);
    expect(setOpen).toHaveBeenCalledWith(true);
  });
});
