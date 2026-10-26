import { scheduleBake } from './bake';

export type Point = [number, number];
export type Tone = 'ink' | 'soft' | 'wash' | 'mist' | 'paper';
export type InkFilter = 'bleed' | 'dry' | 'wash' | 'boil' | 'none';

export interface Stroke {
  points: Point[];
  width: number;
  tone?: Tone;
  filter?: InkFilter;
  dry?: boolean;
  seed?: number;
  start?: number;
  end?: number;
  wobble?: number;
}

export interface RenderOptions {
  animate?: boolean;
  delay?: number;
  pace?: number;
}

export const SVG_NS = 'http://www.w3.org/2000/svg';
export const prefersReducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

let maskCounter = 0;

export function seededRandom(seed: number) {
  let state = (Math.abs(Math.floor(seed)) * 9973 + 12345) % 2147483647 || 1;
  return () => (state = (state * 16807) % 2147483647) / 2147483647;
}

export function smoothPoints(points: Point[]): Point[] {
  if (points.length < 3) return points;
  const result: Point[] = [];
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[i - 1] ?? points[i];
    const p1 = points[i];
    const p2 = points[i + 1];
    const p3 = points[i + 2] ?? p2;
    const steps = Math.max(4, Math.ceil(Math.hypot(p2[0] - p1[0], p2[1] - p1[1]) / 5));
    for (let s = 0; s < steps; s++) {
      const t = s / steps;
      const t2 = t * t;
      const t3 = t2 * t;
      const at = (axis: 0 | 1) =>
        0.5 *
        (2 * p1[axis] +
          (-p0[axis] + p2[axis]) * t +
          (2 * p0[axis] - 5 * p1[axis] + 4 * p2[axis] - p3[axis]) * t2 +
          (-p0[axis] + 3 * p1[axis] - 3 * p2[axis] + p3[axis]) * t3);
      result.push([at(0), at(1)]);
    }
  }
  result.push(points[points.length - 1]);
  return result;
}

export function densify(points: Point[], spacing = 4): Point[] {
  const result: Point[] = [];
  for (let i = 0; i < points.length - 1; i++) {
    const [x1, y1] = points[i];
    const [x2, y2] = points[i + 1];
    const steps = Math.max(1, Math.ceil(Math.hypot(x2 - x1, y2 - y1) / spacing));
    for (let s = 0; s < steps; s++) {
      result.push([x1 + ((x2 - x1) * s) / steps, y1 + ((y2 - y1) * s) / steps]);
    }
  }
  result.push(points[points.length - 1]);
  return result;
}

export const centerlineOf = (points: Point[]) => densify(smoothPoints(points));

export function pathLength(points: Point[]) {
  let total = 0;
  for (let i = 1; i < points.length; i++) {
    total += Math.hypot(points[i][0] - points[i - 1][0], points[i][1] - points[i - 1][1]);
  }
  return total;
}

export function brushOutline(
  centerline: Point[],
  width: number,
  { seed = 1, start = 0.12, end = 0.3, wobble = 0.35 }: Partial<Pick<Stroke, 'seed' | 'start' | 'end' | 'wobble'>> = {}
) {
  const random = seededRandom(seed);
  const count = centerline.length;
  const left: Point[] = [];
  const right: Point[] = [];
  let pressure = 1;

  centerline.forEach((point, i) => {
    const t = count > 1 ? i / (count - 1) : 0;
    const before = centerline[Math.max(0, i - 1)];
    const after = centerline[Math.min(count - 1, i + 1)];
    const length = Math.hypot(after[0] - before[0], after[1] - before[1]) || 1;
    const nx = -(after[1] - before[1]) / length;
    const ny = (after[0] - before[0]) / length;
    pressure = Math.min(1.35, Math.max(0.55, pressure * 0.9 + 0.1 + (random() - 0.5) * wobble));
    const taper = Math.max(0, Math.min(1, t / start, (1 - t) / end));
    const half = Math.max(0.25, (width * Math.sin((taper * Math.PI) / 2) * pressure) / 2);
    left.push([point[0] + nx * half, point[1] + ny * half]);
    right.push([point[0] - nx * half, point[1] - ny * half]);
  });

  const format = (p: Point) => `${p[0].toFixed(1)} ${p[1].toFixed(1)}`;
  return `M${left.map(format).join('L')}L${right.reverse().map(format).join('L')}Z`;
}

export const brushPath = (points: Point[], width: number, options?: Parameters<typeof brushOutline>[2]) =>
  brushOutline(centerlineOf(points), width, options);

