import { describe, expect, it } from 'vitest';
import { keyboardOverlapPx } from './keyboard-overlap';

describe('keyboardOverlapPx', () => {
  it('ignores a full viewport and a short browser-chrome gap', () => {
    expect(keyboardOverlapPx(800, 800, 0)).toBe(0);
    expect(keyboardOverlapPx(800, 720, 0)).toBe(0);
  });

  it('reports the keyboard height when the visual viewport shrinks', () => {
    expect(keyboardOverlapPx(800, 470, 0)).toBe(330);
    expect(keyboardOverlapPx(800, 500, 20)).toBe(280);
  });

  it('ignores a shrunken visual viewport while the page is zoomed', () => {
    expect(keyboardOverlapPx(800, 400, 0, 2)).toBe(0);
  });
});
