import { useMemo, useState } from 'react';

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
  const contextValue = useMemo(() => ({ open, setOpen }), [open]);

  useCommandPaletteShortcut(setOpen);

  return (
    <CommandPaletteContextProvider value={contextValue}>
      {children}
      <CommandPalette />
    </CommandPaletteContextProvider>
  );
};
