import { useEffect, useRef } from 'react';
import { useTheme } from '@ploutizo/ui/hooks/use-theme';

const cycleMap = { system: 'light', light: 'dark', dark: 'system' } as const;
type Theme = keyof typeof cycleMap;

export function useThemeKeyboardShortcut() {
  const { theme, setTheme } = useTheme();

  // Store handler in ref so the effect registers once but always reads latest theme
  // (advanced-event-handler-refs pattern — avoids re-registering on every theme change)
  const handlerRef = useRef<(e: KeyboardEvent) => void>(undefined);
  handlerRef.current = (e: KeyboardEvent) => {
    if (e.key !== 'd') return;
    if (e.metaKey || e.ctrlKey || e.altKey || e.shiftKey) return;
    const target = e.target as HTMLElement;
    if (
      target.tagName === 'INPUT' ||
      target.tagName === 'TEXTAREA' ||
      target.tagName === 'SELECT' ||
      target.isContentEditable
    )
      return;
    setTheme(cycleMap[(theme ?? 'system') as Theme]);
  };

  useEffect(() => {
    const handler = (e: KeyboardEvent) => handlerRef.current?.(e);
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []); // empty deps — registers once; latest theme always available via ref
}
