import { themeColorLight } from './theme-color';

export const webManifest = {
  name: 'Ploutizo',
  short_name: 'Ploutizo',
  start_url: '/',
  scope: '/',
  display: 'standalone',
  background_color: themeColorLight,
  theme_color: themeColorLight,
  icons: [
    {
      src: '/pwa/icon-192.png',
      sizes: '192x192',
      type: 'image/png',
      purpose: 'any',
    },
    {
      src: '/pwa/icon-512.png',
      sizes: '512x512',
      type: 'image/png',
      purpose: 'any',
    },
    {
      src: '/pwa/icon-maskable-192.png',
      sizes: '192x192',
      type: 'image/png',
      purpose: 'maskable',
    },
    {
      src: '/pwa/icon-maskable-512.png',
      sizes: '512x512',
      type: 'image/png',
      purpose: 'maskable',
    },
  ],
} as const;
