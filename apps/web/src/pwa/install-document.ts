import type { MetaDescriptor } from '@tanstack/react-router';

export const installMeta = [
  {
    name: 'viewport',
    content: 'width=device-width, initial-scale=1, viewport-fit=cover',
  },
  { name: 'mobile-web-app-capable', content: 'yes' },
  { name: 'apple-mobile-web-app-capable', content: 'yes' },
  {
    name: 'apple-mobile-web-app-status-bar-style',
    content: 'black-translucent',
  },
  { name: 'apple-mobile-web-app-title', content: 'Ploutizo' },
] as const satisfies readonly MetaDescriptor[];

export const installLinks = [
  { rel: 'manifest', href: '/manifest.json' },
  {
    rel: 'icon',
    href: '/pwa/favicon-32.png',
    type: 'image/png',
    sizes: '32x32',
  },
  {
    rel: 'apple-touch-icon',
    href: '/pwa/apple-touch-icon.png',
    sizes: '180x180',
  },
] as const;
