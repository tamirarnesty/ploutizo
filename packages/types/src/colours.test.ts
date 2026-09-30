import { describe, expect, it } from 'vitest';
import { HOUSEHOLD_DEFAULT_CATEGORIES } from './categories';
import {
  COLOUR_TOKENS,
  DEFAULT_CATEGORY_COLOUR_ORDER,
  nextCategoryColour,
} from './colours';

describe('colour palette', () => {
  it('offers 18 hues at five shades each', () => {
    expect(COLOUR_TOKENS).toHaveLength(90);
    expect(COLOUR_TOKENS).toContain('fuchsia-300');
    expect(COLOUR_TOKENS).toContain('slate-700');
  });

  it('orders defaults by shade tier, chromatic hues before slate', () => {
    expect([...DEFAULT_CATEGORY_COLOUR_ORDER].sort()).toEqual(
      [...COLOUR_TOKENS].sort()
    );
    expect(DEFAULT_CATEGORY_COLOUR_ORDER.slice(0, 2)).toEqual([
      'red-500',
      'orange-500',
    ]);
    expect(DEFAULT_CATEGORY_COLOUR_ORDER[17]).toBe('slate-500');
    expect(DEFAULT_CATEGORY_COLOUR_ORDER[18]).toBe('red-400');
    expect(DEFAULT_CATEGORY_COLOUR_ORDER.at(-1)).toBe('slate-700');
  });
});

describe('nextCategoryColour', () => {
  it('starts with the first default colour', () => {
    expect(nextCategoryColour([])).toBe('red-500');
  });

  it('skips colours already in use', () => {
    expect(nextCategoryColour(['red-500', 'amber-500'])).toBe('orange-500');
  });

  it('moves to the next shade tier once every 500 is used', () => {
    const all500s = DEFAULT_CATEGORY_COLOUR_ORDER.slice(0, 18);
    expect(nextCategoryColour(all500s)).toBe('red-400');
  });

  it('cycles through the default ordering once every colour is used', () => {
    expect(nextCategoryColour(DEFAULT_CATEGORY_COLOUR_ORDER)).toBe('red-500');
    expect(
      nextCategoryColour([...DEFAULT_CATEGORY_COLOUR_ORDER, 'red-500'])
    ).toBe('orange-500');
  });
});

describe('household default categories', () => {
  it('gives every default a distinct colour', () => {
    const colours = HOUSEHOLD_DEFAULT_CATEGORIES.map(
      (category) => category.colour
    );
    expect(new Set(colours).size).toBe(colours.length);
  });
});
