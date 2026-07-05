import { useState } from 'react';

import { CommandPalette } from '@/lib/command/CommandPalette';
import { CommandPaletteContextProvider } from '@/lib/command/useCommandPalette';
import { useCommandPaletteShortcut } from '@/lib/command/useCommandPaletteShortcut';

import type { ReactNode } from 'react';

export const CommandPaletteProvider = ({
  children,
}: {
  children: ReactNode;
}) => {
  const [open, setOpen] = useState(false);

  useCommandPaletteShortcut(setOpen);

  return (
    <CommandPaletteContextProvider value={{ open, setOpen }}>
      {children}
      <CommandPalette />
    </CommandPaletteContextProvider>
  );
};
