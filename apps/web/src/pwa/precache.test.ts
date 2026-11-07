import { describe, expect, it } from 'vitest';
import { precacheGlobPatterns } from './precache';

describe('precacheGlobPatterns', () => {
  it('keeps hashed JS, CSS, and fonts only', () => {
    expect(precacheGlobPatterns).toEqual(['assets/**/*.{js,css,woff,woff2}']);
  });
});