export const stroke = (points: Point[], width: number, options: Omit<Stroke, 'points' | 'width'> = {}): Stroke => ({
  points,
  width,
  ...options,
});

export function ellipsePoints(
  cx: number,
  cy: number,
  rx: number,
  ry: number,
  { from = -1.4, sweep = 6.6, count = 16, seed = 3 } = {}
): Point[] {
  const random = seededRandom(seed);
  return Array.from({ length: count + 1 }, (_, i) => {
    const angle = from + (sweep * i) / count;
    const drift = 1 + (random() - 0.5) * 0.08;
    return [cx + Math.cos(angle) * rx * drift, cy + Math.sin(angle) * ry * drift] as Point;
  });
}

export function roughRect(x: number, y: number, w: number, h: number, width = 1.6, seed = 1): Stroke[] {
  const random = seededRandom(seed);
  const jitter = () => (random() - 0.5) * 3;
  return [
    stroke([[x - 5, y + jitter()], [x + w / 2, y + jitter() - 1], [x + w + 4, y + jitter()]], width, { seed: seed + 1, start: 0.05, end: 0.15 }),
    stroke([[x + w + jitter(), y - 3], [x + w + jitter() + 1, y + h / 2], [x + w + jitter(), y + h + 4]], width, { seed: seed + 2, start: 0.05, end: 0.2 }),
    stroke([[x + w + 3, y + h + jitter()], [x + w / 2, y + h + jitter() + 1], [x - 4, y + h + jitter()]], width, { seed: seed + 3, start: 0.05, end: 0.15 }),
    stroke([[x + jitter(), y + h + 3], [x + jitter() - 1, y + h / 2], [x + jitter(), y - 4]], width, { seed: seed + 4, start: 0.05, end: 0.2 }),
  ];
}

export function inkSplat(cx: number, cy: number, radius: number, seed = 1): Stroke[] {
  const random = seededRandom(seed);
  const strokes: Stroke[] = [
    stroke(ellipsePoints(cx, cy, radius * 0.45, radius * 0.38, { seed, count: 12 }), radius * 0.9, { seed, start: 0.02, end: 0.05 }),
  ];
  const droplets = 6 + Math.floor(random() * 5);
  for (let i = 0; i < droplets; i++) {
    const angle = random() * Math.PI * 2;
    const reach = radius * (0.7 + random() * 0.9);
    const size = radius * (0.08 + random() * 0.16);
    const x = cx + Math.cos(angle) * reach;
    const y = cy + Math.sin(angle) * reach * 0.7;
    strokes.push(
      stroke(
        [[cx + Math.cos(angle) * radius * 0.4, cy + Math.sin(angle) * radius * 0.3], [x, y]],
        size,
        { seed: seed + i + 1, start: 0.6, end: 0.1 }
      )
    );
  }
  return strokes;
}

export function svgElement<K extends keyof SVGElementTagNameMap>(
  tag: K,
  attributes: Record<string, string | number> = {},
  parent?: Element
): SVGElementTagNameMap[K] {
  const node = document.createElementNS(SVG_NS, tag);
  for (const [key, value] of Object.entries(attributes)) node.setAttribute(key, String(value));
  parent?.append(node);
  return node;
}

function filterFor(item: Stroke) {
  const name = item.filter ?? (item.dry ? 'dry' : 'bleed');
  return name === 'none' ? null : `url(#${name})`;
}

export function strokeToPath(item: Stroke, index = 0) {
  const centerline = centerlineOf(item.points);
  const path = svgElement('path', {
    d: brushOutline(centerline, item.width, {
      seed: item.seed ?? index + 1,
      start: item.start,
      end: item.end,
      wobble: item.wobble,
    }),
    class: `ink-${item.tone ?? 'ink'}`,
  });
  return { path, centerline, filter: filterFor(item) };
}

