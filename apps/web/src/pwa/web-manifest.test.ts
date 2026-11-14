import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const publicDir = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '../../public'
);

const manifest = JSON.parse(
  readFileSync(path.join(publicDir, 'manifest.json'), 'utf8')
) as {
  name: string;
  short_name: string;
  start_url: string;
  scope: string;
  display: string;
  background_color: string;
  theme_color: string;
  icons: { src: string; sizes: string; type: string; purpose: string }[];
};

const pngSize = (bytes: Buffer) => ({
  width: bytes.readUInt32BE(16),
  height: bytes.readUInt32BE(20),
});

describe('web manifest', () => {
  it('is the static install manifest', () => {
    expect(manifest).toMatchObject({
      name: 'Ploutizo',
      short_name: 'Ploutizo',
      start_url: '/',
      scope: '/',
      display: 'standalone',
      background_color: '#ffffff',
      theme_color: '#ffffff',
    });
    expect(manifest.icons.map((icon) => icon.purpose)).toEqual([
      'any',
      'any',
      'maskable',
      'maskable',
    ]);
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
