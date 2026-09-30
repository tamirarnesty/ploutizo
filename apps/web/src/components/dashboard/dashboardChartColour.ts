/** Dashboard charts draw the prior period in its current series' colour, faded to this share. */
export const PRIOR_OPACITY = 0.4;

/** The prior-period paint for a series colour; a plain CSS colour, so it works as an SVG fill and a tooltip dot. */
export const priorColour = (colour: string): string =>
  `color-mix(in oklab, ${colour} ${PRIOR_OPACITY * 100}%, transparent)`;
