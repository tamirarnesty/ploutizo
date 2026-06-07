import { expect } from 'vitest';

/** Selectors for overlay roots (`data-slot` on Dialog / Sheet / AlertDialog). */
export const OVERLAY_SLOTS = {
  dialog: '[data-slot="dialog"]',
  dialogContent: '[data-slot="dialog-content"]',
  sheet: '[data-slot="sheet"]',
  sheetContent: '[data-slot="sheet-content"]',
  alertDialog: '[data-slot="alert-dialog"]',
  alertDialogContent: '[data-slot="alert-dialog-content"]',
} as const;

export const queryOverlayRoot = (
  container: HTMLElement,
  slot: keyof typeof OVERLAY_SLOTS
): Element | null => container.querySelector(OVERLAY_SLOTS[slot]);

export const expectOverlayMounted = (
  container: HTMLElement,
  slot: keyof typeof OVERLAY_SLOTS
): void => {
  expect(queryOverlayRoot(container, slot)).not.toBeNull();
};

export const expectOverlayUnmounted = (
  container: HTMLElement,
  slot: keyof typeof OVERLAY_SLOTS
): void => {
  expect(queryOverlayRoot(container, slot)).toBeNull();
};
