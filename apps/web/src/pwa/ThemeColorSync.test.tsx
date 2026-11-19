import { render, waitFor } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { ThemeColorSync } from './ThemeColorSync';

const themeColorContents = () =>
  [...document.querySelectorAll('meta[name="theme-color"]')].map((meta) =>
    meta.getAttribute('content')
  );

describe('ThemeColorSync', () => {
  it('writes the sidebar color for the theme class onto every theme-color meta', async () => {
    document.head.innerHTML = [
      '<meta name="theme-color" content="#ffffff" media="(prefers-color-scheme: light)">',
      '<meta name="theme-color" content="#000000" media="(prefers-color-scheme: dark)">',
    ].join('');
    document.documentElement.className = 'dark';

    render(<ThemeColorSync />);

    expect(themeColorContents()).toEqual(['#1c1917', '#1c1917']);

    document.documentElement.className = 'light';

    await waitFor(() => {
      expect(themeColorContents()).toEqual(['#fafaf9', '#fafaf9']);
    });
  });
});
