import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { projects } from '../data/content';
import { frameAll, inkSplat, prefersReducedMotion, renderScene, roughRect, seededRandom, stroke, svgElement, type Point, type Stroke } from './brush';
import { openBook, openCharacterSheet, openNotebook } from './dialogs';
import { paintPortrait } from './effects';
import { pick, t } from './i18n';
import { BACK_EDGE_DEPTH, depthAt, depthScale, drawFloor, FLOOR_PROPS, LANE_DEPTH, lanternFlame, lanternRays, laneY, ROW_DEPTHS, type FloorPropKind, type FloorPropName, type Lane } from './floor';
import { Mascot } from './mascot';
import { Mel } from './mel';
import type { InkPainter } from './painting';
import roll from '../data/rolo.json';
import { deskObjects, foregroundBranch, sketchFor, worldProps } from './scenes';
import { unlock } from './secrets';
import { attributeBars, portraits } from './sections';
import { sounds } from './sound';

export type StationName = 'hero' | 'varal' | 'line' | 'estante' | 'lectern' | 'atelie' | 'repos' | 'sobre' | 'house' | 'mail' | 'end' | 'desk';

interface WorldLayout {
  width: number;
  viewport: number;
  height: number;
  ground: number;
  rocks: number[];
  stations: Record<StationName, number>;
}

/** The painting moves as far as its own length asks; around it, mist drifts between it and the ground, and the
 * foreground grass and branches pass faster than the eye. */
const PARALLAX = { mist: 0.3, ground: 1, front: 1.45 };

interface Mood {
  mist: number;
  veil: number;
  dusk: number;
}
/** Morning: clear and pale. Fog: the painting half gone behind the paper. Dusk: the whole sheet deepening from the top. */
const MOODS: Mood[] = [
  { mist: 0, veil: 0, dusk: 0 },
  { mist: 0, veil: 0, dusk: 0 },
  { mist: 0, veil: 0, dusk: 0 },
];
/** Where the floor begins, as a share of the view's height: the quarter below is the walkable band. */
const GROUND_SHARE = 0.73;
/** Depth crossed per second while walking up or down the floor, and world pixels per second walking sideways. */
const DEPTH_SPEED = 0.75;
const SIDE_SPEED = 620;
const NAV_STATIONS: StationName[] = ['hero', 'line', 'house', 'lectern', 'repos', 'mail'];

/** How far a hanging sign rises above the ground; the pole's foot is at the bottom of its box. */
const SIGN_HEIGHT = 396;
/** The portrait's hanging scroll: drawn 1.35 times wider than painted, so its paper matches the portrait's shape. */
const SCROLL_ASPECT = (700 / 1701) * 1.35;
/** How far the scroll's lower rod hangs above the ground. */
const SCROLL_LIFT = 26;
/** Where the blank paper sits inside the board picture, as shares of its width and height. */
const BOARD_PAPER = { left: 0.163, right: 0.839, top: 0.214, bottom: 0.73 };

function place(element: HTMLElement, x: number, styles: Partial<CSSStyleDeclaration> = {}) {
  element.style.left = `${x}px`;
  Object.assign(element.style, styles);
}

const $ = <T extends Element = HTMLElement>(root: ParentNode, selector: string) => root.querySelector<T>(selector)! as T;

