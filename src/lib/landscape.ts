import { seededRandom, type Point } from './brush';

/** The far planes painted straight into canvas, in the manner of an ink-wash landscape: washes that thin out into
 * mist at their feet, paper grain broken into every fill, dry-brush facets on the rock, and silhouettes that grow
 * darker and sharper the nearer they stand. One long scene: mountains and pines, a coast with a lighthouse, a city
 * behind its wires, then fields behind a fence. */

type Tone = readonly [number, number, number];
const TONE = {
  ink: [21, 21, 21],
  soft: [59, 60, 58],
  wash: [141, 143, 139],
  mist: [198, 200, 196],
} as const satisfies Record<string, Tone>;
const rgba = (tone: Tone, alpha: number) => `rgba(${tone[0]},${tone[1]},${tone[2]},${alpha.toFixed(3)})`;

/** Wide planes are painted in tiles this wide: small enough that painting one never stalls the page for long. */
const TILE = 1024;

export type Biome = 'mountains' | 'coast' | 'city' | 'field';
/** A stretch of the scene in plane pixels; neighbours overlap by `blend`, where both dissolve into mist. */
export interface Stretch {
  biome: Biome;
  from: number;
  to: number;
}

export interface PlaneSpec {
  width: number;
  height: number;
  /** Where the plane meets the ground, in plane pixels. */
  ground: number;
  stretches: Stretch[];
  /** Plane x of every station, so tall things never stand right behind a sign. */
  avoid: number[];
  phone: boolean;
}

// Noise -------------------------------------------------------------------------------------------------------------

function noise1(seed: number) {
  const random = seededRandom(seed);
  const table = Array.from({ length: 256 }, random);
  return (x: number) => {
    const i = Math.floor(x);
    const f = x - i;
    const t = f * f * (3 - 2 * f);
    return table[i & 255] + (table[(i + 1) & 255] - table[i & 255]) * t;
  };
}

function fbm(seed: number, octaves = 5) {
  const layers = Array.from({ length: octaves }, (_, k) => noise1(seed + k * 101));
  return (x: number) => {
    let sum = 0;
    let amplitude = 0.5;
    let frequency = 1;
    let norm = 0;
    for (const layer of layers) {
      sum += layer(x * frequency) * amplitude;
      norm += amplitude;
      amplitude *= 0.5;
      frequency *= 2.07;
    }
    return sum / norm;
  };
}

/** Hashed 2D value noise: cheap enough to run per pixel while a plane is painted. */
function noise2(seed: number) {
  const hash = (ix: number, iy: number) => {
    let h = Math.imul(ix, 374761393) + Math.imul(iy, 668265263) + Math.imul(seed, 1442695041);
    h = Math.imul(h ^ (h >>> 13), 1274126177);
    return ((h ^ (h >>> 16)) >>> 0) / 4294967295;
  };
  return (x: number, y: number) => {
    const ix = Math.floor(x);
    const iy = Math.floor(y);
    const fx = x - ix;
    const fy = y - iy;
    const sx = fx * fx * (3 - 2 * fx);
    const sy = fy * fy * (3 - 2 * fy);
    const top = hash(ix, iy) + (hash(ix + 1, iy) - hash(ix, iy)) * sx;
    const bottom = hash(ix, iy + 1) + (hash(ix + 1, iy + 1) - hash(ix, iy + 1)) * sx;
    return top + (bottom - top) * sy;
  };
}

const smooth = (t: number) => {
  const c = Math.min(1, Math.max(0, t));
  return c * c * (3 - 2 * c);
};

/** Paper grain: speckles and short dry streaks, erased out of every wash so it reads as pigment on rough paper. */
let grainTile: HTMLCanvasElement | null = null;
function grain() {
  if (grainTile) return grainTile;
  const size = 256;
  grainTile = document.createElement('canvas');
  grainTile.width = grainTile.height = size;
  const g = grainTile.getContext('2d')!;
  const random = seededRandom(4242);
  for (let i = 0; i < 3200; i++) {
    g.fillStyle = `rgba(0,0,0,${(0.15 + random() * 0.85).toFixed(2)})`;
    const s = 0.6 + random() * 1.8;
    g.fillRect(random() * size, random() * size, s, s);
  }
  for (let i = 0; i < 260; i++) {
    g.fillStyle = `rgba(0,0,0,${(0.2 + random() * 0.6).toFixed(2)})`;
    g.fillRect(random() * size, random() * size, 4 + random() * 22, 0.7 + random() * 0.8);
  }
  return grainTile;
}

// The painter --------------------------------------------------------------------------------------------------------