/** Draws strokes into an SVG; when animated, each stroke is revealed by a mask that follows its centerline. Returns the total duration in seconds. */
export function renderScene(target: SVGElement, strokes: Stroke[], { animate = false, delay = 0, pace = 1 }: RenderOptions = {}) {
  target.replaceChildren();
  const defs = svgElement('defs', {}, target);
  const shouldAnimate = animate && !prefersReducedMotion();
  let clock = delay;
  let finish = delay;
  // Consecutive strokes that share a filter go into one filtered group: a filter per path costs an offscreen pass each,
  // which is what made scrolling stutter on phones. Keeping runs consecutive preserves the paint order.
  let group: SVGGElement | null = null;
  let groupFilter: string | null = null;

  strokes.forEach((item, index) => {
    const { path, centerline, filter } = strokeToPath(item, index);

    if (shouldAnimate) {
      const duration = Math.min(0.9, Math.max(0.18, pathLength(centerline) / 520)) / pace;
      const maskId = `reveal-${++maskCounter}`;
      const mask = svgElement('mask', { id: maskId, maskUnits: 'userSpaceOnUse' }, defs);
      const trail = svgElement(
        'path',
        {
          d: `M${centerline.map((p) => `${p[0].toFixed(1)} ${p[1].toFixed(1)}`).join('L')}`,
          fill: 'none',
          stroke: '#fff',
          'stroke-linecap': 'round',
          'stroke-width': item.width * 2 + 12,
          pathLength: 1,
        },
        mask
      );
      trail.style.strokeDasharray = '1.02';
      trail.style.strokeDashoffset = '1.02';
      trail.style.animation = `ink-draw ${duration}s cubic-bezier(.45,.05,.3,1) ${clock}s forwards`;
      path.setAttribute('mask', `url(#${maskId})`);
      finish = Math.max(finish, clock + duration);
      clock += duration * 0.55;
    }
    if (!filter) {
      group = groupFilter = null;
      target.append(path);
      return;
    }
    if (!group || groupFilter !== filter) {
      group = svgElement('g', { filter }, target);
      groupFilter = filter;
    }
    group.append(path);
  });

  if (target instanceof SVGSVGElement) scheduleBake(target, shouldAnimate ? finish : 0);
  return finish;
}

/** A hand frame in two long strokes that cross past the corners, leaving a small gap near the top-right (the
 * breathing gap of an ensō). The dry tail is drawn as hairline paper streaks, so no filter is needed. */
export function inkFrame(x: number, y: number, w: number, h: number, width = 2, seed = 1): Stroke[] {
  const random = seededRandom(seed);
  const j = () => (random() - 0.5) * 2.4;
  const gap = Math.min(w * 0.3, 10 + random() * 14);
  const strokes: Stroke[] = [
    stroke([[x + w - gap, y + j()], [x + w * 0.5, y - 1 + j()], [x - 3, y + j()], [x + j(), y + h * 0.5], [x - 1 + j(), y + h + 3]], width, { seed: seed + 1, start: 0.04, end: 0.22, filter: 'none' }),
    stroke([[x - 4, y + h + j()], [x + w * 0.5, y + h + 1 + j()], [x + w + 2, y + h + j()], [x + w + j(), y + h * 0.5], [x + w + 1 + j(), y + gap * 0.4]], width * 1.15, { seed: seed + 2, start: 0.03, end: 0.3, filter: 'none' }),
  ];
  for (let i = 0; i < 3; i++) {
    const offset = (i - 1) * width * 0.35;
    strokes.push(stroke([[x + w + offset, y + h * (0.55 - i * 0.05)], [x + w + offset + j() * 0.2, y + gap * 0.6]], 0.6, { tone: 'paper', seed: seed + 10 + i, start: 0.2, end: 0.6, filter: 'none' }));
  }
  return strokes;
}

/** An organic blot outline with the bleed baked into the geometry: lobes, paper tooth, and capillary "fingers" that
 * only appear late in the growth, like ink running along paper fibres. */
export function blotOutline(cx: number, cy: number, rx: number, ry: number, growth: number, seed: number): string {
  const random = seededRandom(seed);
  const lobes = Array.from({ length: 4 }, () => ({ k: 2 + Math.floor(random() * 5), phase: random() * Math.PI * 2, amp: 0.04 + random() * 0.07 }));
  const fingers = Array.from({ length: 3 + Math.floor(random() * 3) }, () => ({ angle: random() * Math.PI * 2, reach: 0.12 + random() * 0.22 }));
  const points: Point[] = [];
  for (let i = 0; i < 72; i++) {
    const angle = (i / 72) * Math.PI * 2;
    let r = 1;
    for (const lobe of lobes) r += Math.sin(angle * lobe.k + lobe.phase) * lobe.amp;
    for (const finger of fingers) {
      const distance = Math.abs(Math.atan2(Math.sin(angle - finger.angle), Math.cos(angle - finger.angle)));
      r += Math.max(0, 1 - distance / 0.18) * finger.reach * Math.max(0, growth - 0.6) * 2.5;
    }
    r += (random() - 0.5) * 0.03;
    points.push([cx + Math.cos(angle) * rx * r * growth, cy + Math.sin(angle) * ry * r * growth]);
  }
  return `M${points.map(([px, py]) => `${px.toFixed(1)} ${py.toFixed(1)}`).join('L')}Z`;
}

