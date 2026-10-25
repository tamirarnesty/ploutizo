import { describe, expect, it } from 'vitest';
import { colourTokenSchema } from './colour-tokens';

describe('colourTokenSchema', () => {
  it('rejects hex values, unknown shades and unknown hues', () => {
    expect(colourTokenSchema.safeParse('#f00').success).toBe(false);
    expect(colourTokenSchema.safeParse('red-800').success).toBe(false);
    expect(colourTokenSchema.safeParse('gray-500').success).toBe(false);
  });
});
