import { describe, expect, it } from 'vitest';
import { ICON_MAP } from '@/components/categories/LucideIconPicker';

describe('ICON_MAP', () => {
  it('includes every icon used by the default category seed', () => {
    const seedIcons = [
      'Receipt',
      'Tv',
      'Pizza',
      'UtensilsCrossed',
      'Coffee',
      'ShoppingCart',
      'Home',
      'HeartPulse',
      'ShoppingBag',
      'Repeat',
      'Bus',
      'Fuel',
      'Plane',
      'Gift',
      'Wrench',
      'MoreHorizontal',
      'CreditCard',
    ];

    expect(seedIcons.every((icon) => icon in ICON_MAP)).toBe(true);
  });
});
