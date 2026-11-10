// Runs inside headless Chrome (see index.mjs): draws every ink drawing of the world with the brush engine and the
// same SVG filters the page used to apply live, and hands back PNGs. Chrome is the renderer on purpose: the ink
// filters (turbulence, displacement, dry-brush threshold) look exactly as they did in the browser.
import { brushOutline, centerlineOf, roughRect, stroke, type InkFilter, type Point, type Stroke } from '../../src/lib/brush';
import { FLOOR_PROPS, lanternFlame, lanternRays } from '../../src/lib/floor';
import { attributes, projects } from '../../src/data/content';
import { attributeBar, deskObjects, foregroundBranch, sketchFor, worldProps } from '../../src/lib/scenes';
import { seededRandom } from '../../src/lib/random';
import { buildLayout, floorOf, FRONT_PARALLAX, SCROLL_LIFT, type LayoutName, type WorldLayout } from '../../src/world/layout';

const FILTERS = `
<filter id="bleed" x="-15%" y="-15%" width="130%" height="130%">
  <feTurbulence type="fractalNoise" baseFrequency="0.04" numOctaves="2" seed="4" result="noise"/>
  <feDisplacementMap in="SourceGraphic" in2="noise" scale="2.6" xChannelSelector="R" yChannelSelector="G"/>
</filter>
<filter id="dry" x="-15%" y="-15%" width="130%" height="130%">
  <feTurbulence type="fractalNoise" baseFrequency="0.9 0.07" numOctaves="2" seed="8" result="grain"/>
  <feColorMatrix in="grain" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 -2.6 1.65" result="gaps"/>
  <feComposite in="SourceGraphic" in2="gaps" operator="in" result="streaked"/>
  <feTurbulence type="fractalNoise" baseFrequency="0.04" numOctaves="2" seed="2" result="noise"/>
  <feDisplacementMap in="streaked" in2="noise" scale="3" xChannelSelector="R" yChannelSelector="G"/>
</filter>
<filter id="wash" x="-20%" y="-20%" width="140%" height="140%">
  <feTurbulence type="fractalNoise" baseFrequency="0.02" numOctaves="3" seed="5" result="noise"/>
  <feDisplacementMap in="SourceGraphic" in2="noise" scale="14" xChannelSelector="R" yChannelSelector="G"/>
  <feGaussianBlur stdDeviation="1.4"/>
</filter>`;

const boilFilter = (frame: number) => `
<filter id="boil" x="-20%" y="-20%" width="140%" height="140%">
  <feTurbulence type="fractalNoise" baseFrequency="0.05" numOctaves="2" seed="${frame}" result="noise"/>
  <feDisplacementMap in="SourceGraphic" in2="noise" scale="3.2" xChannelSelector="R" yChannelSelector="G"/>
</filter>`;

/** The tones of global.css (.ink-ink, .ink-soft…), inlined because a drawing rendered as an image sees no page CSS. */
const TONES = {
  ink: 'fill="#151515"',
  soft: 'fill="#3b3c3a"',
  wash: 'fill="#8d8f8b" fill-opacity="0.55"',
  mist: 'fill="#c6c8c4" fill-opacity="0.85"',
  paper: 'fill="#eeeeec"',
};

const filterOf = (item: Stroke): InkFilter => item.filter ?? (item.dry ? 'dry' : 'bleed');

/** The same markup renderScene builds: runs of strokes sharing a filter go into one filtered group. */
function strokesMarkup(strokes: Stroke[]) {
  let markup = '';
  let open: InkFilter | null = null;
  strokes.forEach((item, index) => {
    const d = brushOutline(centerlineOf(item.points), item.width, { seed: item.seed ?? index + 1, start: item.start, end: item.end, wobble: item.wobble });
    const path = `<path d="${d}" ${TONES[item.tone ?? 'ink']}/>`;
    const filter = filterOf(item);
    if (filter !== open) {
      if (open && open !== 'none') markup += '</g>';
      if (filter !== 'none') markup += `<g filter="url(#${filter})">`;
      open = filter;
    }
    markup += path;
  });
  if (open && open !== 'none') markup += '</g>';
  return markup;
}

type ViewBox = [x: number, y: number, width: number, height: number];

function svgMarkup(strokes: Stroke[], [x, y, width, height]: ViewBox, scale: number, boilFrame = 1) {
  const pixels = [Math.round(width * scale), Math.round(height * scale)];
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${pixels[0]}" height="${pixels[1]}" viewBox="${x} ${y} ${width} ${height}" preserveAspectRatio="none"><defs>${FILTERS}${boilFilter(boilFrame)}</defs>${strokesMarkup(strokes)}</svg>`;
}

async function rasterize(svg: string, width: number, height: number) {
  const image = new Image();
  image.src = URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml' }));
  await image.decode();
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  canvas.getContext('2d')!.drawImage(image, 0, 0, width, height);
  URL.revokeObjectURL(image.src);
  return canvas.toDataURL('image/png');
}

