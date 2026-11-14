import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';

const webRoot = path.resolve(import.meta.dirname, '..');
const sourcePath = path.join(webRoot, 'src/pwa/logo.svg');
const outDir = path.join(webRoot, 'public/pwa');
const background = { r: 0, g: 105, b: 168, alpha: 1 };

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

const writeIco = async (png: Buffer) => {
  const header = Buffer.alloc(22);
  header.writeUInt16LE(0, 0);
  header.writeUInt16LE(1, 2);
  header.writeUInt16LE(1, 4);
  header.writeUInt8(32, 6);
  header.writeUInt8(32, 7);
  header.writeUInt16LE(1, 10);
  header.writeUInt16LE(32, 12);
  header.writeUInt32LE(png.length, 14);
  header.writeUInt32LE(22, 18);
  await writeFile(
    path.join(webRoot, 'public/favicon.ico'),
    Buffer.concat([header, png])
  );
};

const main = async () => {
  await mkdir(outDir, { recursive: true });
  await writePng('icon-192.png', 192, 1);
  await writePng('icon-512.png', 512, 1);
  await writePng('icon-maskable-192.png', 192, 0.8);
  await writePng('icon-maskable-512.png', 512, 0.8);
  await writePng('apple-touch-icon.png', 180, 1);
  const favicon = await writePng('favicon-32.png', 32, 1);
  await writeIco(favicon);
};

await main();
