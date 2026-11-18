import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import toIco from 'to-ico';
import sharp from 'sharp';
import { PWA_MANIFEST, PWA_MASKABLE_BACKGROUND } from '../src/pwa/pwa-brand.ts';

const webRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '..'
);
const sourcePath = path.join(webRoot, 'src/pwa/logo.svg');
const outDir = path.join(webRoot, 'public/pwa');
const background = PWA_MASKABLE_BACKGROUND;

const raster = async (size: number, scale: number) => {
  const svg = await readFile(sourcePath);
  const inner = Math.round(size * scale);
  const rendered = await sharp(svg).resize(inner, inner).png().toBuffer();
  if (scale === 1) return rendered;

  return sharp({
    create: {
      width: size,
      height: size,
      channels: 4,
      background,
    },
  })
    .composite([{ input: rendered, gravity: 'centre' }])
    .png()
    .toBuffer();
};

const writePng = async (name: string, size: number, scale: number) => {
  const png = await raster(size, scale);
  await writeFile(path.join(outDir, name), png);
  return png;
};

const main = async () => {
  await mkdir(outDir, { recursive: true });
  await writePng('icon-192.png', 192, 1);
  await writePng('icon-512.png', 512, 1);
  await writePng('icon-maskable-192.png', 192, 0.8);
  await writePng('icon-maskable-512.png', 512, 0.8);
  await writePng('apple-touch-icon.png', 180, 1);
  const favicon = await writePng('favicon-32.png', 32, 1);
  await writeFile(
    path.join(webRoot, 'public/favicon.ico'),
    await toIco([favicon])
  );
  await writeFile(
    path.join(webRoot, 'public/manifest.json'),
    `${JSON.stringify(PWA_MANIFEST, null, 2)}\n`
  );
};

await main();
