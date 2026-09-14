import { HOUSEHOLD_DEFAULT_CATEGORY_ICONS } from '@ploutizo/types';
import { describe, expect, it } from 'vitest';
import { ICON_MAP } from '@/components/categories/LucideIconPicker';

describe('ICON_MAP', () => {
  it('includes every icon used by the default category seed', () => {
    const seedIcons = HOUSEHOLD_DEFAULT_CATEGORY_ICONS;

    expect(seedIcons.filter((icon) => !(icon in ICON_MAP))).toEqual([]);
  });
});
