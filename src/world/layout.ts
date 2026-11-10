// The world's map, in world units. It no longer depends on the window: the view zooms the whole world to the
// window's height, so every drawing can be painted once at build time (scripts/ink-bake) and only placed at runtime.
// Two maps exist, one for wide screens and one for narrow ones, because the readable cards differ in shape.
// This module runs at build time; the runtime reads its result from src/data/world.json.
import { projects } from '../data/content';
import { drawFloor, FLOOR_PROPS, ROW_DEPTHS, BACK_EDGE_DEPTH, type FloorPropName, type Lane } from '../lib/floor';
import { seededRandom } from '../lib/random';
import type { Stroke } from '../lib/brush';

export type StationName = 'hero' | 'varal' | 'line' | 'estante' | 'lectern' | 'atelie' | 'repos' | 'sobre' | 'house' | 'mail' | 'end' | 'desk';
export type SignName = 'varal' | 'estante' | 'atelie' | 'sobre';
export type LayoutName = 'wide' | 'narrow';

/** A piece placed in the world: left and top edges and size, in world units. Height is omitted when content sets it. */
export interface Box {
  x: number;
  y: number;
  width: number;
  height?: number;
}

export interface PropSpot {
  name: FloorPropName;
  x: number;
  depth: number;
  /** Seed of its drawing; also names its baked image. */
  seed: number;
}

export interface WorldLayout {
  name: LayoutName;
  /** The window size this map was designed for; the view zooms by the window's height over `height`. */
  width: number;
  height: number;
  viewport: number;
  ground: number;
  topbar: number;
  stations: Record<StationName, number>;
  boxes: {
    heroSheet: Box;
    heroText: Box;
    signs: Record<SignName, Box>;
    line: Box;
    house: Box;
    board: Box;
    lectern: Box;
    repos: Box;
    mail: Box;
    end: Box;
    desk: Box;
  };
  signScale: number;
  paperWidth: number;
  paperGap: number;
  reposColumns: number;
  noteWidth: number;
  /** Mel can't walk through the portrait's post. */
  portraitRight: number;
  rocks: number[];
  props: PropSpot[];
  /** The band the floor drawing covers, [top, bottom], and the foreground strip's width (it moves 1.45× faster). */
  floorBand: [number, number];
  frontWidth: number;
}

/** The reference windows: a common laptop and a common phone. */
const REFERENCE: Record<LayoutName, { viewport: number; height: number; topbar: number }> = {
  wide: { viewport: 1440, height: 900, topbar: 64 },
  narrow: { viewport: 390, height: 844, topbar: 104 },
};

/** Where the floor begins, as a share of the view's height: the quarter below is the walkable band. */
export const GROUND_SHARE = 0.73;
/** How far a hanging sign rises above the ground; the pole's foot is at the bottom of its box. */
export const SIGN_HEIGHT = 396;
/** The portrait's hanging scroll: drawn 1.35 times wider than painted, so its paper matches the portrait's shape. */
export const SCROLL_ASPECT = (700 / 1701) * 1.35;
/** How far the scroll's lower rod hangs above the ground. */
export const SCROLL_LIFT = 26;
/** Where the blank paper sits inside the board picture, as shares of its width and height. */
export const BOARD_PAPER = { left: 0.163, right: 0.839, top: 0.214, bottom: 0.73 };
/** The foreground grass and branches pass faster than the eye. */
export const FRONT_PARALLAX = 1.45;

