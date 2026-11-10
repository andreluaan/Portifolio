// Paints the world's ink once, at build time. `npm run ink` redraws everything into public/ink/ and writes the world's
// map to src/data/world.json; `--check` (run by `npm run build`) only verifies the paintings match their sources, so
// a build never needs Chrome. Drawings are rendered by the installed Google Chrome through playwright-core.
import { createHash } from 'node:crypto';
import { mkdir, readFile, rm, writeFile, mkdtemp } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = new URL('../../', import.meta.url);
const path = (relative) => new URL(relative, ROOT);
const OUTPUT = path('public/ink/');
const MAP = path('src/data/world.json');
/** Every file whose change can change a drawing or the map. */
const SOURCES = [
  'scripts/ink-bake/page.ts',
  'src/world/layout.ts',
  'src/lib/brush.ts',
  'src/lib/floor.ts',
  'src/lib/scenes.ts',
  'src/lib/random.ts',
  'src/data/content.ts',
];

async function inputsHash() {
  const hash = createHash('sha256');
  for (const source of SOURCES) hash.update((await readFile(path(source), 'utf8')).replace(/\r\n/g, '\n'));
  return hash.digest('hex').slice(0, 16);
}

async function check() {
  const expected = await inputsHash();
  let current = null;
  try {
    current = JSON.parse(await readFile(MAP, 'utf8')).inputs;
  } catch {}
  if (current === expected) return console.log(`ink: paintings are up to date (${expected})`);
  console.error(`ink: the drawings are stale (${current ?? 'none'} → ${expected}). Run \`npm run ink\` and commit public/ink and src/data/world.json.`);
  process.exit(1);
}

async function bundlePage() {
  const { build } = await import('vite');
  const outDir = await mkdtemp(join(tmpdir(), 'ink-bake-'));
  await build({
    configFile: false,
    logLevel: 'warn',
    root: fileURLToPath(ROOT),
    build: {
      outDir,
      emptyOutDir: true,
      minify: false,
      lib: { entry: fileURLToPath(path('scripts/ink-bake/page.ts')), formats: ['iife'], name: 'InkBake', fileName: () => 'page.js' },
    },
  });
  const script = await readFile(join(outDir, 'page.js'), 'utf8');
  await rm(outDir, { recursive: true, force: true });
  return script;
}

async function bake() {
  const started = performance.now();
  const [{ chromium }, sharp, script, inputs] = await Promise.all([import('playwright-core'), import('sharp').then((m) => m.default), bundlePage(), inputsHash()]);
  const browser = await chromium.launch({ channel: 'chrome' });
  const page = await browser.newPage();
  page.on('pageerror', (error) => console.error('page error:', error.message));
  await page.setContent('<!doctype html><html><body></body></html>');
  await page.addScriptTag({ content: script });
  const result = await page.evaluate(() => window.bakeAll());
  await browser.close();

  await rm(OUTPUT, { recursive: true, force: true });
  await mkdir(OUTPUT, { recursive: true });
  let bytes = 0;
  for (const item of result.baked) {
    const file = `${item.name}@${item.scale}x${item.frame > 1 ? `-f${item.frame}` : ''}.webp`;
    const png = Buffer.from(item.png.split(',')[1], 'base64');
    // The long scenery strips are mostly soft wash: they hold up at a lower quality, and they are most of the bytes
    const scenery = /^(floor|front)-/.test(item.name);
    const webp = await sharp(png).webp({ quality: scenery ? 70 : 82, alphaQuality: scenery ? 70 : 90, effort: 6 }).toBuffer();
    bytes += webp.length;
    await writeFile(new URL(file, OUTPUT), webp);
  }

  const ink = Object.fromEntries(result.drawings.map(({ name, box, scales, frames }) => [name, { x: box[0], y: box[1], width: box[2], height: box[3], scales, frames }]));
  const layouts = Object.fromEntries(result.layouts.map((layout) => [layout.name, layout]));
  await writeFile(MAP, `${JSON.stringify({ inputs, frontParallax: result.frontParallax, layouts, ink })}\n`);
  console.log(`ink: ${result.baked.length} images, ${Math.round(bytes / 1024)} KB, in ${((performance.now() - started) / 1000).toFixed(1)}s (${inputs})`);
}

if (process.argv.includes('--check')) await check();
else await bake();
