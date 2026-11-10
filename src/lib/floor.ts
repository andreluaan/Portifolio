import { ellipsePoints, seededRandom, stroke, type Point, type Stroke, type Tone } from './brush';
import { grassTufts } from './scenes';

/** The walkable ground: a band from the back edge, where the stations stand, down to the bottom of the view.
 * As in an emaki, depth is drawn in parallel oblique projection (no vanishing point), so the whole floor scrolls as
 * one flat sheet; only the rows grow taller toward the viewer, as in the old arcade beat 'em ups. */
export interface Lane {
  back: number;
  front: number;
}

/** Where Mel may stand, as depths from the back edge (0) to the bottom of the view (1). */
export const LANE_DEPTH = { min: 0.1, max: 0.94, start: 0.4 };

/** Share of the band's height in front of a depth: rows grow taller toward the viewer. */
const depthToShare = (depth: number) => depth * (0.6 + 0.4 * depth);
const shareToDepth = (share: number) => (-0.6 + Math.sqrt(0.36 + 1.6 * share)) / 0.8;

export const laneY = (lane: Lane, depth: number) => lane.back + (lane.front - lane.back) * depthToShare(depth);
export const depthAt = (lane: Lane, y: number) => shareToDepth(Math.max(0, Math.min(1, (y - lane.back) / (lane.front - lane.back))));
/** Arcade characters barely scale with depth; a touch is enough to read near and far. */
export const depthScale = (depth: number) => 1 + (depth - LANE_DEPTH.start) * 0.18;

/** The three rows of flagstones, as depth ranges. Props stand on a row's centre line, so everything on the floor
 * shares the same few lines of depth, like the lanes of an arcade stage. */
export const PATH_ROWS: [number, number][] = [[0.2, 0.36], [0.36, 0.54], [0.54, 0.74]];
export const ROW_DEPTHS = PATH_ROWS.map(([from, to]) => (from + to) / 2);
/** Lanterns along the back edge stand here: behind the band Mel walks in, so she always passes in front. */
export const BACK_EDGE_DEPTH = 0;

/** Receding edges lean left by this much per pixel toward the viewer (about 37°, softer than a drafting 45°). */
const OBLIQUE = 1.3;

export interface FloorPlan {
  width: number;
  lane: Lane;
  /** Where stations stand: stepping stones lead from the path to each of them. */
  landmarks: number[];
  /** Empty stretches of the back edge, [from, to], where a fence or a stone lantern can stand. */
  gaps: [number, number][];
  /** Rocks sitting at the back of the floor (Mel hops them when she walks close to the back). */
  rocks: number[];
  seed?: number;
}

/** Back rows are pale and thin, front rows dark and dry-brushed: value carries the depth. */
const toneAt = (depth: number): Tone => (depth < 0.3 ? 'wash' : 'soft');
const lineAt = (depth: number) => 0.8 + depth * 1.8;