export function buildLayout(name: LayoutName): WorldLayout {
  const { viewport, height, topbar } = REFERENCE[name];
  const ground = Math.round(height * GROUND_SHARE);
  const mobile = name === 'narrow';
  const stations = {} as Record<StationName, number>;
  let x = viewport * (mobile ? 0.06 : 0.07);

  const sheetHeight = Math.min(ground - topbar - 20 - SCROLL_LIFT, mobile ? 380 : 620);
  const sheetWidth = sheetHeight * SCROLL_ASPECT;
  const textWidth = Math.min(460, viewport * (mobile ? 0.84 : 0.4));
  const sheetTop = ground - sheetHeight - SCROLL_LIFT;
  let heroSheet: Box;
  let heroText: Box;
  stations.hero = 0;
  if (mobile) {
    heroText = { x, y: topbar + 24, width: textWidth };
    x += textWidth + 40;
    heroSheet = { x, y: sheetTop, width: sheetWidth, height: sheetHeight };
    x += sheetWidth + viewport * 0.3;
  } else {
    heroSheet = { x, y: sheetTop, width: sheetWidth, height: sheetHeight };
    x += sheetWidth + 86;
    heroText = { x, y: topbar + 36, width: textWidth };
    x += textWidth + viewport * 0.22;
  }
  const portraitRight = heroSheet.x + sheetWidth + 30;

  const signScale = Math.min(1, (ground - topbar - 16) / SIGN_HEIGHT);
  const sign = (at: number): Box => ({ x: at, y: ground - SIGN_HEIGHT, width: 200, height: 400 });
  const signs = {} as Record<SignName, Box>;

  stations.varal = x;
  signs.varal = sign(x);
  x += 300;

  const featuredCount = projects.filter((project) => project.featured).length;
  const paperWidth = Math.min(230, viewport * 0.56);
  const paperGap = 54;
  const lineWidth = featuredCount * (paperWidth + paperGap) + 100;
  const poleHeight = Math.min(ground - topbar - 60, 440);
  stations.line = x;
  const line = { x, y: ground - poleHeight, width: lineWidth, height: poleHeight };
  x += lineWidth + 180;

  stations.sobre = x;
  signs.sobre = sign(x);
  x += 300;

  const boardWidth = Math.min(560, viewport * 0.88);
  const boardHeight = Math.min(ground - topbar - 30, 560);
  const houseArt = mobile ? 0 : 300;
  stations.house = x;
  const house = { x, y: ground - boardHeight, width: houseArt + boardWidth, height: boardHeight };
  const board = { x: houseArt, y: 0, width: boardWidth, height: boardHeight };
  x += houseArt + boardWidth + viewport * 0.25;

  stations.estante = x;
  signs.estante = sign(x);
  x += 250;

  const lecternWidth = Math.min(340, viewport * 0.7);
  const lecternHeight = lecternWidth * (498 / 620);
  stations.lectern = x;
  const lectern = { x, y: ground - lecternHeight + 8, width: lecternWidth, height: lecternHeight };
  x += lecternWidth + viewport * 0.25;

  stations.atelie = x;
  signs.atelie = sign(x);
  x += 300;

  const reposColumns = mobile ? 2 : 4;
  const reposWidth = Math.min(reposColumns * 220 + 60, viewport * 0.92);
  // The stone feet stand in front of the ground line, which gives the walk its depth
  const paperShare = BOARD_PAPER.bottom - BOARD_PAPER.top;
  const boardFeet = ground + 60;
  const reposHeight = (boardFeet - topbar - 10) * paperShare;
  const reposMargin = (reposWidth * BOARD_PAPER.left) / (BOARD_PAPER.right - BOARD_PAPER.left);
  x += reposMargin;
  stations.repos = x;
  const repos = { x, y: boardFeet - (reposHeight * (1 - BOARD_PAPER.top)) / paperShare, width: reposWidth, height: reposHeight };
  x += reposWidth + reposMargin + viewport * 0.18;

  const noteWidth = Math.min(340, viewport * 0.62);
  stations.mail = x;
  const mail = { x, y: ground - 300, width: 130 + noteWidth, height: 300 };
  x += 130 + noteWidth + viewport * 0.3;

  stations.end = x;
  const end = { x, y: ground - 330, width: 260 };
  x += Math.max(viewport * 0.75, 460);

  stations.desk = x;
  const desk = { x, y: ground - 200, width: 340, height: 200 };
  x += 260 + viewport * 0.35;

  const width = Math.round(Math.max(x, viewport * 2));
  const random = seededRandom(width);
  const rocks = [
    stations.varal - viewport * 0.1,
    stations.line + lineWidth * 0.5,
    stations.estante - 120,
    stations.atelie - 110,
    stations.sobre - 90,
    stations.mail - 120,
    stations.end - viewport * 0.15,
    stations.desk - 160,
  ].map((value) => value + random() * 40);

  const boxes = { heroSheet, heroText, signs, line, house, board, lectern, repos, mail, end, desk };
  const lane: Lane = { back: ground, front: height };
  const { lanterns } = floorPlan({ width, lane, boxes, signScale, rocks, reposMargin });
  const props = placeProps({ width, viewport, stations, backLanterns: lanterns, mobile });

  return {
    name,
    width,
    height,
    viewport,
    ground,
    topbar,
    stations,
    boxes,
    signScale,
    paperWidth,
    paperGap,
    reposColumns,
    noteWidth,
    portraitRight,
    rocks,
    props,
    floorBand: [ground - 64, height + 16],
    frontWidth: Math.round(viewport + (width - viewport) * FRONT_PARALLAX),
  };
}

