import { describe, expect, it } from 'vitest';
import {
  FADED_OPACITY,
  fadedColour,
} from '@/components/dashboard/dashboardChartColour';

describe('fadedColour', () => {
  it('mixes the colour with transparent in oklch at the dashboard fade opacity', () => {
    expect(fadedColour('var(--color-blue-500)')).toBe(
      `color-mix(in oklch, var(--color-blue-500) ${FADED_OPACITY * 100}%, transparent)`
    );
  });
});