/** Paints one tile. Every element is drawn in plane coordinates; the tile only shifts and clips, so elements that
 * straddle two tiles come out identical on both sides (each draws with its own seeded randomness). */
class Painter {
  readonly scratch: CanvasRenderingContext2D;
  private readonly grainPattern: CanvasPattern;

  constructor(
    readonly ctx: CanvasRenderingContext2D,
    readonly from: number,
    readonly to: number,
    readonly scale: number,
    private readonly setup: (target: CanvasRenderingContext2D) => void
  ) {
    const canvas = document.createElement('canvas');
    canvas.width = ctx.canvas.width;
    canvas.height = ctx.canvas.height;
    this.scratch = canvas.getContext('2d')!;
    this.grainPattern = this.scratch.createPattern(grain(), 'repeat')!;
    setup(this.scratch);
  }

  visible(x0: number, x1: number) {
    return x1 > this.from - 40 && x0 < this.to + 40;
  }

  /** Draws into a clean scratch layer, roughens it with paper grain, dissolves its ends into mist, then lays it down. */
  pass(draw: (g: CanvasRenderingContext2D) => void, options: { grain?: number; fade?: [number, number, number]; opacity?: number } = {}) {
    const g = this.scratch;
    g.save();
    g.setTransform(1, 0, 0, 1, 0, 0);
    g.clearRect(0, 0, g.canvas.width, g.canvas.height);
    g.restore();
    g.save();
    draw(g);
    g.restore();
    g.save();
    if (options.grain) {
      g.globalCompositeOperation = 'destination-out';
      g.globalAlpha = options.grain;
      g.fillStyle = this.grainPattern;
      g.fillRect(this.from - 10, -10, this.to - this.from + 20, g.canvas.height * 4);
    }
    if (options.fade) {
      const [from, to, blend] = options.fade;
      const mask = g.createLinearGradient(from - blend / 2, 0, to + blend / 2, 0);
      const span = to - from + blend;
      const edge = Math.min(0.5, blend / span);
      mask.addColorStop(0, 'rgba(0,0,0,0)');
      mask.addColorStop(edge, 'rgba(0,0,0,1)');
      mask.addColorStop(1 - edge, 'rgba(0,0,0,1)');
      mask.addColorStop(1, 'rgba(0,0,0,0)');
      g.globalCompositeOperation = 'destination-in';
      g.globalAlpha = 1;
      g.fillStyle = mask;
      g.fillRect(this.from - 10, -10, this.to - this.from + 20, g.canvas.height * 4);
    }
    g.restore();
    this.ctx.save();
    this.ctx.setTransform(1, 0, 0, 1, 0, 0);
    this.ctx.globalAlpha = options.opacity ?? 1;
    this.ctx.drawImage(g.canvas, 0, 0);
    this.ctx.restore();
  }
}

async function paintTiles(host: HTMLElement, width: number, height: number, scale: number, paint: (painter: Painter) => void) {
  const tiles: HTMLCanvasElement[] = [];
  for (let x0 = 0; x0 < width; x0 += TILE) {
    const w = Math.min(TILE, width - x0);
    const canvas = document.createElement('canvas');
    canvas.width = Math.ceil(w * scale);
    canvas.height = Math.ceil(height * scale);
    const setup = (target: CanvasRenderingContext2D) => target.setTransform(scale, 0, 0, scale, -x0 * scale, 0);
    const ctx = canvas.getContext('2d')!;
    setup(ctx);
    paint(new Painter(ctx, x0, x0 + w, scale, setup));
    canvas.className = 'mundo-baked';
    Object.assign(canvas.style, { left: `${x0}px`, width: `${w}px`, height: `${height}px` });
    tiles.push(canvas);
    // Let the page breathe between tiles: painting a whole plane at once would stall the first scroll
    await new Promise((resolve) => requestAnimationFrame(resolve));
  }
  host.replaceChildren(...tiles);
}

// Motifs -------------------------------------------------------------------------------------------------------------

/** A mountain range's crest: layered noise, folded so the peaks come out sharp and the valleys round. */
function crest(base: number, amplitude: number, period: number, seed: number, from = -Infinity, to = Infinity) {
  const noise = fbm(seed);
  const swell = fbm(seed + 50, 3);
  return (x: number) => {
    if (x < from || x > to) return Infinity;
    const n = noise(x / period);
    const folded = 1 - Math.abs(2 * n - 1);
    // A slow swell lifts some stretches into high peaks and lets others sink into low saddles
    const envelope = 0.3 + 0.9 * smooth(swell(x / (period * 3.5)) * 1.6 - 0.25);
    return base - amplitude * envelope * (0.25 * n + 0.75 * folded ** 2.2);
  };
}

