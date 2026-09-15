import { useHotkey } from '@tanstack/react-hotkeys';

export const COMMAND_PALETTE_HOTKEY = 'Mod+K';

export const useCommandPaletteShortcut = (onToggle: () => void) => {
  useHotkey(COMMAND_PALETTE_HOTKEY, onToggle, {
    meta: { name: 'Toggle command palette' },
  });
};
