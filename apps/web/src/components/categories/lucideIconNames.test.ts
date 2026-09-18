import { HOUSEHOLD_DEFAULT_CATEGORY_ICONS } from '@ploutizo/types';
import { describe, expect, it } from 'vitest';
import {
  filterLucideKebabIconNames,
  isKnownLucideIcon,
  kebabToPascal,
  pascalToKebab,
} from '@/components/categories/lucideIconNames';

describe('lucideIconNames', () => {
  it('converts stored PascalCase seed icons to known Lucide kebab names', () => {
    const unknownSeedIcons = HOUSEHOLD_DEFAULT_CATEGORY_ICONS.filter(
      (icon) => !isKnownLucideIcon(icon)
    );

    expect(unknownSeedIcons).toEqual([]);
  });

  it('round-trips common Lucide naming patterns', () => {
    expect(pascalToKebab('ShoppingCart')).toBe('shopping-cart');
    expect(pascalToKebab('Gamepad2')).toBe('gamepad-2');
    expect(kebabToPascal('shopping-cart')).toBe('ShoppingCart');
    expect(kebabToPascal('gamepad-2')).toBe('Gamepad2');
  });

  it('finds icons outside the old curated picker whitelist', () => {
    expect(filterLucideKebabIconNames('anchor')).toContain('anchor');
    expect(isKnownLucideIcon('Anchor')).toBe(true);
  });
});
