/**
 * Category colour palette — Tailwind palette hues × shades, stored as `${hue}-${shade}`
 * token ids (e.g. "green-500"). Rendered in the web app via `var(--color-<token>)`.
 *
 * Chromatic hues come first and slate last, so default ordering reaches the neutral
 * slate only after every chromatic hue.
 */
export const COLOUR_HUE_VALUES = [
  'red',
  'orange',
  'amber',
  'yellow',
  'lime',
  'green',
  'emerald',
  'teal',
  'cyan',
  'sky',
  'blue',
  'indigo',
  'violet',
  'purple',
  'fuchsia',
  'pink',
  'rose',
  'slate',
] as const;

export type ColourHue = (typeof COLOUR_HUE_VALUES)[number];

export const COLOUR_SHADE_VALUES = ['300', '400', '500', '600', '700'] as const;

export type ColourShade = (typeof COLOUR_SHADE_VALUES)[number];

export type ColourToken = `${ColourHue}-${ColourShade}`;

export type ColourSwatch = {
  token: ColourToken;
  hue: ColourHue;
  shade: ColourShade;
  /** Display name, e.g. "Red 500". */
  name: string;
};

const capitalize = (value: string) =>
  value.charAt(0).toUpperCase() + value.slice(1);

/** Every swatch, grouped by hue (palette order) then shade (light to dark). */
export const COLOUR_SWATCHES: readonly ColourSwatch[] =
  COLOUR_HUE_VALUES.flatMap((hue) =>
    COLOUR_SHADE_VALUES.map((shade) => ({
      token: `${hue}-${shade}` as const,
      hue,
      shade,
      name: `${capitalize(hue)} ${shade}`,
    }))
  );

export const COLOUR_TOKENS: readonly ColourToken[] = COLOUR_SWATCHES.map(
  (swatch) => swatch.token
);

/** Keep the `categories` colour CHECK constraint in sync with `COLOUR_TOKENS`. */
export const categoryColourCheckSql = () =>
  `colour in (${COLOUR_TOKENS.map((token) => `'${token}'`).join(', ')})`;

/** Shade tiers tried in order when picking a default colour for a new category. */
const DEFAULT_SHADE_ORDER = [
  '500',
  '400',
  '600',
  '300',
  '700',
] as const satisfies readonly ColourShade[];

/**
 * Default colour ordering for new categories: every hue at 500, then 400, 600, 300, 700.
 * `packages/db/drizzle/0012_required_category_colour.sql` backfills with the same ordering.
 */
export const DEFAULT_CATEGORY_COLOUR_ORDER: readonly ColourToken[] =
  DEFAULT_SHADE_ORDER.flatMap((shade) =>
    COLOUR_HUE_VALUES.map((hue) => `${hue}-${shade}` as const)
  );

/**
 * First default-ordered colour not in `used`. Once every colour is used, cycles through the
 * default ordering by how many colours are in use.
 */
export const nextCategoryColour = (
  used: readonly ColourToken[]
): ColourToken => {
  const usedSet = new Set(used);
  return (
    DEFAULT_CATEGORY_COLOUR_ORDER.find((token) => !usedSet.has(token)) ??
    DEFAULT_CATEGORY_COLOUR_ORDER[
      used.length % DEFAULT_CATEGORY_COLOUR_ORDER.length
    ]
  );
};