function sampleCrest(ridgeAt: (x: number) => number, from: number, to: number, step = 5): Point[] {
  const line: Point[] = [];
  for (let x = from; x <= to; x += step) {
    const y = ridgeAt(x);
    if (Number.isFinite(y)) line.push([x, y]);
  }
  return line;
}

interface Wash {
  tone: Tone;
  alpha: number;
  /** How far below the crest the wash lasts before the mist has it all. */
  depth: number;
  seed: number;
  /** 0 = a flat, far wash; 1 = rock, with gullies and lit faces. */
  rock?: number;
  /** Where the wash stops below, for things that stand on the ground rather than sink into mist. */
  floor?: (x: number) => number;
}

/** Paints a range pixel by pixel, like a wash laid wet and worked into: densest under the crest, broken into patches,
 * scored by gullies that run down the slope, lighter on faces turned to the light (from the right), and thinning into
 * mist at the foot. */
function washRange(g: CanvasRenderingContext2D, p: Painter, ridgeAt: (x: number) => number, wash: Wash) {
  const { width, height } = g.canvas;
  // Only the band of rows the wash can reach is allocated and written
  const tops = new Float32Array(width);
  let firstRow = height;
  let lastRow = 0;
  for (let px = 0; px < width; px++) {
    const x = p.from + px / p.scale;
    const top = ridgeAt(x);
    tops[px] = top;
    if (!Number.isFinite(top)) continue;
    firstRow = Math.min(firstRow, Math.max(0, Math.floor(top * p.scale)));
    lastRow = Math.max(lastRow, Math.min(height, Math.ceil(Math.min(top + wash.depth, wash.floor?.(x) ?? Infinity) * p.scale)));
  }
  if (lastRow <= firstRow) return;
  const image = g.createImageData(width, lastRow - firstRow);
  const data = image.data;
  const patches = noise2(wash.seed);
  const gullies = noise2(wash.seed + 7);
  const scratches = noise2(wash.seed + 9);
  const rock = wash.rock ?? 0.5;
  const [r, gr, b] = wash.tone;
  for (let px = 0; px < width; px++) {
    const x = p.from + px / p.scale;
    const top = tops[px];
    if (!Number.isFinite(top)) continue;
    const slope = (ridgeAt(x + 4) - ridgeAt(x - 4)) / 8;
    const lit = Number.isFinite(slope) ? Math.max(-1, Math.min(1, slope * 1.4)) : 0;
    const first = Math.max(0, Math.floor(top * p.scale));
    const last = Math.min(height, Math.ceil(Math.min(top + wash.depth, wash.floor?.(x) ?? Infinity) * p.scale));
    for (let py = first; py < last; py++) {
      const y = py / p.scale;
      const d = y - top;
      if (d < 0) continue;
      const t = d / wash.depth;
      const body = 1 - smooth(t);
      const nearCrest = Math.exp(-d / (wash.depth * 0.18));
      const upper = Math.exp(-d / (wash.depth * 0.45));
      // Gullies are stretched along the fall line, which leans with the slope, at two scales so they never line up
      const fall = x + d * lit * 0.8;
      const gully = 0.6 * gullies(fall / 9, y / 26) + 0.4 * scratches(fall / 3.2, y / 11);
      const patch = patches(x / 70, y / 45);
      const light = lit > 0 ? 1 - 0.55 * lit * Math.exp(-d / (wash.depth * 0.5)) : 1 + 0.2 * -lit;
      let alpha = wash.alpha * body * (0.5 + 0.5 * nearCrest) * (0.55 + 0.6 * patch) * light;
      alpha *= 1 - rock * 0.5 * upper + rock * 1.1 * upper * gully ** 1.6;
      if (d * p.scale < 1) alpha *= d * p.scale;
      const k = ((py - firstRow) * width + px) * 4;
      data[k] = r;
      data[k + 1] = gr;
      data[k + 2] = b;
      data[k + 3] = Math.min(255, alpha * 255);
    }
  }
  g.putImageData(image, 0, firstRow);
}

