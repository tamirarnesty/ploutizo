import { useHotkey } from '@tanstack/react-hotkeys';
import { useReversibleThemeToggle } from '@ploutizo/ui/hooks/use-reversible-theme-toggle';

export const THEME_HOTKEY = 'D';

export const useThemeKeyboardShortcut = () => {
  const { mounted, toggleTheme } = useReversibleThemeToggle();

  useHotkey(
    THEME_HOTKEY,
    () => {
      toggleTheme();
    },
    {
      enabled: mounted,
      ignoreInputs: true,
      meta: { name: 'Toggle theme' },
    }
  );
};
