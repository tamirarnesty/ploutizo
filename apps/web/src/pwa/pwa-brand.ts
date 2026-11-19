export const PWA_APP_NAME = 'Ploutizo';

/** Light `--background`; manifest uses one neutral color for first paint. */
export const PWA_BACKGROUND_COLOR = '#ffffff';

/** Maskable icon padding matches `--primary` (`#0069a8`). */
export const PWA_MASKABLE_BACKGROUND = {
  r: 0,
  g: 105,
  b: 168,
  alpha: 1,
} as const;

export const PWA_PUBLIC_ICON_DIR = '/pwa';

/** Manifest shortcut that opens the transactions page into the create sheet. */
export const NEW_TRANSACTION_SHORTCUT = {
  name: 'New transaction',
  description: 'Add a transaction',
  url: '/transactions?create=true',
} as const;

export const PWA_MANIFEST_ICON_SPECS = [
  {
    file: 'icon-192.png',
    sizes: '192x192',
    purpose: 'any' as const,
  },
  {
    file: 'icon-512.png',
    sizes: '512x512',
    purpose: 'any' as const,
  },
  {
    file: 'icon-maskable-192.png',
    sizes: '192x192',
    purpose: 'maskable' as const,
  },
  {
    file: 'icon-maskable-512.png',
    sizes: '512x512',
    purpose: 'maskable' as const,
  },
] as const;

export const PWA_MANIFEST = {
  name: PWA_APP_NAME,
  short_name: PWA_APP_NAME,
  start_url: '/',
  scope: '/',
  display: 'standalone',
  background_color: PWA_BACKGROUND_COLOR,
  theme_color: PWA_BACKGROUND_COLOR,
  icons: PWA_MANIFEST_ICON_SPECS.map((icon) => ({
    src: `${PWA_PUBLIC_ICON_DIR}/${icon.file}`,
    sizes: icon.sizes,
    type: 'image/png',
    purpose: icon.purpose,
  })),
  shortcuts: [
    {
      ...NEW_TRANSACTION_SHORTCUT,
      icons: PWA_MANIFEST_ICON_SPECS.filter(
        (icon) => icon.purpose === 'any'
      ).map((icon) => ({
        src: `${PWA_PUBLIC_ICON_DIR}/${icon.file}`,
        sizes: icon.sizes,
        type: 'image/png' as const,
      })),
    },
  ],
} as const;
