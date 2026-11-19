import { useEffect } from 'react';
import { keyboardOverlapPx } from './keyboard-overlap';

const OVERLAY_SELECTOR = [
  '[data-slot="sheet-content"]',
  '[data-slot="dialog-content"]',
  '[data-slot="alert-dialog-content"]',
  '[data-app-shell] main',
].join(', ');

const applyKeyboardOverlap = () => {
  const viewport = window.visualViewport;
  const overlap = viewport
    ? keyboardOverlapPx(window.innerHeight, viewport.height, viewport.offsetTop)
    : 0;
  document.documentElement.style.setProperty(
    '--keyboard-overlap',
    `${overlap}px`
  );
};

export const KeyboardOverlap = () => {
  useEffect(() => {
    const viewport = window.visualViewport;
    applyKeyboardOverlap();
    viewport?.addEventListener('resize', applyKeyboardOverlap);
    viewport?.addEventListener('scroll', applyKeyboardOverlap);
    window.addEventListener('resize', applyKeyboardOverlap);

    const onFocusIn = (event: FocusEvent) => {
      const target = event.target;
      if (!(target instanceof HTMLElement)) return;
      if (!target.closest(OVERLAY_SELECTOR)) return;
      window.setTimeout(() => {
        target.scrollIntoView({ block: 'nearest' });
      }, 150);
    };
    document.addEventListener('focusin', onFocusIn);

    return () => {
      viewport?.removeEventListener('resize', applyKeyboardOverlap);
      viewport?.removeEventListener('scroll', applyKeyboardOverlap);
      window.removeEventListener('resize', applyKeyboardOverlap);
      document.removeEventListener('focusin', onFocusIn);
      document.documentElement.style.removeProperty('--keyboard-overlap');
    };
  }, []);

  return null;
};
