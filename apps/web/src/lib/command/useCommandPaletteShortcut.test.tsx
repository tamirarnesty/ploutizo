import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { useState } from 'react';
import { useCommandPaletteShortcut } from './useCommandPaletteShortcut';

const ShortcutHarness = () => {
  const [open, setOpen] = useState(false);
  useCommandPaletteShortcut(setOpen);
  return <div>{open ? 'open' : 'closed'}</div>;
};

describe('useCommandPaletteShortcut', () => {
  it('opens the palette from the keyboard shortcut', () => {
    render(<ShortcutHarness />);

    fireEvent.keyDown(document.body, { key: 'k', metaKey: true });

    expect(screen.getByText('open')).toBeInTheDocument();
  });
});