export function mountWorld(scrollTo: (y: number, immediate?: boolean) => void) {
  const root = document.querySelector<HTMLElement>('.mundo')!;
  const pin = $(root, '.mundo-pin');
  const layers = {
    roll: $(root, '.mundo-roll'),
    mist: $(root, '.mundo-mists'),
    ground: $(root, '.mundo-ground'),
    front: $(root, '.mundo-front'),
  };
  const sky = $(root, '.mundo-sky');
  const veil = $(root, '.mundo-veil');
  const rollPainting = $(layers.roll, '.mundo-plane');
  const mists = [...root.querySelectorAll<HTMLElement>('.mundo-mist')];
  const groundArt = $<SVGSVGElement>(root, '.mundo-ground-art');
  const heroSheet = $(root, '.station-hero-sheet');
  const heroText = $(root, '.station-hero-text');
  const signs = {
    varal: $(root, '[data-sign="varal"]'),
    estante: $(root, '[data-sign="estante"]'),
    atelie: $(root, '[data-sign="atelie"]'),
    sobre: $(root, '[data-sign="sobre"]'),
  };
  const signSeeds = { varal: 1310, estante: 1320, atelie: 1330, sobre: 1340 };

  /** Shrinks a sign's label until it fits the plank, since translations and late fonts change its width. */
  function fitSignLabels() {
    Object.values(signs).forEach((sign) => {
      const label = $(sign, '.station-sign-label');
      label.style.fontSize = '';
      const range = document.createRange();
      range.selectNodeContents(label);
      const textWidth = range.getBoundingClientRect().width;
      const room = label.clientWidth - 8;
      if (textWidth > room) label.style.fontSize = `${(parseFloat(getComputedStyle(label).fontSize) * room) / textWidth}px`;
    });
  }

  function drawSign(name: keyof typeof signs, animate = false) {
    renderScene($<SVGSVGElement>(signs[name], 'svg'), worldProps.signpost(signSeeds[name]), { animate });
  }
  const repos = $(root, '.station-repos');
  const mail = $(root, '.station-mail');
  const line = $(root, '.station-line');
  const lineArt = $<SVGSVGElement>(root, '.station-line-art');
  const papersHost = $(root, '.station-line-papers');
  const lectern = $(root, '.station-lectern');
  const house = $(root, '.station-house');
  const board = $(root, '.station-board');
  const boardBody = $(root, '.station-board-body');
  const end = $(root, '.station-end');
  const desk = $(root, '.station-desk');
  const progressSvg = $<SVGSVGElement>(root, '.mundo-progress svg');
  const mascotLayer = $(root, '.mundo-mascot-layer');
  const paintCanvas = $<HTMLCanvasElement>(root, '.mundo-paint');
  const paintingBar = $(root, '.mundo-painting-bar');
  const brushCursor = $(root, '.mundo-brush-cursor');
  const reduced = prefersReducedMotion();
  const revealed = new Set<StationName>();
  const sectionListeners = new Set<(name: StationName) => void>();

  let world: WorldLayout;
  let progressFill: SVGGElement;
  let trigger: ScrollTrigger | undefined;
  let previousRockX: number[] = [];
  let rollTiles: HTMLImageElement[] = [];
  let rollSource = 0;
  let rollTravel = 0;
  let mascotX = 0;
  let activeSection: StationName = 'hero';
  let inkSpilled = false;
  let settleOnStop: (() => void) | null = null;
  // Mel's place on the floor's depth axis (see floor.ts), and how far the world has scrolled under her
  let depth = LANE_DEPTH.start;
  let depthGoal = depth;
  let worldOffset = 0;
  let scrollVelocity = 0;
  const lane = (): Lane => ({ back: world.ground, front: world.height });

  // The content itself comes rendered in the page's language; the world adds the drawings and what clicks do
  function hydrateBoard() {
    $(boardBody, '[data-open-sheet]').addEventListener('click', () => void openCharacterSheet());
    return attributeBars(boardBody);
  }

  function hydratePapers() {
    papersHost.querySelectorAll<HTMLButtonElement>('.line-paper').forEach((paper) => {
      const id = paper.dataset.project!;
      const svg = paper.querySelector('svg')!;
      renderScene(svg, sketchFor(id));
      paper.addEventListener('mouseenter', () => {
        renderScene(svg, sketchFor(id), { animate: true, pace: 1.8 });
        sounds.paper();
      });
      paper.addEventListener('click', () => void openBook(id));
    });
  }

  // Layout
  function buildWorld(): WorldLayout {
    const viewport = pin.clientWidth;
    const height = pin.clientHeight;
    const ground = Math.round(height * GROUND_SHARE);
    const mobile = viewport < 700;
    const topbar = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--topbar-height')) || 64;
    const stations = {} as Record<StationName, number>;
    let x = viewport * (mobile ? 0.06 : 0.07);

    const sheetHeight = Math.min(ground - topbar - 20 - SCROLL_LIFT, mobile ? 380 : 620);
    const sheetWidth = sheetHeight * SCROLL_ASPECT;
    const textWidth = Math.min(460, viewport * (mobile ? 0.84 : 0.4));
    stations.hero = 0;
    // Mel's invisible wall: the portrait's right edge, wherever the layout puts it
    let portraitRight: number;
    if (mobile) {
      place(heroText, x, { width: `${textWidth}px`, top: `${topbar + 24}px` });
      x += textWidth + 40;
      place(heroSheet, x, { width: `${sheetWidth}px`, height: `${sheetHeight}px`, top: `${ground - sheetHeight - SCROLL_LIFT}px` });
      portraitRight = x + sheetWidth + 30;
      x += sheetWidth + viewport * 0.3;
    } else {
      place(heroSheet, x, { width: `${sheetWidth}px`, height: `${sheetHeight}px`, top: `${ground - sheetHeight - SCROLL_LIFT}px` });
      portraitRight = x + sheetWidth + 30;
      x += sheetWidth + 86;
      place(heroText, x, { width: `${textWidth}px`, top: `${topbar + 36}px` });
      x += textWidth + viewport * 0.22;
    }

    stations.varal = x;
    place(signs.varal, x, { top: `${ground - SIGN_HEIGHT}px` });
    x += 300;

    const featuredCount = projects.filter((project) => project.featured).length;
    const paperWidth = Math.min(230, viewport * 0.56);
    const gap = 54;
    const lineWidth = featuredCount * (paperWidth + gap) + 100;
    const poleHeight = Math.min(ground - topbar - 60, 440);
    stations.line = x;
    place(line, x, { width: `${lineWidth}px`, top: `${ground - poleHeight}px`, height: `${poleHeight}px` });
    line.style.setProperty('--paper-width', `${paperWidth}px`);
    line.style.setProperty('--paper-gap', `${gap}px`);
    x += lineWidth + 180;

    stations.sobre = x;
    place(signs.sobre, x, { top: `${ground - SIGN_HEIGHT}px` });
    x += 300;

    const boardWidth = Math.min(560, viewport * 0.88);
    const boardHeight = Math.min(ground - topbar - 30, 560);
    stations.house = x;
    place(house, x, { top: `${ground - boardHeight}px`, height: `${boardHeight}px`, width: `${(mobile ? 0 : 300) + boardWidth}px` });
    board.style.width = `${boardWidth}px`;
    board.style.height = `${boardHeight}px`;
    x += (mobile ? 0 : 300) + boardWidth + viewport * 0.25;

    stations.estante = x;
    place(signs.estante, x, { top: `${ground - SIGN_HEIGHT}px` });
    x += 250;

    const lecternWidth = Math.min(340, viewport * 0.7);
    const lecternHeight = lecternWidth * (498 / 620);
    stations.lectern = x;
    place(lectern, x, { top: `${ground - lecternHeight + 8}px`, width: `${lecternWidth}px`, height: `${lecternHeight}px` });
    x += lecternWidth + viewport * 0.25;

    stations.atelie = x;
    place(signs.atelie, x, { top: `${ground - SIGN_HEIGHT}px` });
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
    place(repos, x, { top: `${boardFeet - (reposHeight * (1 - BOARD_PAPER.top)) / paperShare}px`, width: `${reposWidth}px`, height: `${reposHeight}px` });
    repos.style.setProperty('--repo-columns', String(reposColumns));
    x += reposWidth + reposMargin + viewport * 0.18;

    const noteWidth = Math.min(340, viewport * 0.62);
    stations.mail = x;
    place(mail, x, { top: `${ground - 300}px`, width: `${130 + noteWidth}px`, height: '300px' });
    mail.style.setProperty('--note-width', `${noteWidth}px`);
    x += 130 + noteWidth + viewport * 0.3;

    stations.end = x;
    place(end, x, { top: `${ground - 330}px` });
    x += Math.max(viewport * 0.75, 460);

    stations.desk = x;
    place(desk, x, { top: `${ground - 200}px` });
    x += 260 + viewport * 0.35;

    const signScale = Math.min(1, (ground - topbar - 16) / SIGN_HEIGHT);
    Object.values(signs).forEach((sign) => (sign.style.scale = String(signScale)));

    const width = Math.max(x, viewport * 2);
    const random = seededRandom(Math.round(width));
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

    return { width, viewport, height, ground, rocks, stations, portraitRight };
  }

  /** The background is one painting (see prototipo/rolo/paint.py). Its ground band lines up with the world's ground,
   * and it always travels its whole length during the walk, whatever the size of the window. */
  function drawRoll() {
    const { viewport, ground } = world;
    const scale = Math.max(ground / (roll.height * 0.8), (viewport * 1.4) / roll.width);
    const shownHeight = roll.height * scale;
    const shownTile = roll.tileWidth * scale;
    rollTravel = roll.width * scale - viewport;
    const wanted = shownHeight * Math.min(window.devicePixelRatio || 1, 2);
    const preloaded = Number(document.documentElement.dataset.roll);
    // The first draw takes the size Base.astro already preloaded, so the painting is never fetched twice
    const source = !rollSource && roll.sizes.includes(preloaded)
      ? preloaded
      : roll.sizes.find((size) => size >= wanted) ?? roll.sizes[roll.sizes.length - 1];
    if (rollSource !== source) {
      rollSource = source;
      rollTiles = Array.from({ length: roll.tiles }, (_, index) => {
        const tile = new Image();
        tile.alt = '';
        tile.decoding = 'async';
        // Only the opening is on screen at first; the rest of the scroll loads as the walk nears it
        tile.loading = index < 2 ? 'eager' : 'lazy';
        if (index === 0) tile.fetchPriority = 'high';
        tile.src = `/images/rolo/scroll-${source}-${index}.webp`;
        return tile;
      });
      rollPainting.replaceChildren(...rollTiles);
    }
    rollTiles.forEach((tile, index) => Object.assign(tile.style, { left: `${index * shownTile}px`, width: `${shownTile + 1}px`, height: `${shownHeight}px` }));
    rollPainting.style.top = `${ground - shownHeight * 0.8}px`;
    rollPainting.style.setProperty('--painting-height', `${shownHeight}px`);
    layers.roll.style.width = `${roll.width * scale}px`;
    mists.forEach((mist, index) => {
      const period = index ? 1000 : 1400;
      Object.assign(mist.style, { top: `${ground * (index ? 0.6 : 0.42)}px`, height: `${period * 0.15}px`, backgroundSize: `${period}px 100%` });
      mist.style.setProperty('--drift-by', `-${period}px`);
    });
  }

  function drawLayers() {
    const { width, viewport, height, ground, rocks } = world;
    const layerWidth = (factor: number) => viewport + (width - viewport) * factor;

    drawRoll();

    layers.ground.style.width = `${width}px`;
    groundArt.setAttribute('viewBox', `0 0 ${width} ${height}`);
    // The back edge is free wherever no station stands on it: that is where fences and lanterns go
    // Some stations are zero-sized boxes around their pieces, so the pieces are measured too
    const layerLeft = layers.ground.getBoundingClientRect().left;
    const occupied = [...layers.ground.querySelectorAll<HTMLElement>(':scope > .mundo-station, :scope > .mundo-station > *')]
      .map((piece) => piece.getBoundingClientRect())
      .filter((box) => box.width > 0)
      .map((box) => [box.left - layerLeft - 50, box.right - layerLeft + 50] as [number, number])
      .sort((a, b) => a[0] - b[0]);
    const gaps: [number, number][] = [];
    let freeFrom = viewport * 0.02;
    occupied.forEach(([from, to]) => {
      if (from - freeFrom > 100) gaps.push([freeFrom, from]);
      freeFrom = Math.max(freeFrom, to);
    });
    if (width - freeFrom > 100) gaps.push([freeFrom, width]);
    const landmarks = [house, lectern, mail, desk].map((station) => station.offsetLeft + Math.max(60, station.offsetWidth / 2));
    const floor = drawFloor({ width, lane: lane(), landmarks, gaps, rocks });
    renderScene(groundArt, floor.strokes);
    backLanterns = floor.lanterns;

    const frontWidth = layerWidth(PARALLAX.front);
    const front = $<SVGSVGElement>(layers.front, 'svg');
    layers.front.style.width = `${frontWidth}px`;
    front.setAttribute('viewBox', `0 0 ${frontWidth} ${height}`);
    const random = seededRandom(77);
    const blades: Stroke[] = [];
    for (let i = 0; i < frontWidth / 160; i++) {
      const x = random() * frontWidth;
      const tall = 34 + random() * 60;
      blades.push(stroke([[x, height + 10], [x + 10, height - tall * 0.5], [x + 26 * (random() - 0.3), height - tall]], 7 + random() * 6, { seed: 700 + i, start: 0.05, end: 0.8, tone: random() > 0.5 ? 'ink' : 'soft' }));
    }
    // A few pine branches hang in from the top edge along the way, close to the eye
    [0.18, 0.47, 0.81].forEach((at, index) => {
      const bx = at * frontWidth;
      foregroundBranch(830 + index * 17, viewport < 700 ? 260 : 380).forEach((item) => blades.push({ ...item, points: item.points.map(([x, y]) => [x + bx, y - 6] as Point) }));
    });
    renderScene(front, blades);

    sky.replaceChildren();
    for (let i = 0; i < 4; i++) {
      const cloud = svgElement('svg', { class: 'ink mundo-cloud', viewBox: '0 0 200 40', 'aria-hidden': 'true' });
      cloud.style.left = `${10 + i * 26}%`;
      cloud.style.top = `${16 + (i % 2) * 10}%`;
      cloud.style.setProperty('--drift', `${40 + i * 12}s`);
      renderScene(cloud, worldProps.cloud(40 + i));
      sky.append(cloud);
    }
    for (let i = 0; i < 3; i++) {
      const bird = svgElement('svg', { class: 'ink mundo-bird', viewBox: '0 0 30 12', 'aria-hidden': 'true' });
      bird.style.top = `${22 + i * 4}%`;
      bird.style.setProperty('--fly', `${18 + i * 5}s`);
      bird.style.animationDelay = `${-i * 6}s`;
      renderScene(bird, worldProps.bird(60 + i));
      sky.append(bird);
    }
  }

  /** The mailbox rocks on its post, to say a note went in (or that one could). */
  function nudgeMailbox() {
    if (reduced) return;
    gsap.fromTo($(mail, '.station-mail-art'), { rotation: -5 }, { rotation: 0, duration: 1.1, ease: 'elastic.out(1.2, 0.25)', transformOrigin: '50% 100%' });
  }

  function drawStations() {
    const sheet = { width: heroSheet.offsetWidth, height: heroSheet.offsetHeight };
    const frame = $<SVGSVGElement>(heroSheet, '.station-hero-frame');
    // The scroll hangs from the arm of a slim post that stands on the ground beside it
    frame.setAttribute('viewBox', `0 0 ${sheet.width + 40} ${sheet.height + SCROLL_LIFT}`);
    renderScene(frame, [
      stroke([[sheet.width + 22, 0], [sheet.width + 24, sheet.height + SCROLL_LIFT]], 5, { seed: 1206, start: 0.02, end: 0.05 }),
      stroke([[sheet.width / 2 - 10, 3], [sheet.width * 0.8, 1], [sheet.width + 30, 4]], 3, { seed: 1207, start: 0.05, end: 0.02 }),
      stroke([[sheet.width + 4, sheet.height + SCROLL_LIFT - 2], [sheet.width + 40, sheet.height + SCROLL_LIFT]], 9, { tone: 'mist', filter: 'wash', seed: 1208 }),
    ]);
    (Object.keys(signs) as (keyof typeof signs)[]).forEach((name) => drawSign(name));

    const lineBox = { width: line.clientWidth, height: line.clientHeight };
    lineArt.setAttribute('viewBox', `0 0 ${lineBox.width} ${lineBox.height}`);
    const sag: Point[] = [];
    for (let i = 0; i <= 10; i++) sag.push([18 + ((lineBox.width - 36) * i) / 10, 16 + Math.sin((Math.PI * i) / 10) * 30]);
    renderScene(lineArt, [
      ...worldProps.pole(1401, lineBox.height + 4).map((item) => ({ ...item, points: item.points.map(([x, y]) => [x + 4, y] as Point) })),
      ...worldProps.pole(1403, lineBox.height + 4).map((item) => ({ ...item, points: item.points.map(([x, y]) => [x + lineBox.width - 28, y] as Point) })),
      stroke(sag, 1.6, { seed: 1405, start: 0.01, end: 0.01 }),
    ]);

    const note = $(mail, '.station-mail-note');
    const noteFrame = $<SVGSVGElement>(mail, '.station-mail-note-frame');
    noteFrame.setAttribute('viewBox', `0 0 ${note.offsetWidth} ${note.offsetHeight}`);
    renderScene(noteFrame, roughRect(3, 3, note.offsetWidth - 6, note.offsetHeight - 6, 1.8, 2720));

    const boardRect = { width: board.offsetWidth, height: board.offsetHeight };
    const boardFrame = $<SVGSVGElement>(board, '.station-board-frame');
    boardFrame.setAttribute('viewBox', `0 0 ${boardRect.width} ${boardRect.height}`);
    renderScene(boardFrame, roughRect(4, 4, boardRect.width - 8, boardRect.height - 8, 2.4, 1601));
    renderScene($<SVGSVGElement>(end, 'svg'), worldProps.enso(1700));

    renderScene($<SVGSVGElement>(desk, '.desk-ink svg'), deskObjects.inkBottle);
    renderScene($<SVGSVGElement>(desk, '.desk-brush svg'), deskObjects.brush);

    progressSvg.replaceChildren();
    const base = svgElement('g', {}, progressSvg);
    renderScene(base as unknown as SVGElement, [stroke([[2, 10], [200, 9], [398, 10]], 1.4, { tone: 'mist', seed: 1801, start: 0.01, end: 0.01 })]);
    progressFill = svgElement('g', { class: 'mundo-progress-fill' }, progressSvg);
    renderScene(progressFill as unknown as SVGElement, [stroke([[2, 10], [200, 8], [398, 10]], 6, { seed: 1802, dry: true, start: 0.01, end: 0.02 })]);
    NAV_STATIONS.forEach((name, index) => {
      const x = 2 + Math.min(1, scrollOffsetFor(name) / (world.width - world.viewport)) * 396;
      renderScene(svgElement('g', {}, progressSvg) as unknown as SVGElement, [stroke([[x, 3], [x, 17]], 2, { seed: 1810 + index })]);
    });
  }

  let boardBars: ReturnType<typeof attributeBars> | null = null;
  const reveals: Partial<Record<StationName, () => void>> = {
    hero: () => paintPortrait($<SVGSVGElement>(heroSheet, '.station-hero-painting'), { ...portraits.profile, animate: true, delay: 0.2 }),
    varal: () => {
      drawSign('varal', true);
      // Once the visitor is walking, Mel tells them the floor goes back and forth too
      window.setTimeout(() => mel.say(t('mundo.depth'), 3600), 900);
    },
    atelie: () => drawSign('atelie', true),
    repos: () => {
      mel.say(pick({ pt: 'quanto código!', en: 'so much code!' }));
      if (reduced) return;
      gsap.fromTo(repos.querySelectorAll('.repo-card'), { y: -30, autoAlpha: 0 }, { y: 0, autoAlpha: 1, duration: 0.7, stagger: 0.06, ease: 'back.out(2)', clearProps: 'transform,opacity,visibility' });
    },
    mail: () => {
      mel.say(pick({ pt: 'deixa um recado!', en: 'leave a note!' }));
      nudgeMailbox();
    },
    line: () => {
      if (reduced) return;
      gsap.fromTo(papersHost.children, { rotation: -70, autoAlpha: 0 }, { rotation: 0, autoAlpha: 1, duration: 1.1, stagger: 0.12, ease: 'elastic.out(1, 0.45)', clearProps: 'transform,opacity,visibility' });
    },
    estante: () => drawSign('estante', true),
    lectern: () => {
      mel.say(pick({ pt: 'tem um livro ali!', en: 'there’s a book there!' }));
    },
    sobre: () => drawSign('sobre', true),
    house: () => boardBars?.animate(0.4),
    end: () => renderScene($<SVGSVGElement>(end, 'svg'), worldProps.enso(1700), { animate: true, pace: 0.6 }),
    desk: () => {
      mascot.say(t('mundo.desk'), 2600);
      // Mel spots her old friend in his corner
      mel.bark(2);
    },
  };

  function scrollOffsetFor(name: StationName) {
    const distance = world.width - world.viewport;
    if (name === 'hero') return 0;
    return Math.max(0, Math.min(distance, world.stations[name] - world.viewport * 0.12));
  }

  /** The light of the day: the visit starts in the mood of the visitor's own hour, and the walk carries it on through
   * morning, fog and dusk (and round to a new morning). Only opacities and one transform change, so it costs nothing
   * while scrolling. */
  const startMood = (() => {
    const hour = new Date().getHours();
    return hour >= 5 && hour < 11 ? 0 : hour >= 11 && hour < 16 ? 1 : 2;
  })();
  let moodKey = '';
  function setMood(progress: number) {
    const phase = (startMood + progress * MOODS.length) % MOODS.length;
    const index = Math.floor(phase);
    const t = phase - index;
    const blend = t * t * (3 - 2 * t);
    const a = MOODS[index];
    const b = MOODS[(index + 1) % MOODS.length];
    const at = (key: keyof Mood) => a[key] + (b[key] - a[key]) * blend;
    const key = phase.toFixed(3);
    if (key === moodKey) return;
    moodKey = key;
    // Written on the empty sky, its only reader: on the pin it restyled the whole world every scroll frame
    sky.style.setProperty('--dusk', at('dusk').toFixed(3));
    veil.style.opacity = at('veil').toFixed(3);
    mists.forEach((mist) => (mist.style.opacity = at('mist').toFixed(3)));
  }

  function setup() {
    trigger?.kill();
    world = buildWorld();
    drawLayers();
    drawStations();
    mascotX = world.viewport * (world.viewport < 700 ? 0.22 : 0.28);
    previousRockX = [...world.rocks];
    mel.setWall(world.portraitRight);
    mel.walk(mascotX, melFacing, 0);
    mel.setDepthScale(depthScale(depth));
    placeFloorProps();
    mascot.place(world.stations.desk + 150);
    painter?.resize();
    frameAll(root);
    fitSignLabels();

    const distance = world.width - world.viewport;
    moodKey = '';
    setMood(0);
    const setters = {
      roll: gsap.quickSetter(layers.roll, 'x', 'px'),
      mist: gsap.quickSetter(layers.mist, 'x', 'px'),
      ground: gsap.quickSetter(layers.ground, 'x', 'px'),
      front: gsap.quickSetter(layers.front, 'x', 'px'),
    };
    let wind = 0;
    let windValue = '';
    // --wind is set only on the elements that tilt with it (and does not inherit, see global.css): on a container it
    // restyled every paper's whole subtree each frame. Papers are re-rendered with the language, so the collections
    // are live: they follow those re-renders without a selector query on every scroll frame.
    const windBlown = [root.getElementsByClassName('line-paper'), root.getElementsByClassName('station-sign')];
    const setWind = (value: number) => {
      const next = value.toFixed(1);
      if (next === windValue) return;
      windValue = next;
      windBlown.forEach((collection) => {
        for (const element of collection) (element as HTMLElement).style.setProperty('--wind', next);
      });
    };
    const frontSkew = gsap.quickTo(layers.front, 'skewX', { duration: 0.9, ease: 'elastic.out(1, 0.35)' });
    gsap.set(layers.front, { transformOrigin: '50% 100%' });
    // onUpdate stops firing with the scroll, so the wind and the grass settle here
    if (settleOnStop) ScrollTrigger.removeEventListener('scrollEnd', settleOnStop);
    settleOnStop = () => {
      wind = 0;
      scrollVelocity = 0;
      gsap.to({ value: Number(windValue) || 0 }, { value: 0, duration: 0.8, ease: 'power2.out', onUpdate() { setWind(this.targets()[0].value); } });
      if (!reduced) frontSkew(0);
    };
    ScrollTrigger.addEventListener('scrollEnd', settleOnStop);

    trigger = ScrollTrigger.create({
      trigger: pin,
      pin: true,
      start: 'top top',
      end: () => `+=${distance}`,
      scrub: reduced ? true : 0.7,
      onUpdate: (self) => {
        const offset = self.progress * distance;
        worldOffset = offset;
        setters.roll(-self.progress * rollTravel);
        setters.mist(-offset * PARALLAX.mist);
        setters.ground(-offset);
        setters.front(-offset * PARALLAX.front);
        progressFill.style.clipPath = `inset(0 ${(100 - self.progress * 100).toFixed(2)}% 0 0)`;
        setMood(self.progress);

        const velocity = self.getVelocity();
        scrollVelocity = velocity;
        wind += (Math.max(-14, Math.min(14, velocity / 260)) - wind) * 0.2;
        setWind(wind);
        // The foreground drags behind the scroll like grass in the wind, and springs back when it stops
        if (!reduced) frontSkew(gsap.utils.clamp(-6, 6, -velocity / 400));
        if (Math.abs(velocity) > 12) melFacing = Math.sign(velocity);
        mel.setWall(world.portraitRight - offset);
        mel.walk(mascotX, melFacing, velocity / 3);

        world.rocks.forEach((rockX, index) => {
          const screenX = rockX - offset;
          const before = previousRockX[index];
          // Rocks sit at the back of the floor: only a walk along the back runs into them
          if (depth < 0.3 && ((before > mascotX + 6 && screenX <= mascotX + 6) || (before < mascotX - 6 && screenX >= mascotX - 6))) mel.hop(0);
          previousRockX[index] = screenX;
        });

        (Object.keys(world.stations) as StationName[]).forEach((name) => {
          if (revealed.has(name) || world.stations[name] - offset > world.viewport * 0.85) return;
          revealed.add(name);
          reveals[name]?.();
        });

        const current = [...NAV_STATIONS].reverse().find((name) => offset >= scrollOffsetFor(name) - world.viewport * 0.3) ?? 'hero';
        if (current !== activeSection) {
          activeSection = current;
          sectionListeners.forEach((listener) => listener(current));
        }
        if (self.progress > 0.985) unlock('walker');
      },
    });
  }

  // Hidden desk: paint the sky, spill the ink. The painter (and its full-screen canvas) is made on first use.
  let painter: InkPainter | null = null;
  async function setPainting(value: boolean) {
    if (!painter) {
      const { InkPainter } = await import('./painting');
      painter = new InkPainter(paintCanvas, pin);
      painter.resize();
    }
    painter.enabled = value;
    root.classList.toggle('is-painting', value);
    paintingBar.hidden = !value;
    gsap.to($(desk, '.desk-brush'), { autoAlpha: value ? 0.15 : 1, duration: 0.3 });
    if (value) {
      sounds.brush();
      frameAll(paintingBar);
      mascot.say(pick({ pt: 'pinta o céu todo!', en: 'paint the whole sky!' }));
    }
  }
  const onPointerMove = (event: PointerEvent) => {
    if (painter?.enabled) brushCursor.style.transform = `translate3d(${event.clientX}px, ${event.clientY}px, 0)`;
  };
  window.addEventListener('pointermove', onPointerMove, { passive: true });
  renderScene($<SVGSVGElement>(brushCursor, 'svg'), deskObjects.brush);
  $(desk, '.desk-brush').addEventListener('click', () => void setPainting(!painter?.enabled));
  $(paintingBar, '[data-clear-sky]').addEventListener('click', () => {
    gsap.to(paintCanvas, { autoAlpha: 0, duration: 0.5, onComplete: () => (painter?.clear(), gsap.set(paintCanvas, { autoAlpha: 1 })) });
    sounds.paper();
  });
  window.addEventListener('keydown', (event) => event.key === 'Escape' && painter?.enabled && void setPainting(false));

  $(desk, '.desk-ink').addEventListener('click', () => {
    const bottle = $(desk, '.desk-ink');
    inkSpilled = !inkSpilled;
    gsap.to(bottle, { rotation: inkSpilled ? 96 : 0, y: inkSpilled ? 54 : 0, x: inkSpilled ? 30 : 0, duration: inkSpilled ? 0.5 : 0.7, ease: inkSpilled ? 'power3.in' : 'back.out(2)', transformOrigin: '80% 95%' });
    if (!inkSpilled) return;
    sounds.splat();
    unlock('spill');
    const splat = svgElement('svg', { class: 'ink desk-splat', viewBox: '-110 -70 220 140', 'aria-hidden': 'true' });
    desk.append(splat);
    renderScene(splat, inkSplat(0, 0, 60, Math.floor(Math.random() * 999)), { animate: true, pace: 2.5 });
    gsap.fromTo(splat, { scale: 0.3, transformOrigin: '20% 50%' }, { scale: 1, duration: 0.9, ease: 'power2.out' });
    window.setTimeout(() => mascot.say(pick({ pt: 'opa! não fui eu', en: 'oops! wasn’t me' })), 700);
  });

  $(lectern, '.station-lectern-button').addEventListener('click', () => void openBook());

  const openMail = () => void openNotebook(nudgeMailbox);
  $(mail, '.station-mail-box').addEventListener('click', openMail);
  $(mail, '[data-open-notebook]').addEventListener('click', openMail);
  const copyButton = $(mail, '[data-copy-email]');
  copyButton.addEventListener('click', () => {
    const label = copyButton.querySelector('span')!;
    const fallback = () => window.getSelection()?.selectAllChildren($(mail, '.station-mail-email'));
    if (!navigator.clipboard) return fallback();
    navigator.clipboard.writeText('andre.luanbq@gmail.com').then(() => {
      label.textContent = t('mail.copied');
      sounds.pop();
      window.setTimeout(() => (label.textContent = t('mail.copy')), 1600);
    }, fallback);
  });

  // Borrão lives in his own corner, by the ink bottle on the hidden desk, and wanders only around it
  const deskSpan = () => (world ? [world.stations.desk - 40, world.stations.desk + 300] : [0, 0]);
  const mascot = new Mascot({
    layer: layers.ground,
    groundY: () => (world ? world.ground + 4 : pin.clientHeight * 0.8),
    minX: () => deskSpan()[0],
    maxX: () => deskSpan()[1],
  });

  // Mel, André's dog, is the one who walks the world with the visitor
  const mel = new Mel({ layer: mascotLayer, groundY: () => (world ? laneY(lane(), depth) : pin.clientHeight * GROUND_SHARE) });
  let melFacing = 1;

  // The floor as a game: W/S walk up and down it, A/D along it, and a tap on the floor sends her there
  const KEY_AXES: Record<string, [side: number, forward: number]> = { w: [0, -1], s: [0, 1], a: [-1, 0], d: [1, 0] };
  const heldKeys = new Set<string>();
  const busyTarget = (target: EventTarget | null) => target instanceof Element && Boolean(target.closest('input, textarea, select, [contenteditable], dialog'));
  window.addEventListener('keydown', (event) => {
    const key = event.key.toLowerCase();
    if (!(key in KEY_AXES) || event.ctrlKey || event.metaKey || event.altKey || busyTarget(event.target) || document.querySelector('dialog[open]')) return;
    heldKeys.add(key);
    // A quick tap can start and end between two frames: it still takes one small step
    if (!event.repeat && KEY_AXES[key][1]) depthGoal = clampDepth(depthGoal + KEY_AXES[key][1] * 0.07);
  });
  window.addEventListener('keyup', (event) => heldKeys.delete(event.key.toLowerCase()));
  window.addEventListener('blur', () => heldKeys.clear());

  const clampDepth = (value: number) => gsap.utils.clamp(LANE_DEPTH.min, LANE_DEPTH.max, value);
  const pinPoint = (event: MouseEvent) => {
    const box = pin.getBoundingClientRect();
    return { x: event.clientX - box.left, y: event.clientY - box.top };
  };
  pin.addEventListener('click', (event) => {
    if (!world || !trigger || painter?.enabled) return;
    if (event.target instanceof Element && event.target.closest('button, a, input, textarea, label, [role="button"]')) return;
    const { x, y } = pinPoint(event);
    if (y < world.ground - 4) return;
    depthGoal = clampDepth(depthAt(lane(), y));
    if (Math.abs(x - mascotX) > 40) scrollTo(trigger.scroll() + x - mascotX);
  });
  pin.addEventListener('pointermove', (event) => world && pin.classList.toggle('is-over-floor', pinPoint(event).y >= world.ground - 4), { passive: true });

  /** Ink paw prints left on the floor behind her, fading as the paper drinks them. */
  const paws: HTMLElement[] = [];
  let pawSide = 1;
  let pawTravel = 0;
  let lastFoot: [number, number] | null = null;
  function stampPaw(x: number, y: number, scale: number) {
    const paw = document.createElement('span');
    paw.className = 'mundo-paw';
    paw.style.transform = `translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, 0) scale(${scale.toFixed(2)})`;
    layers.ground.append(paw);
    paws.push(paw);
    if (paws.length > 36) paws.shift()!.remove();
    paw.addEventListener('animationend', () => {
      paw.remove();
      const index = paws.indexOf(paw);
      if (index >= 0) paws.splice(index, 1);
    }, { once: true });
  }

  let walkingInDepth = false;
  let reachedBack = false;
  let reachedFront = false;
  /** Props standing in the middle of the floor. They share Mel's layer, so whoever stands nearer the viewer (lower
   * feet) is drawn in front, as in the arcade beat 'em ups. */
  interface FloorProp {
    kind: FloorPropKind;
    x: number;
    depth: number;
    halfWidth: number;
    el: HTMLDivElement;
    previousX: number;
    visible: boolean;
    lit: boolean;
  }
  let props: FloorProp[] = [];
  /** Spots on the back edge the floor left for lanterns; they are the same lantern props as on the path. */
  let backLanterns: number[] = [];
  let propsOffset = Number.NaN;
  const sortMel = () => (mel.el.style.zIndex = String(Math.round(laneY(lane(), depth))));

  function placeFloorProps() {
    props.forEach((prop) => prop.el.remove());
    const random = seededRandom(4242);
    const names = Object.keys(FLOOR_PROPS) as FloorPropName[];
    // Nothing may stand in front of the pieces people click on
    const keepClear = [world.stations.house, world.stations.lectern, world.stations.repos, world.stations.mail, world.stations.desk];
    const shrink = world.viewport < 700 ? 0.8 : 1;
    props = [];
    const spots: { x: number; name: FloorPropName; depth: number }[] = backLanterns.map((x) => ({ x, name: 'lantern', depth: BACK_EDGE_DEPTH }));
    for (let x = world.viewport * 1.15, index = 0; x < world.width - world.viewport * 0.4; x += 650 + random() * 650, index++) {
      // Every third prop is a lantern; every prop stands on the centre line of one row of flagstones
      const drawn = names[Math.floor(random() * names.length)];
      const row = ROW_DEPTHS[Math.floor(random() * ROW_DEPTHS.length)];
      if (keepClear.some((at) => x > at - 160 && x < at + 420)) continue;
      spots.push({ x, name: index % 3 === 0 ? 'lantern' : drawn, depth: row });
    }
    spots.forEach(({ x, name, depth: propDepth }, index) => {
      const kind: FloorPropKind = FLOOR_PROPS[name];
      const size = depthScale(propDepth) * shrink;
      const baseY = laneY(lane(), propDepth);
      const el = document.createElement('div');
      el.className = 'mundo-prop';
      Object.assign(el.style, { width: `${kind.width * size}px`, height: `${kind.height * size}px`, top: `${baseY - kind.base * size}px`, zIndex: String(Math.round(baseY)) });
      const svg = svgElement('svg', { class: 'ink', viewBox: `0 0 ${kind.width} ${kind.height}`, 'aria-hidden': 'true' }, el);
      mascotLayer.append(el);
      renderScene(svg, kind.draw(3000 + index * 20));
      const prop: FloorProp = { kind, x, depth: propDepth, halfWidth: (kind.width * size) / 2, el, previousX: x - worldOffset, visible: true, lit: false };
      if (kind.light) makeLantern(prop, kind.light, size, 3000 + index * 20);
      props.push(prop);
    });
    propsOffset = Number.NaN;
    sortMel();
  }

  /** A lantern is a button: a click (or Enter) lights its window, another blows it out. */
  function makeLantern(prop: FloorProp, light: NonNullable<FloorPropKind['light']>, size: number, seed: number) {
    const { el, kind } = prop;
    el.classList.add('is-lantern');
    el.tabIndex = 0;
    el.setAttribute('role', 'button');
    el.setAttribute('aria-pressed', 'false');
    el.setAttribute('aria-label', pick({ pt: 'acender a lanterna', en: 'light the lantern' }));
    el.style.setProperty('--light-x', `${(light.x / kind.width) * 100}%`);
    el.style.setProperty('--light-y', `${(light.y / kind.height) * 100}%`);
    el.style.setProperty('--light-size', `${light.radius * 2 * size}px`);
    const glow = document.createElement('span');
    glow.className = 'mundo-prop-glow';
    el.append(glow);
    const flame = svgElement('svg', { class: 'ink mundo-prop-flame', viewBox: '-6 -16 12 17', 'aria-hidden': 'true' }, el);
    renderScene(flame, lanternFlame);
    const rays = svgElement('svg', { class: 'ink mundo-prop-rays', viewBox: '-50 -50 100 100', 'aria-hidden': 'true' }, el);
    const toggle = () => toggleLantern(prop, rays, seed);
    el.addEventListener('click', toggle);
    el.addEventListener('keydown', (event) => {
      if (event.key !== 'Enter' && event.key !== ' ') return;
      event.preventDefault();
      toggle();
    });
  }

  let firstLight = true;
  function toggleLantern(prop: FloorProp, rays: SVGSVGElement, seed: number) {
    prop.lit = !prop.lit;
    prop.el.classList.toggle('is-lit', prop.lit);
    prop.el.setAttribute('aria-pressed', String(prop.lit));
    prop.el.setAttribute('aria-label', prop.lit ? pick({ pt: 'apagar a lanterna', en: 'blow out the lantern' }) : pick({ pt: 'acender a lanterna', en: 'light the lantern' }));
    if (!prop.lit) {
      sounds.paper();
      return;
    }
    sounds.light();
    // The rays are brushed on anew every time it is lit, never twice the same
    renderScene(rays, lanternRays(seed + Math.floor(Math.random() * 99)), { animate: true, pace: 1.8 });
    if (firstLight) {
      firstLight = false;
      mel.say(pick({ pt: 'que luzinha bonita!', en: 'what a pretty light!' }));
    }
    if (props.filter((item) => item.kind.light).every((item) => item.lit)) {
      unlock('lanterns');
      mel.bark(2);
    }
  }

  function positionProps() {
    if (worldOffset === propsOffset) return;
    propsOffset = worldOffset;
    props.forEach((prop) => {
      const screenX = prop.x - worldOffset;
      const visible = screenX > -300 && screenX < world.viewport + 300;
      if (visible !== prop.visible) {
        prop.visible = visible;
        prop.el.style.visibility = visible ? '' : 'hidden';
      }
      if (visible) prop.el.style.transform = `translate3d(${(screenX - prop.halfWidth).toFixed(1)}px, 0, 0)`;
    });
  }

  /** Low props are hopped over when she walks into them in their row; tall ones are walked around, and block her
   * from stepping through them up or down the floor. Returns true while she is being pushed out of one. */
  function meetProps() {
    let dodging = false;
    props.forEach((prop) => {
      const screenX = prop.x - worldOffset;
      const distance = Math.abs(screenX - mascotX);
      const reach = prop.halfWidth * 0.7 + 18;
      const inRow = Math.abs(depth - prop.depth) < prop.kind.band;
      if (prop.kind.tall) {
        const heading = Math.abs(depthGoal - prop.depth) < prop.kind.band + 0.01;
        if ((distance < reach + 40 && heading) || (distance < reach && inRow)) {
          const clearance = prop.kind.band + 0.04;
          let sideOf = depth <= prop.depth ? -1 : 1;
          const edge = prop.depth + sideOf * clearance;
          if (edge < LANE_DEPTH.min || edge > LANE_DEPTH.max) sideOf = -sideOf;
          depthGoal = clampDepth(prop.depth + sideOf * clearance);
          dodging ||= distance < reach && inRow;
        }
      } else if (inRow && ((prop.previousX > mascotX && screenX <= mascotX) || (prop.previousX < mascotX && screenX >= mascotX))) {
        mel.hop(0, 380);
      }
      prop.previousX = screenX;
    });
    return dodging;
  }

  function stepFloor(_time: number, deltaMs: number) {
    if (!world || !trigger) return;
    const dt = Math.min(0.05, deltaMs / 1000);
    let side = 0;
    let forward = 0;
    heldKeys.forEach((key) => {
      side += KEY_AXES[key][0];
      forward += KEY_AXES[key][1];
    });
    if (forward) depthGoal = clampDepth(depth + forward * 0.06);
    if (side) scrollTo(trigger.scroll() + side * SIDE_SPEED * dt, true);
    positionProps();
    const dodging = meetProps();

    const gap = depthGoal - depth;
    const speed = DEPTH_SPEED * (dodging ? 2.5 : 1);
    const step = reduced ? gap : Math.sign(gap) * Math.min(Math.abs(gap), speed * dt);
    depth += step;
    if (step) {
      mel.setDepthScale(depthScale(depth));
      sortMel();
      // Walking up or down the floor drives her gait the way scrolling does, unless the scroll is already driving it
      const pixelsPerSecond = (Math.abs(step) * (world.height - world.ground)) / dt;
      if (Math.abs(scrollVelocity) < 12) mel.walk(mascotX, melFacing, (melFacing * pixelsPerSecond) / 2.4);
      walkingInDepth = true;
      if (depth <= LANE_DEPTH.min + 0.01) reachedBack = true;
      if (depth >= LANE_DEPTH.max - 0.01) reachedFront = true;
      if (reachedBack && reachedFront) unlock('depth');
    } else if (walkingInDepth) {
      walkingInDepth = false;
      if (Math.abs(scrollVelocity) < 12) mel.walk(mascotX, melFacing, 0);
    }

    if (reduced) return;
    const foot: [number, number] = [worldOffset + mascotX, laneY(lane(), depth)];
    if (lastFoot) pawTravel += Math.hypot(foot[0] - lastFoot[0], foot[1] - lastFoot[1]);
    lastFoot = foot;
    const scale = depthScale(depth);
    if (pawTravel > 26 * scale) {
      pawTravel = 0;
      pawSide = -pawSide;
      stampPaw(foot[0] - 8 * melFacing, foot[1] - 3 + pawSide * 3 * scale, scale);
    }
  }
  gsap.ticker.add(stepFloor);

  // Stations far off to either side stop animating and drop their drawings from paint; buttons stay focusable.
  // Some stations are zero-sized boxes around absolutely placed pieces, so the pieces are what gets observed.
  const nearPieces = new Map<Element, Set<Element>>();
  const farAway = new IntersectionObserver(
    (entries) =>
      entries.forEach((entry) => {
        const station = entry.target.parentElement!;
        const near = nearPieces.get(station)!;
        entry.isIntersecting ? near.add(entry.target) : near.delete(entry.target);
        station.classList.toggle('is-far', !near.size);
        if (station === desk) near.size ? mascot.resume() : mascot.pause();
      }),
    { rootMargin: '0px 50% 0px 50%' }
  );
  root.querySelectorAll('.mundo-station').forEach((station) => {
    nearPieces.set(station, new Set());
    [...station.children].forEach((piece) => farAway.observe(piece));
  });

  hydratePapers();
  boardBars = hydrateBoard();
  setup();

  if (!reduced) {
    gsap.fromTo(heroText.children, { autoAlpha: 0, y: 24, filter: 'blur(8px)' }, { autoAlpha: 1, y: 0, filter: 'blur(0px)', duration: 0.9, stagger: 0.1, delay: 0.3, ease: 'power3.out', clearProps: 'all' });
  }

  document.fonts?.ready.then(fitSignLabels);

  let resizeTimer = 0;
  window.addEventListener('resize', () => {
    // Mobile browsers fire resize whenever the URL bar shows or hides; the pin is 100svh so nothing changes, and rebuilding the world would stall the scroll.
    if (pin.clientWidth === world.viewport && pin.clientHeight === world.height) return;
    window.clearTimeout(resizeTimer);
    resizeTimer = window.setTimeout(() => {
      setup();
      ScrollTrigger.refresh();
    }, 200);
  });

  window.setTimeout(() => mel.say(t('mundo.hint'), 2600), 1500);

  return {
    goTo(name: StationName, immediate = false) {
      if (!trigger) return;
      const target = trigger.start + scrollOffsetFor(name);
      scrollTo(target, immediate);
    },
    has(name: string): name is StationName {
      return Boolean(world?.stations && name in world.stations);
    },
    onSection(listener: (name: StationName) => void) {
      sectionListeners.add(listener);
      listener(activeSection);
    },
  };
}
