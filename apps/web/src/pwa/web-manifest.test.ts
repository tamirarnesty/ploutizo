import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { installLinks } from './install-document';
import { PWA_APP_NAME, PWA_MANIFEST } from './pwa-brand';

const publicDir = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '../../public'
);

const manifest = JSON.parse(
  readFileSync(path.join(publicDir, 'manifest.json'), 'utf8')
) as typeof PWA_MANIFEST;

const pngSize = (bytes: Buffer) => ({
  width: bytes.readUInt32BE(16),
  height: bytes.readUInt32BE(20),
});

describe('web manifest', () => {
  it('matches the typed install manifest source', () => {
    expect(manifest).toEqual(PWA_MANIFEST);
  });

  it('aligns head tags with the committed manifest', () => {
    expect(manifest.name).toBe(PWA_APP_NAME);
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

  it('ships png icons at the sizes the manifest declares', () => {
    for (const icon of manifest.icons) {
      const [width, height] = icon.sizes.split('x').map(Number);
      const bytes = readFileSync(path.join(publicDir, icon.src.slice(1)));
      expect(bytes.subarray(0, 8)).toEqual(
        Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])
      );
      expect(pngSize(bytes)).toEqual({ width, height });
    }
  });
});
