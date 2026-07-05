import { useEffect, useRef } from 'react';

export const useCommandPaletteShortcut = (setOpen: (open: boolean) => void) => {
  const setOpenRef = useRef(setOpen);
  setOpenRef.current = setOpen;

  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if (event.key.toLowerCase() !== 'k') return;
      if (!event.metaKey && !event.ctrlKey) return;

      const target = event.target as HTMLElement;
      if (
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.tagName === 'SELECT' ||
        target.isContentEditable
      ) {
        return;
      }

      event.preventDefault();
      setOpenRef.current(true);
    };

    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);
};