/** A spruce: a thin trunk and tiers of drooping, saw-edged boughs narrowing to a spike. */
function spruce(path: Path2D, x: number, base: number, height: number, seed: number) {
  const random = seededRandom(seed);
  const width = height * (0.2 + random() * 0.08);
  path.rect(x - height * 0.008, base - height * 0.2, height * 0.016, height * 0.2);
  const tiers = 9 + Math.floor(random() * 5);
  for (let i = 0; i < tiers; i++) {
    const t = i / tiers;
    const y = base - height * (0.1 + 0.86 * t);
    const w = width * (1 - t) ** 0.85 * (0.75 + random() * 0.5);
    const droop = height * 0.05 * (1 - t * 0.5);
    const thick = height * 0.045;
    for (const side of [-1, 1]) {
      const reach = w * (0.8 + random() * 0.35);
      path.moveTo(x, y - thick * 0.5);
      const teeth = 4 + Math.floor(random() * 3);
      for (let k = 1; k <= teeth; k++) {
        const f = k / teeth;
        path.lineTo(x + side * reach * (f - 0.08), y + droop * f ** 1.6 - thick * (0.35 + random() * 0.3));
        path.lineTo(x + side * reach * f, y + droop * f ** 1.6 + thick * (0.15 + random() * 0.3));
      }
      path.lineTo(x + side * reach * 0.2, y + thick * 0.55);
      path.closePath();
    }
  }
  // The leader at the top
  path.moveTo(x - height * 0.012, base - height * 0.9);
  path.lineTo(x, base - height * (1 + random() * 0.04));
  path.lineTo(x + height * 0.012, base - height * 0.9);
  path.closePath();
}

/** A broad-leafed tree: a leaning trunk forking into branches, each ending in clusters of small dark leaves. */
function leafyTree(g: CanvasRenderingContext2D, x: number, base: number, height: number, tone: Tone, seed: number) {
  const random = seededRandom(seed);
  const tips: Point[] = [];
  g.strokeStyle = rgba(tone, 0.95);
  g.lineCap = 'round';
  const branch = (from: Point, angle: number, length: number, width: number, depth: number) => {
    const to: Point = [from[0] + Math.cos(angle) * length, from[1] + Math.sin(angle) * length];
    g.lineWidth = width;
    g.beginPath();
    g.moveTo(...from);
    g.quadraticCurveTo(from[0] + Math.cos(angle + 0.3) * length * 0.5, from[1] + Math.sin(angle + 0.3) * length * 0.5, ...to);
    g.stroke();
    if (depth === 0) return tips.push(to);
    const forks = 2 + (random() > 0.6 ? 1 : 0);
    for (let i = 0; i < forks; i++) branch(to, angle + (random() - 0.5) * 1.3, length * (0.62 + random() * 0.15), width * 0.62, depth - 1);
  };
  branch([x, base], -Math.PI / 2 + (random() - 0.5) * 0.3, height * 0.36, height * 0.035, 3);
  for (const [tx, ty] of tips) {
    const leaves = 14 + Math.floor(random() * 14);
    for (let i = 0; i < leaves; i++) {
      const lx = tx + (random() - 0.5) * height * 0.22;
      const ly = ty + (random() - 0.6) * height * 0.16;
      const size = height * (0.012 + random() * 0.02);
      g.fillStyle = rgba(tone, 0.55 + random() * 0.45);
      g.beginPath();
      g.ellipse(lx, ly, size, size * 0.55, random() * Math.PI, 0, Math.PI * 2);
      g.fill();
    }
  }
}

/** A wire hanging between two points. */
function sag(g: CanvasRenderingContext2D, a: Point, b: Point, depth: number) {
  g.beginPath();
  g.moveTo(...a);
  g.quadraticCurveTo((a[0] + b[0]) / 2, (a[1] + b[1]) / 2 + depth * 2, ...b);
  g.stroke();
}

const near = (x: number, avoid: number[], gap: number) => avoid.some((stationX) => Math.abs(x - stationX) < gap);

// Planes ---------------------------------------------------------------------------------------------------------------

const BLEND = 520;

/** The farthest plane: high peaks half lost in the wash, the same behind the whole walk. */
export function paintPeaks(host: HTMLElement, spec: PlaneSpec, scale: number) {
  const { width, ground } = spec;
  return paintTiles(host, width, ground, scale, (p) => {
    p.pass((g) => washRange(g, p, crest(ground * 0.6, ground * 0.36, 560, 7), { tone: TONE.wash, alpha: 0.75, depth: ground * 0.32, seed: 71, rock: 0.45 }), { grain: 0.3 });
    p.pass((g) => washRange(g, p, crest(ground * 0.74, ground * 0.24, 320, 13), { tone: TONE.soft, alpha: 0.55, depth: ground * 0.2, seed: 72, rock: 0.6 }), { grain: 0.28 });
  });
}