/** The whole floor as brush strokes, ordered so strokes sharing a filter stay together (see renderScene). */
export function drawFloor({ width, lane, landmarks, gaps, rocks, seed = 900 }: FloorPlan): { strokes: Stroke[]; lanterns: number[] } {
  const random = seededRandom(seed);
  const y = (depth: number) => laneY(lane, depth);
  const washes: Stroke[] = [];
  const scumbles: Stroke[] = [];
  const lines: Stroke[] = [];
  const blades: Stroke[] = [];
  let id = seed * 10;
  const next = () => ++id;
  const lanterns: number[] = [];

  // The path fades in and out along the way, the way sumi-e draws a few stones and lets the eye fill in the rest
  const phase = [random() * 9, random() * 9];
  const presence = (x: number) => {
    const near = landmarks.some((at) => Math.abs(at - x) < 260) ? 0.35 : 0;
    return 0.72 + 0.3 * Math.sin(x / 530 + phase[0]) + 0.22 * Math.sin(x / 1270 + phase[1]) + near;
  };

  // A mist band (suyari-gasumi) hides where the painting meets the floor
  washes.push(stroke([[-40, lane.back + 5], [width * 0.5, lane.back + 3], [width + 40, lane.back + 6]], 14, { tone: 'mist', filter: 'wash', seed: next(), start: 0.01, end: 0.01 }));

  // Ishidatami: three rows of flagstones with open joints, smaller and paler at the back
  PATH_ROWS.forEach(([from, to], row) => {
    const top = y(from);
    const bottom = y(to);
    const height = bottom - top;
    const lean = OBLIQUE * height;
    const middle = (from + to) / 2;
    const tone = toneAt(middle);
    const weight = lineAt(middle);
    // Each row starts a little further left than the one behind it: the oblique recession of the whole path
    let x = -random() * 120 - lean * row;
    const centreY = (top + bottom) / 2;
    while (x < width + lean) {
      const stoneWidth = height * (1.3 + random() * 1.1);
      const gap = 2 + row + random() * 3;
      if (random() < presence(x)) {
        // A rounded, irregular stone, flattened by the view and sheared along the recession
        const cx = x + stoneWidth / 2;
        const cy = centreY + (random() - 0.5) * height * 0.12;
        const rx = stoneWidth / 2 - gap;
        const ry = height / 2 - gap * 0.6;
        const outline = (from: number, sweep: number, count: number): Point[] =>
          Array.from({ length: count + 1 }, (_, i) => {
            const angle = from + (sweep * i) / count;
            const swell = 0.82 + random() * 0.24;
            // A squarish superellipse: cut stones with worn corners rather than pebbles
            const squarish = (value: number) => Math.sign(value) * Math.abs(value) ** 0.55;
            const py = squarish(Math.sin(angle)) * ry * swell;
            return [cx + squarish(Math.cos(angle)) * rx * swell - (py * OBLIQUE) / 3, cy + py] as Point;
          });
        // The shadow side (lower right) always lands; the joint is left open somewhere on the lit upper edge
        const from = -0.4 - random() * 0.8;
        lines.push(stroke(outline(from, Math.PI * (1.3 + random() * 0.5), 6), weight, { tone, seed: next(), start: 0.12, end: 0.35 }));
        // Shade pools in the lower right of a stone, never as a blot in its middle
        if (random() < 0.3) washes.push(stroke([[cx - rx * 0.1, cy + ry * 0.55], [cx + rx * 0.4, cy + ry * 0.45], [cx + rx * 0.75, cy + ry * 0.1]], ry * 0.55, { tone: random() < 0.35 ? 'wash' : 'mist', filter: 'wash', seed: next(), start: 0.3, end: 0.4 }));
        if (random() < 0.1) lines.push(stroke([[cx - rx * 0.2, cy - ry * 0.5], [cx - rx * 0.05, cy], [cx + rx * 0.15, cy + ry * 0.45]], weight * 0.55, { tone, seed: next() }));
      }
      x += stoneWidth;
    }
  });

  // Earth on either side of the path: dry horizontal scumbles, sparse at the back, heavier in front
  for (let i = 0; i < width / 70; i++) {
    const front = random() < 0.6;
    const depth = front ? 0.76 + random() * 0.14 : 0.05 + random() * 0.13;
    const x = random() * width;
    const length = 30 + random() * (front ? 170 : 90);
    const at = y(depth);
    scumbles.push(stroke([[x, at], [x + length * 0.5, at + (random() - 0.5) * 2], [x + length, at + (random() - 0.5) * 3]], (front ? 2 : 1.2) + random() * (front ? 3 : 1.5), { tone: front && random() < 0.4 ? 'soft' : 'wash', dry: true, seed: next(), start: 0.15, end: 0.4 }));
  }

  // Pebbles and fallen pine needles, bigger and darker the nearer they lie
  for (let i = 0; i < width / 45; i++) {
    const depth = 0.04 + random() * 0.92;
    const size = 1 + depth * 2.8;
    const x = random() * width;
    const at = y(depth);
    if (random() < 0.75) {
      lines.push(stroke(ellipsePoints(x, at, size, size * 0.55, { seed: next(), count: 8 }), size * 0.9, { tone: toneAt(depth), seed: id, start: 0.05, end: 0.1 }));
    } else {
      const reach = 4 + depth * 7;
      lines.push(stroke([[x - reach, at - reach * 0.4], [x, at], [x + reach * 0.8, at - reach * 0.5]], 0.6 + depth, { tone: toneAt(depth), seed: next(), start: 0.1, end: 0.6 }));
    }
  }

  // Stepping stones (tobi-ishi) from the path up to each station
  landmarks.forEach((at) => {
    [0.07, 0.15].forEach((depth, index) => {
      const radius = 14 + depth * 70;
      const x = at + 40 - index * 22 - OBLIQUE * (y(depth) - lane.back) * 0.3;
      washes.push(stroke([[x - radius * 0.7, y(depth)], [x + radius * 0.7, y(depth)]], radius * 0.36, { tone: 'mist', filter: 'wash', seed: next() }));
      lines.push(stroke(ellipsePoints(x, y(depth), radius, radius * 0.3, { from: 0.2, sweep: 4.4, count: 12, seed: next() }), lineAt(depth), { tone: 'soft', seed: id, start: 0.08, end: 0.3 }));
    });
  });

  // Puddles: a still pool of pale wash with two paper glints, like rain left on the stones
  for (let i = 0; i < Math.max(2, Math.round(width / 3200)); i++) {
    const x = width * ((i + 0.35 + random() * 0.3) / Math.max(2, Math.round(width / 3200)));
    const depth = 0.5 + random() * 0.25;
    const at = y(depth);
    const radius = 50 + random() * 40;
    washes.push(stroke([[x - radius, at], [x - radius * 0.2, at + 1], [x + radius, at]], radius * 0.24, { tone: 'wash', filter: 'wash', seed: next(), start: 0.2, end: 0.2 }));
    lines.push(stroke([[x - radius * 0.5, at - 2], [x + radius * 0.1, at - 3]], 1.2, { tone: 'paper', seed: next(), filter: 'none' }));
    lines.push(stroke([[x - radius * 0.1, at + 3], [x + radius * 0.5, at + 2]], 0.9, { tone: 'paper', seed: next(), filter: 'none' }));
  }

  // The back wall of the stage: low bamboo fences and the odd stone lantern in the quiet stretches
  gaps.forEach(([from, to], index) => {
    const room = to - from;
    if (index % 3 === 1 && room > 120) {
      lanterns.push(from + room * (0.3 + random() * 0.4));
      return;
    }
    if (room < 220) return;
    const length = Math.min(room - 80, 160 + random() * 200);
    const start = from + (room - length) * random();
    lines.push(...bambooFence(start, start + length, lane.back, next()));
    id += 40;
  });

  // Rocks at the back of the floor, and the grass that rims both edges
  rocks.forEach((rockX, index) => {
    const base = y(0.04);
    lines.push(stroke([[rockX - 26, base], [rockX - 18, base - 18], [rockX, base - 26], [rockX + 18, base - 20], [rockX + 26, base]], 3, { seed: 500 + index, start: 0.02, end: 0.05 }));
    washes.push(stroke([[rockX - 18, base - 6], [rockX + 14, base - 8]], 9, { tone: 'wash', filter: 'wash', seed: 520 + index }));
  });
  blades.push(...grassTufts(width, lane.back, Math.round(width / 70), 5));
  for (let i = 0; i < width / 38; i++) {
    const x = random() * width;
    const base = y(0.92 + random() * 0.08) + 4;
    for (let b = 0; b < 3 + Math.floor(random() * 3); b++) {
      const lean = (random() - 0.5) * 30;
      const tall = 14 + random() * 26;
      blades.push(stroke([[x + b * 5, base], [x + b * 5 + lean * 0.4, base - tall * 0.6], [x + b * 5 + lean, base - tall]], 2.6, { tone: random() < 0.6 ? 'ink' : 'soft', seed: next(), start: 0.05, end: 0.7 }));
    }
  }

  const backEdge = stroke([[0, lane.back + 2], [width * 0.3, lane.back - 2], [width * 0.6, lane.back + 3], [width, lane.back]], 5, { seed: 11, dry: true, start: 0.005, end: 0.01 });
  return { strokes: [...washes, ...scumbles, backEdge, ...lines, ...blades], lanterns };
}

