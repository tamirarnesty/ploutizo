import { expect } from 'vitest';

/**
 * Base UI renders overlay popups through a portal into `document.body`, so
 * queries are document-scoped rather than limited to the render container.
 * The popup stays mounted while the exit transition runs (`data-closed` /
 * `data-ending-style`) and unmounts once it finishes — in jsdom that is a
 * timeout fallback, not a real CSS transition.
 */
export const OVERLAY_CONTENT_SLOTS = {
  dialog: '[data-slot="dialog-content"]',
  sheet: '[data-slot="sheet-content"]',
  alertDialog: '[data-slot="alert-dialog-content"]',
} as const;

export type OverlaySlot = keyof typeof OVERLAY_CONTENT_SLOTS;

export const queryOverlayContent = (slot: OverlaySlot): Element | null =>
  document.querySelector(OVERLAY_CONTENT_SLOTS[slot]);

export const expectOverlayMounted = (slot: OverlaySlot): void => {
  expect(queryOverlayContent(slot)).not.toBeNull();
};

export const expectOverlayUnmounted = (slot: OverlaySlot): void => {
  expect(queryOverlayContent(slot)).toBeNull();
};