/** The middle distance changes with the walk: forested mountains, the sea and its headland, the city, the fields. */
export function paintRidge(host: HTMLElement, spec: PlaneSpec, scale: number) {
  const { width, ground, stretches, phone } = spec;
  return paintTiles(host, width, ground, scale, (p) => {
    for (const [index, stretch] of stretches.entries()) {
      const { biome, from, to } = stretch;
      if (!p.visible(from - BLEND, to + BLEND)) continue;
      const fade: [number, number, number] = [from, to, BLEND];
      const seed = 300 + index * 37;
      const left = Math.max(from - BLEND, p.from - 100);
      const right = Math.min(to + BLEND, p.to + 100);

      if (biome === 'mountains' || biome === 'field') {
        const tall = biome === 'mountains';
        const base = ground * (tall ? 0.86 : 0.9);
        const ridgeAt = crest(base, ground * (tall ? 0.26 : 0.1), tall ? 260 : 420, seed, left, right);
        const line = sampleCrest(ridgeAt, left, right);
        p.pass((g) => washRange(g, p, ridgeAt, { tone: TONE.soft, alpha: tall ? 0.85 : 0.6, depth: ground * (tall ? 0.24 : 0.12), seed: seed + 1, rock: tall ? 0.8 : 0.3 }), { grain: 0.26, fade });
        // Far trees along the crest: spruces on the mountains, round crowns along the fields' hedgerows
        p.pass(
          (g) => {
            const random = seededRandom(seed + 2);
            const path = new Path2D();
            for (const [x, y] of line) {
              if (random() > (tall ? 0.42 : 0.3)) continue;
              const h = (tall ? 22 : 12) + random() * (tall ? 26 : 10);
              if (tall) spruce(path, x, y + 3 + random() * 10, h * (phone ? 0.8 : 1), Math.round(x));
              else path.ellipse(x, y + 2, h * 0.7, h * 0.45, 0, Math.PI, 0);
            }
            g.fillStyle = rgba(TONE.soft, 0.7);
            g.fill(path);
          },
          { grain: 0.25, fade }
        );
      }

      if (biome === 'coast') {
        const horizon = ground * 0.8;
        p.pass(
          (g) => {
            const random = seededRandom(seed);
            const body = g.createLinearGradient(0, horizon, 0, ground);
            body.addColorStop(0, rgba(TONE.soft, 0.55));
            body.addColorStop(0.35, rgba(TONE.wash, 0.5));
            body.addColorStop(1, rgba(TONE.soft, 0.6));
            g.fillStyle = body;
            g.fillRect(left, horizon, right - left, ground - horizon);
            // Swell: broken horizontal strokes, longer and thicker as they come nearer
            for (let y = horizon + 2; y < ground; y += 1.5 + (y - horizon) * 0.06) {
              const depth = (y - horizon) / (ground - horizon);
              for (let x = left + random() * 40; x < right; x += 20 + random() * 90 * (1 + depth)) {
                const length = (8 + random() * 50) * (1 + depth * 2);
                g.strokeStyle = rgba(random() > 0.5 ? TONE.ink : TONE.soft, 0.25 + random() * 0.4);
                g.lineWidth = 0.5 + depth * 2.2 * random();
                g.beginPath();
                g.moveTo(x, y);
                g.lineTo(x + length, y + (random() - 0.5) * 0.8);
                g.stroke();
              }
            }
            // Light on the water: crests and glints left as paper
            g.globalCompositeOperation = 'destination-out';
            for (let i = 0; i < (right - left) / 6; i++) {
              const y = horizon + (ground - horizon) * random() ** 1.6;
              const depth = (y - horizon) / (ground - horizon);
              g.strokeStyle = `rgba(0,0,0,${(0.4 + random() * 0.5).toFixed(2)})`;
              g.lineWidth = 0.6 + depth * 2;
              const x = left + random() * (right - left);
              g.beginPath();
              g.moveTo(x, y);
              g.lineTo(x + 6 + random() * 40 * (1 + depth), y);
              g.stroke();
            }
            g.globalCompositeOperation = 'source-over';
            g.strokeStyle = rgba(TONE.soft, 0.75);
            g.lineWidth = 1;
            g.beginPath();
            g.moveTo(left, horizon);
            g.lineTo(right, horizon);
            g.stroke();
          },
          { grain: 0.2, fade }
        );
        // The headland and its lighthouse, toward the far end of the coast
        const cape = from + (to - from) * 0.72;
        const capeWidth = Math.min(900, (to - from) * 0.45);
        if (p.visible(cape - capeWidth / 2, cape + capeWidth / 2)) {
          p.pass(
            (g) => {
              const noise = fbm(seed + 9);
              const capeAt = (x: number) => {
                const t = (x - (cape - capeWidth / 2)) / capeWidth;
                if (t < 0 || t > 1) return Infinity;
                const shoulder = smooth(t * 3.2) * smooth((1 - t) * 1.6);
                return horizon + 1 - shoulder * ground * 0.13 - noise(x / 40) * ground * 0.03 * shoulder;
              };
              washRange(g, p, capeAt, { tone: TONE.ink, alpha: 1, depth: ground * 0.16, seed: seed + 10, rock: 0.9 });
              const line = sampleCrest(capeAt, cape - capeWidth / 2, cape + capeWidth / 2, 4);
              const crest = line.reduce((best, point) => (point[1] < best[1] ? point : best));
              const [lx, ly] = [crest[0] + capeWidth * 0.08, crest[1] + 4];
              const tower = ground * 0.07;
              g.fillStyle = rgba(TONE.ink, 0.92);
              g.beginPath();
              g.moveTo(lx - tower * 0.13, ly);
              g.lineTo(lx - tower * 0.08, ly - tower);
              g.lineTo(lx + tower * 0.08, ly - tower);
              g.lineTo(lx + tower * 0.13, ly);
              g.fill();
              g.fillRect(lx - tower * 0.14, ly - tower - 2, tower * 0.28, 2);
              g.fillRect(lx - tower * 0.06, ly - tower - 8, tower * 0.12, 6);
              g.beginPath();
              g.moveTo(lx - tower * 0.1, ly - tower - 8);
              g.lineTo(lx, ly - tower - 14);
              g.lineTo(lx + tower * 0.1, ly - tower - 8);
              g.fill();
              g.fillRect(lx + tower * 0.13, ly - tower * 0.35, tower * 0.3, tower * 0.35);
              const trees = new Path2D();
              line.forEach(([x, y], i) => i % 9 === 3 && Math.abs(x - lx) > 20 && spruce(trees, x, y + 3, 10 + (i % 4) * 3, Math.round(x)));
              g.fill(trees);
            },
            { grain: 0.18 }
          );
        }
      }

      if (biome === 'city') {
        // Two rows of blocks, the far one paler; each is one wash laid along the skyline, so the concrete comes out
        // streaked like rain-stained walls and the feet of the buildings sink into the haze
        for (const [row, tone, alpha, tallest] of [
          [0, TONE.wash, 0.95, 0.5],
          [1, TONE.soft, 0.95, 0.36],
        ] as const) {
          const random = seededRandom(seed + row * 11);
          const foot = ground * (row ? 0.99 : 0.95);
          const blocks: { x: number; w: number; top: number; antenna: number }[] = [];
          for (let x = left + random() * 20; x < right; ) {
            const w = 22 + random() * 54;
            const h = ground * (0.07 + random() ** 1.6 * tallest);
            blocks.push({ x, w, top: foot - h, antenna: random() > 0.6 ? 8 + random() * 30 : 0 });
            x += w + (random() > 0.8 ? 8 + random() * 24 : 0);
          }
          const skyline = (x: number) => {
            let top = Infinity;
            for (const block of blocks) if (x >= block.x && x < block.x + block.w) top = Math.min(top, block.top);
            return top;
          };
          p.pass(
            (g) => {
              washRange(g, p, skyline, { tone, alpha, depth: ground * (tallest + 0.05), seed: seed + row, rock: 0.7 });
              g.strokeStyle = rgba(tone, alpha * 0.8);
              g.lineWidth = 0.9;
              for (const block of blocks) {
                if (!block.antenna) continue;
                const ax = block.x + block.w * 0.6;
                g.beginPath();
                g.moveTo(ax, block.top);
                g.lineTo(ax, block.top - block.antenna);
                g.stroke();
              }
              // Windows, left as paper: a loose grid, more felt than seen
              g.globalCompositeOperation = 'destination-out';
              g.fillStyle = 'rgba(0,0,0,0.45)';
              for (const block of blocks) {
                const rows = random() > 0.3;
                for (let wy = block.top + 6; wy < block.top + (foot - block.top) * 0.6; wy += 7) {
                  for (let wx = block.x + 4; wx < block.x + block.w - 4; wx += 6) if (rows && random() > 0.35) g.fillRect(wx, wy, 2, 2.8);
                }
              }
            },
            { grain: 0.22, fade }
          );
        }
      }
    }
  });
}

