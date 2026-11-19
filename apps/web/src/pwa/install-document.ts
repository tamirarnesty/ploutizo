import { PWA_APP_NAME, PWA_PUBLIC_ICON_DIR } from './pwa-brand';
import type { MetaDescriptor } from '@tanstack/react-router';

export const installMeta = [
  {
    name: 'viewport',
    content:
      'width=device-width, initial-scale=1, viewport-fit=cover, interactive-widget=resizes-content',
  },
  { name: 'mobile-web-app-capable', content: 'yes' },
  { name: 'apple-mobile-web-app-capable', content: 'yes' },
  {
    name: 'apple-mobile-web-app-status-bar-style',
    content: 'default',
  },
  { name: 'apple-mobile-web-app-title', content: PWA_APP_NAME },
] as const satisfies readonly MetaDescriptor[];

export const installLinks = [
  { rel: 'manifest', href: '/manifest.json' },
  {
    rel: 'icon',
    href: `${PWA_PUBLIC_ICON_DIR}/favicon-32.png`,
    type: 'image/png',
    sizes: '32x32',
  },
  {
    rel: 'apple-touch-icon',
    href: `${PWA_PUBLIC_ICON_DIR}/apple-touch-icon.png`,
    sizes: '180x180',
  },
] as const;