interface FloorInputs {
  width: number;
  lane: Lane;
  boxes: WorldLayout['boxes'];
  signScale: number;
  rocks: number[];
  reposMargin: number;
}

/** The floor drawing of a finished map (the baker paints it; buildLayout only needs where its lanterns went). */
export function floorOf(layout: WorldLayout) {
  const reposMargin = (layout.boxes.repos.width * BOARD_PAPER.left) / (BOARD_PAPER.right - BOARD_PAPER.left);
  return floorPlan({ width: layout.width, lane: { back: layout.ground, front: layout.height }, boxes: layout.boxes, signScale: layout.signScale, rocks: layout.rocks, reposMargin }).strokes;
}

/** The floor drawing for a map: stepping stones lead to the stations, and fences fill the empty back edge. */
export function floorPlan({ width, lane, boxes, signScale, rocks, reposMargin }: FloorInputs): { strokes: Stroke[]; lanterns: number[] } {
  const signWidth = 200 * signScale;
  const occupied: [number, number][] = [
    [boxes.heroSheet.x, boxes.heroSheet.x + boxes.heroSheet.width + 40],
    [boxes.heroText.x, boxes.heroText.x + boxes.heroText.width],
    ...Object.values(boxes.signs).map((box) => [box.x, box.x + signWidth] as [number, number]),
    [boxes.line.x, boxes.line.x + boxes.line.width],
    [boxes.house.x, boxes.house.x + boxes.house.width],
    [boxes.lectern.x, boxes.lectern.x + boxes.lectern.width],
    [boxes.repos.x - reposMargin, boxes.repos.x + boxes.repos.width + reposMargin],
    [boxes.mail.x, boxes.mail.x + boxes.mail.width],
    [boxes.end.x, boxes.end.x + boxes.end.width],
    [boxes.desk.x, boxes.desk.x + boxes.desk.width],
  ]
    .map(([from, to]) => [from - 50, to + 50] as [number, number])
    .sort((a, b) => a[0] - b[0]);
  const gaps: [number, number][] = [];
  let freeFrom = 0;
  occupied.forEach(([from, to]) => {
    if (from - freeFrom > 100) gaps.push([freeFrom, from]);
    freeFrom = Math.max(freeFrom, to);
  });
  if (width - freeFrom > 100) gaps.push([freeFrom, width]);
  const landmarks = [boxes.house, boxes.lectern, boxes.mail, boxes.desk].map((box) => box.x + Math.max(60, box.width / 2));
  return drawFloor({ width, lane, landmarks, gaps, rocks });
}

/** Props in the middle of the floor: every third a lantern, each on the centre line of a row of flagstones, and none
 * in front of the pieces people click on. Lanterns also stand in the gaps of the back edge. */
function placeProps({ width, viewport, stations, backLanterns, mobile }: { width: number; viewport: number; stations: Record<StationName, number>; backLanterns: number[]; mobile: boolean }): PropSpot[] {
  const random = seededRandom(4242);
  const names = Object.keys(FLOOR_PROPS) as FloorPropName[];
  const keepClear = [stations.house, stations.lectern, stations.repos, stations.mail, stations.desk];
  const spots: Omit<PropSpot, 'seed'>[] = backLanterns.map((x) => ({ x, name: 'lantern', depth: BACK_EDGE_DEPTH }));
  for (let x = viewport * (mobile ? 1.6 : 1.15), index = 0; x < width - viewport * 0.4; x += 650 + random() * 650, index++) {
    const drawn = names[Math.floor(random() * names.length)];
    const row = ROW_DEPTHS[Math.floor(random() * ROW_DEPTHS.length)];
    if (keepClear.some((at) => x > at - 160 && x < at + 420)) continue;
    spots.push({ x, name: index % 3 === 0 ? 'lantern' : drawn, depth: row });
  }
  return spots.map((spot, index) => ({ ...spot, x: Math.round(spot.x), seed: 3000 + index * 20 }));
}