export interface Drawing {
  name: string;
  strokes: Stroke[];
  box: ViewBox;
  /** Pixel densities to bake, as multiples of the world unit. */
  scales: number[];
  /** Boiling drawings get three frames, stepped through by effects.ts. */
  boil?: boolean;
}

export interface Baked {
  name: string;
  scale: number;
  frame: number;
  width: number;
  height: number;
  png: string;
}

const hasBoil = (strokes: Stroke[]) => strokes.some((item) => item.filter === 'boil');
const shift = (strokes: Stroke[], dx: number, dy: number) => strokes.map((item) => ({ ...item, points: item.points.map(([x, y]) => [x + dx, y + dy] as Point) }));

/** Splits a long horizontal drawing into tiles no wider than 2048 pixels at the largest scale. */
function strips(name: string, strokes: Stroke[], [x, y, width, height]: ViewBox, scales: number[]): Drawing[] {
  const span = 2048 / Math.max(...scales);
  return Array.from({ length: Math.ceil(width / span) }, (_, index) => ({
    name: `${name}-${index}`,
    strokes,
    box: [x + index * span, y, Math.min(span, width - index * span), height] as ViewBox,
    scales,
  }));
}

function worldDrawings(layout: WorldLayout): Drawing[] {
  const { name, width, height, boxes, viewport } = layout;
  const floor = floorOf(layout);
  const [bandTop, bandBottom] = layout.floorBand;
  const drawings: Drawing[] = strips(`floor-${name}`, floor, [0, bandTop, width, bandBottom - bandTop], [1, 2]);

  // Foreground grass along the bottom edge, moving faster than the floor
  const random = seededRandom(77);
  const blades: Stroke[] = [];
  for (let i = 0; i < layout.frontWidth / 160; i++) {
    const x = random() * layout.frontWidth;
    const tall = 34 + random() * 60;
    blades.push(stroke([[x, height + 10], [x + 10, height - tall * 0.5], [x + 26 * (random() - 0.3), height - tall]], 7 + random() * 6, { seed: 700 + i, start: 0.05, end: 0.8, tone: random() > 0.5 ? 'ink' : 'soft' }));
  }
  drawings.push(...strips(`front-${name}`, blades, [0, height - 110, layout.frontWidth, 120], [1, 2]));

  // The hero scroll's post, the clothesline and the frames, at the size this map gives them
  const sheet = boxes.heroSheet;
  drawings.push({
    name: `hero-post-${name}`,
    strokes: [
      stroke([[sheet.width + 22, 0], [sheet.width + 24, sheet.height! + SCROLL_LIFT]], 5, { seed: 1206, start: 0.02, end: 0.05 }),
      stroke([[sheet.width / 2 - 10, 3], [sheet.width * 0.8, 1], [sheet.width + 30, 4]], 3, { seed: 1207, start: 0.05, end: 0.02 }),
      stroke([[sheet.width + 4, sheet.height! + SCROLL_LIFT - 2], [sheet.width + 40, sheet.height! + SCROLL_LIFT]], 9, { tone: 'mist', filter: 'wash', seed: 1208 }),
    ],
    box: [0, -8, sheet.width + 48, sheet.height! + SCROLL_LIFT + 16],
    scales: [1, 2],
  });
  const line = boxes.line;
  const sag: Point[] = [];
  for (let i = 0; i <= 10; i++) sag.push([18 + ((line.width - 36) * i) / 10, 16 + Math.sin((Math.PI * i) / 10) * 30]);
  drawings.push({
    name: `line-${name}`,
    strokes: [
      ...shift(worldProps.pole(1401, line.height! + 4), 4, 0),
      ...shift(worldProps.pole(1403, line.height! + 4), line.width - 28, 0),
      stroke(sag, 1.6, { seed: 1405, start: 0.01, end: 0.01 }),
    ],
    box: [-8, -8, line.width + 16, line.height! + 20],
    scales: [1, 2],
  });
  drawings.push({ name: `board-frame-${name}`, strokes: roughRect(4, 4, boxes.board.width - 8, boxes.board.height! - 8, 2.4, 1601), box: [-6, -6, boxes.board.width + 12, boxes.board.height! + 12], scales: [1, 2] });
  drawings.push({ name: `note-frame-${name}`, strokes: roughRect(3, 3, layout.noteWidth - 6, 254, 1.8, 2720), box: [-6, -6, layout.noteWidth + 12, 272], scales: [1, 2] });

  // The walk's progress bar, with a tick under each station the navigation names
  const ticks = ['hero', 'line', 'house', 'lectern', 'repos', 'mail'].map((station, index) => {
    const offset = station === 'hero' ? 0 : Math.max(0, Math.min(width - viewport, layout.stations[station as keyof typeof layout.stations] - viewport * 0.12));
    const x = 2 + (offset / (width - viewport)) * 396;
    return stroke([[x, 3], [x, 17]], 2, { seed: 1810 + index });
  });
  drawings.push({ name: `progress-${name}`, strokes: [stroke([[2, 10], [200, 9], [398, 10]], 1.4, { tone: 'mist', seed: 1801, start: 0.01, end: 0.01 }), ...ticks], box: [-4, 0, 408, 20], scales: [2] });
  return drawings;
}

