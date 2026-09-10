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

  it('uses collapsed-sidebar styling hooks for icon-only mode', () => {
    const setOpen = vi.fn();

    render(
      <CommandPaletteContextProvider value={{ open: false, setOpen }}>
        <div className="group" data-collapsible="icon">
          <CommandPaletteTrigger />
        </div>
      </CommandPaletteContextProvider>
    );

    const trigger = screen.getByRole('button', {
      name: 'Open command palette',
    });
    expect(trigger.className).toContain('group-data-[collapsible=icon]:size-8');
    expect(screen.getByText('Search').className).toContain(
      'group-data-[collapsible=icon]:hidden'
    );
  });
});
