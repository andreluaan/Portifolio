import atlas from '../data/mel-atlas.json';
import type { Point } from './brush';

/** Mel's skeleton, fitted to the cut-out drawing in `src/data/mel-atlas.json`: a 200×160 box with paws on y = 150.
 * Pivots share this space, so a bone's transform is a chain of rotations around these rest points. */
export const DOG_VIEW = { width: 200, height: 160, ground: 150 } as const;

export const PIVOTS = {
  body: [78, 118] as Point,
  /** Where the spine bends: chest ahead of it, hips behind. */
  spine: [80, 110] as Point,
  neck: [108, 102.6] as Point,
  skull: [122, 88] as Point,
  jaw: [134, 96] as Point,
  nearEar: [105.2, 72.4] as Point,
  farEar: [126.8, 68.4] as Point,
  tail: [[49.2, 123.6], [46, 128.4], [39.6, 134.8], [34.8, 139.6], [31.3, 142.8]] as Point[],
};

/** Rest rotation of each ear in degrees (0 points straight up, positive is clockwise). */
export const EAR_REST = { near: -63, far: 56 };

export type LegName = 'nearRear' | 'farRear' | 'nearFront' | 'farFront';

/** A leg's joints in the drawing (hip or shoulder → knee or elbow → hock or wrist → toes), and what the two-bone IK
 * needs from them. `bend` is the side the middle joint folds to: hind stifles forward, front elbows back. */
export interface LegRig {
  root: Point;
  mid: Point;
  end: Point;
  toe: Point;
  upper: number;
  lower: number;
  upperRest: number;
  lowerRest: number;
  bend: 1 | -1;
  rear: boolean;
}

const degrees = (radians: number) => (radians * 180) / Math.PI;

function legRig(chain: number[][], rear: boolean, shift: Point = [0, 0]): LegRig {
  const [root, mid, end, toe] = chain.map(([x, y]) => [x + shift[0], y + shift[1]] as Point);
  const upperRest = degrees(Math.atan2(mid[1] - root[1], mid[0] - root[0]));
  const reach = degrees(Math.atan2(end[1] - root[1], end[0] - root[0]));
  return {
    root, mid, end, toe, rear, upperRest,
    upper: Math.hypot(mid[0] - root[0], mid[1] - root[1]),
    lower: Math.hypot(end[0] - mid[0], end[1] - mid[1]),
    lowerRest: degrees(Math.atan2(end[1] - mid[1], end[0] - mid[0])),
    bend: upperRest < reach ? -1 : 1,
  };
}

/** The far front leg hides behind the near one in the drawing; it reuses that leg a step behind. */
export const FAR_FRONT_SHIFT: Point = [-3.5, 0.6];

export const LEG_RIGS: Record<LegName, LegRig> = {
  nearRear: legRig(atlas.parts['leg.nearRear'].chain, true),
  farRear: legRig(atlas.parts['leg.farRear'].chain, true),
  nearFront: legRig(atlas.parts['leg.nearFront'].chain, false),
  farFront: legRig(atlas.parts['leg.nearFront'].chain, false, FAR_FRONT_SHIFT),
};

export type Bone =
  | 'body' | 'chest' | 'hips' | 'head' | 'skull' | 'jaw' | 'earNear' | 'earFar' | 'tail0' | 'tail1' | 'tail2' | 'tail3'
  | `${LegName}.${'upper' | 'lower' | 'paw'}`;

/** The eyes in the drawing (rig space, measured from its darkest pixels), so lids can blink over them. `lid` is the
 * grey of the fur just above each eye. */
export const EYES = {
  near: { cx: 120.5, cy: 83.1, rx: 5.2, ry: 4.4, lid: 0x3a3b38 },
  far: { cx: 137.2, cy: 78.6, rx: 2.5, ry: 3.4, lid: 0x2a2b29 },
};