/** The near plane: a low wash of hills along the whole walk, and what stands closest in each stretch. */
export function paintHills(host: HTMLElement, spec: PlaneSpec, scale: number) {
  const { width, height, ground, stretches, avoid, phone } = spec;
  const size = phone ? 0.7 : 1;
  return paintTiles(host, width, height, scale, (p) => {
    const hillAt = crest(ground - 2, ground * 0.08, 380, 9);
    p.pass((g) => washRange(g, p, hillAt, { tone: TONE.wash, alpha: 0.7, depth: ground * 0.12, seed: 91, rock: 0.35 }), { grain: 0.28 });
    // Things stand a little into the hill, never on its very crest
    const groundAt = (x: number) => hillAt(x) + (ground - hillAt(x)) * 0.5;

    for (const [index, stretch] of stretches.entries()) {
      const { biome, from, to } = stretch;
      if (!p.visible(from - BLEND, to + BLEND)) continue;
      const fade: [number, number, number] = [from, to, BLEND * 0.6];
      const seed = 900 + index * 53;

      if (biome === 'mountains') {
        p.pass(
          (g) => {
            const random = seededRandom(seed);
            const path = new Path2D();
            for (let x = from + random() * 200; x < to; x += 380 + random() * 420) {
              if (near(x, avoid, 160)) continue;
              const grove = 2 + Math.floor(random() * 4);
              for (let i = 0; i < grove; i++) {
                const tx = x + (random() - 0.5) * 160;
                spruce(path, tx, groundAt(tx) + 8, (120 + random() * 160) * size, Math.round(tx));
              }
            }
            g.fillStyle = rgba(TONE.ink, 0.86);
            g.fill(path);
          },
          { grain: 0.22, fade }
        );
      }

      if (biome === 'coast') {
        p.pass(
          (g) => {
            const random = seededRandom(seed);
            const noise = fbm(seed + 3, 3);
            const rocks: { x: number; w: number; h: number; base: number; lean: number }[] = [];
            for (let x = from + random() * 120; x < to; x += 140 + random() * 320) {
              const w = (50 + random() * 120) * size;
              rocks.push({ x, w, h: w * (0.3 + random() * 0.3), base: groundAt(x) + 12, lean: 0.6 + random() * 0.8 });
              if (random() > 0.5) rocks.push({ x: x + w * 0.45, w: w * 0.45, h: w * 0.18, base: groundAt(x) + 12, lean: 0.6 + random() * 0.8 });
            }
            const floor = (x: number) => rocks.find((rock) => Math.abs(x - rock.x) <= rock.w / 2)?.base ?? Infinity;
            const rockAt = (x: number) => {
              let top = Infinity;
              for (const rock of rocks) {
                const t = (x - rock.x + rock.w / 2) / rock.w;
                if (t < 0 || t > 1) continue;
                // Skewed and chipped, so no two rocks share a dome
                const skewed = t ** rock.lean;
                top = Math.min(top, rock.base - rock.h * Math.sin(Math.PI * skewed) ** 0.4 * (0.7 + 0.55 * noise(x / 9)));
              }
              return top;
            };
            washRange(g, p, rockAt, { tone: TONE.ink, alpha: 1.2, depth: 160 * size, seed: seed + 4, rock: 1, floor });
            // Foam breaking against the rocks, left as paper
            g.globalCompositeOperation = 'destination-out';
            g.lineCap = 'round';
            for (const rock of rocks) {
              for (let k = 0; k < 6; k++) {
                g.strokeStyle = `rgba(0,0,0,${(0.5 + random() * 0.45).toFixed(2)})`;
                g.lineWidth = 1 + random() * 2.5;
                const fx = rock.x - rock.w * 0.6 + random() * rock.w * 1.2;
                const fy = rock.base - 2 - random() * rock.h * 0.25;
                g.beginPath();
                g.moveTo(fx, fy);
                g.quadraticCurveTo(fx + 8, fy - 3 - random() * 6, fx + 14 + random() * 26, fy - random() * 3);
                g.stroke();
              }
            }
          },
          { grain: 0.25, fade }
        );
      }

      if (biome === 'city') {
        p.pass(
          (g) => {
            const random = seededRandom(seed);
            const poles: Point[] = [];
            for (let x = from + random() * 120; x < to; x += 340 + random() * 160) if (!near(x, avoid, 50)) poles.push([x, groundAt(x) + 6]);
            g.lineCap = 'round';
            for (const [x, base] of poles) {
              const h = (230 + random() * 60) * size;
              g.strokeStyle = rgba(TONE.ink, 0.9);
              g.lineWidth = 5 * size;
              g.beginPath();
              g.moveTo(x, base);
              g.lineTo(x + 2, base - h);
              g.stroke();
              g.lineWidth = 2.4 * size;
              for (const k of [0.92, 0.84]) {
                g.beginPath();
                g.moveTo(x - 26 * size, base - h * k);
                g.lineTo(x + 28 * size, base - h * k);
                g.stroke();
              }
              if (random() > 0.5) {
                // A street lamp on its arm
                g.beginPath();
                g.moveTo(x, base - h * 0.62);
                g.quadraticCurveTo(x + 30 * size, base - h * 0.72, x + 52 * size, base - h * 0.66);
                g.stroke();
                g.fillStyle = rgba(TONE.ink, 0.9);
                g.fillRect(x + 44 * size, base - h * 0.66, 16 * size, 5 * size);
              }
            }
            g.strokeStyle = rgba(TONE.ink, 0.7);
            g.lineWidth = 1;
            for (let i = 0; i < poles.length - 1; i++) {
              const [ax, ab] = poles[i];
              const [bx, bb] = poles[i + 1];
              for (const [k, dx] of [[0.92, -24], [0.92, 26], [0.84, -20], [0.84, 22]] as const) {
                const ah = (230 + 30) * size;
                sag(g, [ax + dx * size, ab - ah * k], [bx + dx * size, bb - ah * k], 14 + random() * 10);
              }
            }
          },
          { grain: 0.15, fade }
        );
      }

      if (biome === 'field') {
        p.pass(
          (g) => {
            const random = seededRandom(seed);
            g.lineCap = 'round';
            const posts: Point[] = [];
            for (let x = from; x < to; x += 70 + random() * 30) posts.push([x, groundAt(x) + 4 + random() * 4]);
            g.strokeStyle = rgba(TONE.ink, 0.85);
            for (const [x, base] of posts) {
              g.lineWidth = 3.2 * size;
              g.beginPath();
              g.moveTo(x, base);
              g.lineTo(x + (random() - 0.5) * 4, base - (48 + random() * 12) * size);
              g.stroke();
            }
            g.lineWidth = 0.9;
            g.strokeStyle = rgba(TONE.ink, 0.65);
            for (let i = 0; i < posts.length - 1; i++) {
              for (const k of [0.45, 0.8]) {
                const a: Point = [posts[i][0], posts[i][1] - 54 * size * k];
                const b: Point = [posts[i + 1][0], posts[i + 1][1] - 54 * size * k];
                sag(g, a, b, 3);
                // Barbs
                for (let t = 0.2; t < 1; t += 0.25) {
                  const bx = a[0] + (b[0] - a[0]) * t;
                  const by = a[1] + (b[1] - a[1]) * t + 1.5;
                  g.beginPath();
                  g.moveTo(bx - 2, by - 2);
                  g.lineTo(bx + 2, by + 2);
                  g.moveTo(bx + 2, by - 2);
                  g.lineTo(bx - 2, by + 2);
                  g.stroke();
                }
              }
            }
            // Tall grass along the fence line
            for (let x = from; x < to; x += 3 + random() * 6) {
              const base = groundAt(x) + 8;
              const h = (8 + random() ** 2 * 34) * size;
              g.strokeStyle = rgba(random() > 0.4 ? TONE.ink : TONE.soft, 0.4 + random() * 0.5);
              g.lineWidth = 0.6 + random() * 1.2;
              g.beginPath();
              g.moveTo(x, base);
              g.quadraticCurveTo(x + (random() - 0.5) * 6, base - h * 0.6, x + (random() - 0.4) * 14, base - h);
              g.stroke();
            }
            // One broad tree leaning over the field
            const treeX = from + (to - from) * 0.55;
            if (!near(treeX, avoid, 200)) leafyTree(g, treeX, groundAt(treeX) + 8, 260 * size, TONE.ink, seed + 5);
          },
          { grain: 0.18, fade }
        );
      }
    }
  });
}