/** A yotsume-gaki: posts with two rails and tied knots, low enough to read as the back of the stage. */
function bambooFence(from: number, to: number, base: number, seed: number): Stroke[] {
  const random = seededRandom(seed);
  const strokes: Stroke[] = [];
  const posts = Math.max(3, Math.round((to - from) / 26));
  for (let i = 0; i <= posts; i++) {
    const x = from + ((to - from) * i) / posts;
    const end = i === 0 || i === posts;
    const tall = end ? 42 : 30 + random() * 4;
    strokes.push(stroke([[x, base + 1], [x + (random() - 0.5) * 1.5, base - tall]], end ? 4.2 : 2.2, { tone: 'soft', seed: seed + i, start: 0.02, end: 0.08 }));
    if (!end && i % 2) strokes.push(stroke([[x - 3, base - 25], [x + 3, base - 21]], 2, { tone: 'soft', seed: seed + 100 + i }));
  }
  [14, 25].forEach((height, index) =>
    strokes.push(stroke([[from - 4, base - height], [(from + to) / 2, base - height - 1 + random()], [to + 4, base - height]], 1.8, { tone: 'soft', seed: seed + 200 + index, start: 0.02, end: 0.04 }))
  );
  return strokes;
}

/** A small kasuga-style stone lantern standing on the back edge. */
function stoneLantern(x: number, base: number, seed: number): Stroke[] {
  // Grey stone in wash, edged by a few lines; only the roof gets full black, and the fire box keeps a paper window
  return [
    stroke([[x - 22, base + 1], [x + 22, base + 2]], 7, { tone: 'mist', filter: 'wash', seed }),
    stroke([[x - 12, base - 3], [x + 12, base - 3]], 5, { tone: 'wash', filter: 'wash', seed: seed + 1 }),
    stroke([[x, base - 8], [x, base - 29]], 8, { tone: 'mist', filter: 'wash', seed: seed + 2 }),
    stroke([[x - 8, base - 43], [x + 8, base - 43]], 14, { tone: 'wash', filter: 'wash', seed: seed + 3 }),
    stroke([[x - 12, base - 54], [x + 12, base - 54]], 5, { tone: 'wash', filter: 'wash', seed: seed + 4 }),
    stroke([[x - 15, base], [x - 14, base - 6], [x + 14, base - 6], [x + 15, base]], 2.2, { tone: 'soft', seed: seed + 5, start: 0.05, end: 0.05 }),
    stroke([[x - 5, base - 6], [x - 4, base - 30]], 1.8, { tone: 'soft', seed: seed + 6 }),
    stroke([[x + 5, base - 6], [x + 4, base - 30]], 2.2, { tone: 'soft', seed: seed + 7 }),
    stroke([[x - 6, base - 18], [x + 6, base - 18]], 1.3, { tone: 'soft', seed: seed + 8 }),
    stroke([[x - 13, base - 30], [x - 10, base - 35], [x + 10, base - 35], [x + 13, base - 30], [x - 13, base - 30]], 2, { tone: 'soft', seed: seed + 9, start: 0.05, end: 0.05 }),
    stroke([[x - 9, base - 35], [x - 9, base - 50]], 2, { tone: 'soft', seed: seed + 10 }),
    stroke([[x + 9, base - 35], [x + 9, base - 50]], 2.4, { tone: 'soft', seed: seed + 11 }),
    stroke([[x - 3.5, base - 46], [x + 3.5, base - 46]], 6, { tone: 'paper', filter: 'none', seed: seed + 12 }),
    stroke([[x - 18, base - 50], [x + 18, base - 50]], 1.6, { tone: 'soft', seed: seed + 13 }),
    stroke([[x - 23, base - 48], [x - 14, base - 53], [x - 6, base - 58], [x, base - 60], [x + 6, base - 58], [x + 14, base - 53], [x + 23, base - 48]], 3.6, { seed: seed + 14, start: 0.1, end: 0.1 }),
    stroke([[x, base - 60], [x, base - 62]], 2, { seed: seed + 15 }),
    stroke(ellipsePoints(x, base - 65, 2.8, 3.4, { seed: seed + 16, count: 10 }), 2, { seed: seed + 16 }),
  ];
}

