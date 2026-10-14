import { describe, expect, it } from 'vitest';
import { fadedColour } from '@/components/dashboard/dashboardChartColour';

describe('fadedColour', () => {
  it('mixes the colour toward transparent in oklch at 40%', () => {
    expect(fadedColour('var(--color-blue-500)')).toBe(
      'color-mix(in oklch, var(--color-blue-500) 40%, transparent)'
    );
  });
});
