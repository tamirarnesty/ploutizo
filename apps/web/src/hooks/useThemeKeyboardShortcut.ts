import { useEffect, useRef } from 'react';
import { useReversibleThemeToggle } from '@ploutizo/ui/hooks/use-reversible-theme-toggle';

const isEditableKeyboardTarget = (target: EventTarget | null) => {
  if (!(target instanceof Element)) return false;
  if (
    target instanceof HTMLElement &&
    (target.tagName === 'INPUT' ||
      target.tagName === 'TEXTAREA' ||
      target.tagName === 'SELECT' ||
      target.isContentEditable)
  ) {
    return true;
  }
  return (
    target.closest('[contenteditable]:not([contenteditable="false"])') !== null
  );
};

export const useThemeKeyboardShortcut = () => {
  const { mounted, toggleTheme } = useReversibleThemeToggle();

  // Store handler in ref so the effect registers once but always reads latest toggle
  // (advanced-event-handler-refs pattern — avoids re-registering on every theme change)
  const handlerRef = useRef<(e: KeyboardEvent) => void>(undefined);
  handlerRef.current = (e: KeyboardEvent) => {
    if (!mounted) return;
    if (e.key !== 'd') return;
    if (e.metaKey || e.ctrlKey || e.altKey || e.shiftKey) return;
    if (isEditableKeyboardTarget(e.target)) return;
    toggleTheme();
  };

  useEffect(() => {
    const handler = (e: KeyboardEvent) => handlerRef.current?.(e);
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []); // empty deps — registers once; latest toggle always available via ref
};
