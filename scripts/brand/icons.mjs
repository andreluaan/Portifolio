// Draws the site's icons from the andreluaan.dev marks. Run after changing a mark: `node scripts/brand/icons.mjs`.
// The brand splits the favicon by size (manual p. 16): the memory mark in the 16 px browser tab, the reduced AL from
// 32 px up. Writes public/favicon.svg, public/favicon.ico (16, 32, 48) and public/apple-touch-icon.png (180).
import { readFile, writeFile } from 'node:fs/promises';
import sharp from 'sharp';
import { BRAND, memoryMarkSvg } from '../../src/lib/memory-mark.ts';

const root = new URL('../../', import.meta.url);
const file = (relative) => new URL(relative, root);

// The tab icon follows the browser's theme, so the sumi circle never disappears on a dark tab strip
const tabIcon = memoryMarkSvg({ darkInk: BRAND.inkOnDark, darkShu: BRAND.shuOnDark, wire: 3 });
await writeFile(file('public/favicon.svg'), `${tabIcon}\n`);

const reducedAl = await readFile(file('public/brand/al.svg'));
const png = (svg, size, padding = 0, background = null) =>
  sharp(svg, { density: 600 })
    .resize(size - padding * 2, size - padding * 2, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .extend({ top: padding, bottom: padding, left: padding, right: padding, background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .flatten(background ? { background } : false)
    .png()
    .toBuffer();

// An .ico may hold PNG images as they are: a 6-byte header, a 16-byte entry per image, then the images
const images = [await png(Buffer.from(memoryMarkSvg({ wire: 3 })), 16), await png(reducedAl, 32, 1), await png(reducedAl, 48, 2)];
const header = Buffer.alloc(6);
header.writeUInt16LE(1, 2);
header.writeUInt16LE(images.length, 4);
let offset = 6 + images.length * 16;
const entries = images.map((image, index) => {
  const size = [16, 32, 48][index];
  const entry = Buffer.alloc(16);
  entry.writeUInt8(size, 0);
  entry.writeUInt8(size, 1);
  entry.writeUInt16LE(1, 4);
  entry.writeUInt16LE(32, 6);
  entry.writeUInt32LE(image.length, 8);
  entry.writeUInt32LE(offset, 12);
  offset += image.length;
  return entry;
});
await writeFile(file('public/favicon.ico'), Buffer.concat([header, ...entries, ...images]));

// Home-screen icon: the reduced AL on brand paper (iOS fills transparency with black)
await writeFile(file('public/apple-touch-icon.png'), await png(reducedAl, 180, 26, BRAND.paper));
console.log('icons: favicon.svg, favicon.ico (16/32/48), apple-touch-icon.png (180)');
