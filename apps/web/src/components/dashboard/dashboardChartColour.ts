/**
 * One fade for every de-emphasised mark on dashboard charts (prior period, in-progress buckets);
 * the stroke pattern or hatch says which it is.
 */
export const FADED_OPACITY = 0.4;

/** A series colour faded to `FADED_OPACITY`; a plain CSS colour, so it works as an SVG fill and a tooltip dot. */
export const fadedColour = (colour: string): string =>
  `color-mix(in oklch, ${colour} ${FADED_OPACITY * 100}%, transparent)`;