export const BLOT_FRAMES = 8;
const blotSprites = new Map<string, string>();

/** A horizontal strip of blot frames as an SVG data URL, used as a CSS mask and stepped through frame by frame. The
 * same seed in every frame keeps the lobes and only grows them; the centre walks from the entry point to the middle,
 * so the flood feels poured rather than scaled. */
export function blotSprite(w: number, h: number, seed: number) {
  const key = `${w}x${h}:${seed}`;
  const cached = blotSprites.get(key);
  if (cached) return cached;
  // Fully grown (growth 1.2) the blot just fills the layer, so its edge stays organic instead of being clipped square
  const origin: Point = [w * 0.3, h * 0.6];
  const paths = Array.from({ length: BLOT_FRAMES }, (_, f) => {
    const t = (f + 1) / BLOT_FRAMES;
    const growth = 0.15 + 1.05 * (1 - Math.pow(1 - t, 2.2));
    const cx = origin[0] + (w / 2 - origin[0]) * t;
    const cy = origin[1] + (h / 2 - origin[1]) * t;
    return `<path transform="translate(${f * w} 0)" d="${blotOutline(cx, cy, w * 0.4, h * 0.38, growth, seed)}"/>`;
  });
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${w * BLOT_FRAMES}" height="${h}" viewBox="0 0 ${w * BLOT_FRAMES} ${h}">${paths.join('')}</svg>`;
  const url = `url("data:image/svg+xml,${encodeURIComponent(svg)}")`;
  blotSprites.set(key, url);
  return url;
}

/** Gives a button or box a hand-drawn frame. Buttons also get an ink layer, a grey wash that sweeps in on hover.
 * `ring` draws an ensō instead. */
export function frameElement(element: HTMLElement, { blot = true, width = 1.8, ring = false } = {}) {
  const w = element.offsetWidth;
  const h = element.offsetHeight;
  if (!w || !h) return;
  let svg = element.querySelector<SVGSVGElement>(':scope > svg.ink-frame');
  if (!svg) {
    svg = svgElement('svg', { class: 'ink-frame', 'aria-hidden': 'true' });
    element.prepend(svg);
  }
  svg.setAttribute('viewBox', `0 0 ${w} ${h}`);
  const seed = Math.round(w + h);
  const frame = ring
    ? [stroke(ellipsePoints(w / 2, h / 2, w / 2 - 3, h / 2 - 3, { seed, from: -1.2, sweep: 5.9, count: 18 }), width, { seed, start: 0.05, end: 0.4, filter: 'none' })]
    : inkFrame(3, 3, w - 6, h - 6, width, seed);
  renderScene(svg, frame);
  if (!blot) return;
  // The ink sits a little beyond the frame on every side, so its organic edge can bleed past the strokes
  const pad = 4;
  let ink = element.querySelector<HTMLSpanElement>(':scope > .ink-layer');
  if (!ink) {
    ink = document.createElement('span');
    ink.className = 'ink-layer';
    ink.setAttribute('aria-hidden', 'true');
    element.prepend(ink);
  }
  ink.style.setProperty('--blot', blotSprite(w + pad * 2, h + pad * 2, seed));
}

const frameSizes = new WeakMap<Element, string>();
const frameObserver =
  typeof ResizeObserver === 'undefined'
    ? null
    : new ResizeObserver((entries) => {
        for (const entry of entries) {
          const element = entry.target as HTMLElement;
          const size = `${Math.round(entry.contentRect.width)}x${Math.round(entry.contentRect.height)}`;
          if (frameSizes.get(element) === size) continue;
          frameSizes.set(element, size);
          frameElement(element, frameOptions(element));
        }
      });

const frameOptions = (element: HTMLElement) => ({ blot: !['plain', 'ring'].includes(element.dataset.frame ?? ''), ring: element.dataset.frame === 'ring' });

/** Frames every `[data-frame]` element and keeps redrawing it whenever its size changes (late fonts, language switch). */
export function frameAll(root: ParentNode = document) {
  root.querySelectorAll<HTMLElement>('[data-frame]').forEach((element) => {
    frameElement(element, frameOptions(element));
    frameObserver?.observe(element);
  });
}