// Props standing in the middle of the floor -------------------------------------------------------------------------

export interface FloorPropKind {
  /** The drawing's box; its base (where it meets the floor) is centred on `base`. */
  width: number;
  height: number;
  base: number;
  /** Tall props are walked around; low ones are hopped over. */
  tall: boolean;
  /** How deep its footprint reaches toward and away from the viewer, as depth. */
  band: number;
  /** Where a light can be lit inside it, in the drawing's units: the lantern's window. */
  light?: { x: number; y: number; radius: number };
  draw: (seed: number) => Stroke[];
}

const grow = (strokes: Stroke[], factor: number, [ox, oy]: Point): Stroke[] =>
  strokes.map((item) => ({ ...item, width: item.width * factor, points: item.points.map(([x, y]) => [ox + (x - ox) * factor, oy + (y - oy) * factor] as Point) }));

/** A soft wash where a prop rests on the stones, so it sits on the floor instead of floating over it. */
const restShadow = (x: number, base: number, reach: number, seed: number) =>
  stroke([[x - reach, base], [x, base + 1], [x + reach, base]], reach * 0.3, { tone: 'mist', filter: 'wash', seed, start: 0.3, end: 0.3 });

export const FLOOR_PROPS = {
  lantern: {
    width: 120,
    height: 172,
    base: 164,
    tall: true,
    band: 0.08,
    // The fire box window of stoneLantern grown 2.1 times about the base; move it when the drawing changes
    light: { x: 60, y: 67, radius: 34 },
    draw: (seed: number) => [restShadow(60, 164, 48, seed + 50), ...grow(stoneLantern(60, 164, seed), 2.1, [60, 164])],
  },
  basin: {
    width: 110,
    height: 64,
    base: 56,
    tall: false,
    band: 0.07,
    draw: (seed: number): Stroke[] => [
      restShadow(60, 56, 40, seed),
      // A tsukubai: a low stone bowl filled by a bamboo spout
      stroke([[34, 54], [29, 42], [33, 30], [60, 27], [87, 30], [91, 42], [86, 54]], 3.2, { tone: 'soft', seed: seed + 1, start: 0.05, end: 0.1 }),
      stroke([[38, 46], [60, 48], [82, 45]], 9, { tone: 'wash', filter: 'wash', seed: seed + 2 }),
      stroke(ellipsePoints(60, 31, 23, 5, { seed: seed + 3, count: 14 }), 1.8, { tone: 'soft', seed: seed + 3 }),
      stroke([[42, 31], [78, 31]], 5, { tone: 'wash', filter: 'none', seed: seed + 4 }),
      stroke([[12, 56], [13, 14]], 5.5, { seed: seed + 5, start: 0.02, end: 0.05 }),
      stroke([[8, 20], [30, 22], [48, 25]], 4, { tone: 'soft', seed: seed + 6, start: 0.02, end: 0.1 }),
      stroke([[50, 27], [50, 29]], 2.4, { tone: 'soft', seed: seed + 7 }),
    ],
  },
  bucket: {
    width: 60,
    height: 56,
    base: 50,
    tall: false,
    band: 0.06,
    draw: (seed: number): Stroke[] => [
      restShadow(30, 50, 22, seed),
      // An oke: a wooden tub with two hoops and a ladle resting in it
      stroke([[13, 20], [16, 50], [44, 50], [47, 20]], 2.6, { tone: 'soft', seed: seed + 1, start: 0.05, end: 0.05 }),
      stroke(ellipsePoints(30, 20, 17, 4, { seed: seed + 2, count: 12 }), 2, { tone: 'soft', seed: seed + 2 }),
      stroke([[22, 23], [23, 48]], 1, { tone: 'wash', seed: seed + 3 }),
      stroke([[37, 23], [36, 48]], 1, { tone: 'wash', seed: seed + 4 }),
      stroke([[14, 29], [30, 30], [46, 29]], 2.4, { seed: seed + 5 }),
      stroke([[15, 43], [30, 44], [45, 43]], 2.4, { seed: seed + 6 }),
      stroke([[34, 18], [50, 2]], 2, { tone: 'soft', seed: seed + 7, start: 0.05, end: 0.2 }),
      stroke([[18, 38], [42, 38]], 10, { tone: 'mist', filter: 'wash', seed: seed + 8 }),
    ],
  },
  stones: {
    width: 100,
    height: 46,
    base: 40,
    tall: false,
    band: 0.07,
    draw: (seed: number): Stroke[] => [
      restShadow(50, 40, 42, seed),
      stroke([[16, 40], [20, 24], [36, 15], [52, 19], [58, 40]], 3, { tone: 'soft', seed: seed + 1, start: 0.03, end: 0.08 }),
      stroke([[26, 30], [48, 29]], 10, { tone: 'wash', filter: 'wash', seed: seed + 2 }),
      stroke([[54, 40], [60, 30], [74, 26], [86, 32], [88, 40]], 2.6, { tone: 'soft', seed: seed + 3, start: 0.03, end: 0.08 }),
      stroke([[64, 36], [80, 35]], 6, { tone: 'mist', filter: 'wash', seed: seed + 4 }),
      ...grassTufts(30, 40, 2, seed + 5).map((item) => ({ ...item, points: item.points.map(([x, y]) => [x + 64, y] as Point) })),
    ],
  },
} satisfies Record<string, FloorPropKind>;

