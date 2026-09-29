import { COLOUR_TOKENS, parseColourToken } from '@ploutizo/validators';
import type { ColourToken } from '@ploutizo/validators';

/** Neutral bar colour for the aggregated Other bucket. */
export const OTHER_CATEGORY_COLOUR: ColourToken = 'slate-500';

const stableCategoryColour = (categoryId: string): ColourToken => {
  let hash = 0;
  for (let i = 0; i < categoryId.length; i++) {
    hash = (hash * 31 + categoryId.charCodeAt(i)) >>> 0;
  }
  return COLOUR_TOKENS[hash % COLOUR_TOKENS.length];
};

export const resolveCategoryColour = (
  configured: string | null | undefined,
  categoryId: string
): ColourToken =>
  parseColourToken(configured) ?? stableCategoryColour(categoryId);