function sharedDrawings(layouts: WorldLayout[]): Drawing[] {
  const drawings: Drawing[] = [];
  const signSeeds = { varal: 1310, estante: 1320, atelie: 1330, sobre: 1340 };
  Object.entries(signSeeds).forEach(([sign, seed]) => drawings.push({ name: `signpost-${sign}`, strokes: worldProps.signpost(seed), box: [-6, -6, 212, 412], scales: [1, 2] }));
  drawings.push({ name: 'enso', strokes: worldProps.enso(1700), box: [0, 0, 120, 120], scales: [2] });
  drawings.push({ name: 'desk-ink', strokes: deskObjects.inkBottle, box: [0, 0, 130, 115], scales: [2] });
  drawings.push({ name: 'desk-brush', strokes: deskObjects.brush, box: [0, 0, 170, 155], scales: [2] });
  projects.filter((project) => project.featured).forEach((project) => drawings.push({ name: `sketch-${project.id}`, strokes: sketchFor(project.id), box: [0, 0, 240, 160], scales: [2] }));
  attributes.forEach((attribute, index) => drawings.push({ name: `bar-${Math.round(attribute.value * 100)}`, strokes: attributeBar(attribute.value, 400 + index * 3), box: [0, 0, 300, 16], scales: [2] }));
  drawings.push({ name: 'progress-fill', strokes: [stroke([[2, 10], [200, 8], [398, 10]], 6, { seed: 1802, dry: true, start: 0.01, end: 0.02 })], box: [-4, 0, 408, 20], scales: [2] });
  drawings.push({ name: 'intro-line', strokes: [stroke([[0, 9], [160, 7], [320, 10]], 4.5, { seed: 19, dry: true, start: 0.02, end: 0.1 })], box: [-4, 0, 328, 18], scales: [2] });
  const soundBox = stroke([[4, 10], [10, 10], [17, 4], [17, 24], [10, 18], [4, 18], [4, 10]], 2, { seed: 41, start: 0.02, end: 0.04 });
  drawings.push({ name: 'sound-on', strokes: [soundBox, stroke([[22, 9], [25, 14], [22, 19]], 1.8, { seed: 42 }), stroke([[25, 5], [30, 14], [25, 23]], 1.8, { seed: 43 })], box: [0, 0, 32, 28], scales: [3] });
  drawings.push({ name: 'sound-off', strokes: [soundBox, stroke([[22, 9], [30, 19]], 2, { seed: 44 }), stroke([[30, 9], [22, 19]], 2, { seed: 45 })], box: [0, 0, 32, 28], scales: [3] });

  // Floor props, each at its own seed (as they stood before), plus the lantern's flame and a few sets of rays
  // The two maps reuse seeds for different kinds of prop, so a drawing is named (and kept) by both
  const seen = new Set<string>();
  layouts.flatMap((layout) => layout.props).forEach((prop) => {
    const key = `${prop.name}-${prop.seed}`;
    if (seen.has(key)) return;
    seen.add(key);
    const kind = FLOOR_PROPS[prop.name];
    drawings.push({ name: `prop-${prop.name}-${prop.seed}`, strokes: kind.draw(prop.seed), box: [0, 0, kind.width, kind.height], scales: [2] });
  });
  drawings.push({ name: 'lantern-flame', strokes: lanternFlame, box: [-6, -16, 12, 17], scales: [4] });
  [0, 1, 2, 3].forEach((variant) => drawings.push({ name: `lantern-rays-${variant}`, strokes: lanternRays(3000 + variant * 37), box: [-50, -50, 100, 100], scales: [2] }));
  [0, 1, 2].forEach((index) => drawings.push({ name: `branch-${index}`, strokes: foregroundBranch(830 + index * 17, 380), box: [-30, -20, 450, 150], scales: [2] }));
  drawings.push({ name: 'bird', strokes: worldProps.bird(60), box: [-2, 0, 32, 12], scales: [3] });
  return drawings;
}

async function bakeAll() {
  const layouts = (['wide', 'narrow'] as LayoutName[]).map(buildLayout);
  const drawings = [...sharedDrawings(layouts), ...layouts.flatMap(worldDrawings)];
  const baked: Baked[] = [];
  for (const drawing of drawings) {
    const frames = drawing.boil || hasBoil(drawing.strokes) ? [1, 2, 3] : [1];
    for (const scale of drawing.scales) {
      for (const frame of frames) {
        const width = Math.round(drawing.box[2] * scale);
        const height = Math.round(drawing.box[3] * scale);
        baked.push({ name: drawing.name, scale, frame, width, height, png: await rasterize(svgMarkup(drawing.strokes, drawing.box, scale, frame), width, height) });
      }
    }
  }
  return {
    layouts,
    drawings: drawings.map(({ name, box, scales, strokes, boil }) => ({ name, box, scales, frames: boil || hasBoil(strokes) ? 3 : 1 })),
    baked,
    frontParallax: FRONT_PARALLAX,
  };
}

(window as unknown as { bakeAll: typeof bakeAll }).bakeAll = bakeAll;