/** A strip of drifting mist, `period` wide and seamless, as an image URL: soft paper-coloured clouds that thin out
 * above and below `y`. It is slid sideways by CSS, so it moves even while the page stands still. */
export function mistStrip(period: number, height: number, y: number, thickness: number, seed: number, scale = 0.5) {
  const canvas = document.createElement('canvas');
  canvas.width = Math.ceil(period * scale);
  canvas.height = Math.ceil(height * scale);
  const g = canvas.getContext('2d')!;
  g.scale(scale, scale);
  const random = seededRandom(seed);
  const puffs = Math.round(period / 26);
  for (let i = 0; i < puffs; i++) {
    const x = random() * period;
    const py = y + (random() - 0.5) * thickness;
    const rx = 60 + random() * 180;
    const ry = thickness * (0.25 + random() * 0.35);
    const alpha = 0.18 + random() * 0.3;
    // Drawn again one period to each side, so the strip tiles without a seam
    for (const shift of [-period, 0, period]) {
      const puff = g.createRadialGradient(x + shift, py, 0, x + shift, py, rx);
      puff.addColorStop(0, `rgba(238,238,236,${alpha})`);
      puff.addColorStop(1, 'rgba(238,238,236,0)');
      g.save();
      g.translate(x + shift, py);
      g.scale(1, ry / rx);
      g.translate(-(x + shift), -py);
      g.fillStyle = puff;
      g.fillRect(x + shift - rx, py - rx, rx * 2, rx * 2);
      g.restore();
    }
  }
  return canvas.toDataURL();
}
