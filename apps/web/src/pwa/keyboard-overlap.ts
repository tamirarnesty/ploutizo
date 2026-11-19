/** Browser chrome is shorter than this; a keyboard is taller. */
const KEYBOARD_OVERLAP_THRESHOLD_PX = 120;

/**
 * How far the visual viewport stops short of the layout viewport.
 * Zero unless the gap is large enough to be an on-screen keyboard.
 */
export const keyboardOverlapPx = (
  layoutHeight: number,
  visualHeight: number,
  visualOffsetTop: number
) => {
  const overlap = layoutHeight - visualOffsetTop - visualHeight;
  if (!Number.isFinite(overlap) || overlap <= KEYBOARD_OVERLAP_THRESHOLD_PX) {
    return 0;
  }
  return Math.round(overlap);
};
