import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { useState } from 'react';
import { fireModKey } from '@/test/keyboard';
import { useCommandPaletteShortcut } from './useCommandPaletteShortcut';

const ShortcutHarness = () => {
  const [open, setOpen] = useState(false);
  useCommandPaletteShortcut(() => {
    setOpen((current) => !current);
  });
  return <div>{open ? 'open' : 'closed'}</div>;
};

describe('useCommandPaletteShortcut', () => {
  it('opens the palette from the keyboard shortcut', () => {
    render(<ShortcutHarness />);

    fireModKey('k');

    expect(screen.getByText('open')).toBeInTheDocument();
  });

  it('opens the palette while typing in an input', () => {
    render(
      <>
        <ShortcutHarness />
        <input aria-label="Note" />
      </>
    );

    const field = screen.getByLabelText('Note');
    field.focus();
    fireModKey('k', field);

    expect(screen.getByText('open')).toBeInTheDocument();
  });

  it('closes the palette on a second shortcut, including from an input', () => {
    render(
      <>
        <ShortcutHarness />
        <input aria-label="Search" />
      </>
    );

    fireModKey('k');
    expect(screen.getByText('open')).toBeInTheDocument();

    const field = screen.getByLabelText('Search');
    field.focus();
    fireModKey('k', field);

    expect(screen.getByText('closed')).toBeInTheDocument();
  });
});
