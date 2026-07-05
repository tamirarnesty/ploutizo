import { createContext, useContext } from 'react';

type CommandPaletteContextValue = {
  open: boolean;
  setOpen: (open: boolean) => void;
};

const CommandPaletteContext = createContext<CommandPaletteContextValue | null>(
  null
);

export const CommandPaletteContextProvider = CommandPaletteContext.Provider;

export const useCommandPalette = () => {
  const context = useContext(CommandPaletteContext);
  if (!context) {
    throw new Error(
      'useCommandPalette must be used within CommandPaletteProvider.'
    );
  }

  return context;
};