export type FloorPropName = keyof typeof FLOOR_PROPS;

/** A small flame painted in the lantern's window, its base at the origin. */
export const lanternFlame: Stroke[] = [
  stroke([[0, 0], [-3.2, -4], [-1.5, -9], [0.6, -14]], 3.4, { tone: 'soft', filter: 'none', seed: 4101, start: 0.1, end: 0.9 }),
  stroke([[0.4, -1], [1.8, -5], [0.4, -9]], 1.6, { tone: 'ink', filter: 'none', seed: 4102, start: 0.1, end: 0.8 }),
];

/** Short brush rays around a lit window, the way an ink drawing says "light": none fall on the pillar below. */
export function lanternRays(seed: number): Stroke[] {
  const random = seededRandom(seed);
  const rays: Stroke[] = [];
  for (let index = 0; index < 9; index++) {
    const angle = Math.PI * (0.95 + (index / 8) * 1.1) + (random() - 0.5) * 0.12;
    const from = 22 + random() * 4;
    const to = from + 8 + random() * 9;
    rays.push(stroke([[Math.cos(angle) * from, Math.sin(angle) * from], [Math.cos(angle) * to, Math.sin(angle) * to]], 1.3 + random() * 0.8, { tone: 'soft', filter: 'none', seed: seed + index, start: 0.2, end: 0.6 }));
  }
  return rays;
}
