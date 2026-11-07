import { describe, expect, it } from 'vitest';
import { installLinks, installMeta } from './install-document';
import {
  themeColorDark,
  themeColorLight,
  themeColorMetas,
} from './theme-color';

describe('install document head', () => {
  it('sets a standalone viewport and the Apple install tags', () => {
    expect(installMeta).toEqual(
      expect.arrayContaining([
        {
          name: 'viewport',
          content: 'width=device-width, initial-scale=1, viewport-fit=cover',
        },
        { name: 'apple-mobile-web-app-capable', content: 'yes' },
        {
          name: 'apple-mobile-web-app-status-bar-style',
          content: 'black-translucent',
        },
        { name: 'apple-mobile-web-app-title', content: 'Ploutizo' },
      ])
    );
  });

  it('links the manifest and the touch icon', () => {
    expect(installLinks).toEqual(
      expect.arrayContaining([
        { rel: 'manifest', href: '/manifest.json' },
        {
          rel: 'apple-touch-icon',
          href: '/pwa/apple-touch-icon.png',
          sizes: '180x180',
        },
      ])
    );
  });

  it('keeps a light and a dark theme-color, which one name would collapse', () => {
    expect(themeColorMetas.map((meta) => meta.name)).toEqual([
      'theme-color',
      'theme-color',
    ]);
    expect(themeColorMetas.map((meta) => meta.content)).toEqual([
      themeColorLight,
      themeColorDark,
    ]);
    expect(new Set(themeColorMetas.map((meta) => meta.media)).size).toBe(2);
  });
});
