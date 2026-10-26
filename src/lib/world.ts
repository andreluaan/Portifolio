import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { projects } from '../data/content';
import { frameAll, inkSplat, prefersReducedMotion, renderScene, roughRect, seededRandom, stroke, svgElement, type Point, type Stroke } from './brush';
import { openBook } from './book';
import { openCharacterSheet } from './character';
import { openNotebook } from './notebook';
import type { GithubData } from '../data/github';
import { paintPortrait } from './effects';
import { getLang, onLangChange, pick, t } from './i18n';
import { Mascot } from './mascot';
import { Mel } from './mel';
import { InkPainter } from './painting';
import { mistStrip, paintHills, paintPeaks, paintRidge, type Biome, type PlaneSpec } from './landscape';
import { deskObjects, foregroundBranch, grassTufts, sketchFor, worldProps } from './scenes';
import { unlock } from './secrets';
import { attributeList, characterIdentity, portraits } from './sections';
import { sounds } from './sound';

export type StationName = 'hero' | 'processo' | 'process' | 'varal' | 'line' | 'estante' | 'lectern' | 'atelie' | 'repos' | 'sobre' | 'house' | 'mail' | 'end' | 'desk';

interface WorldLayout {
  width: number;
  viewport: number;
  height: number;
  ground: number;
  rocks: number[];
  stations: Record<StationName, number>;
}

/** Shan shui distances: high peaks barely move, the ridge with its pines a little more, hills more, the ground with
 * the scroll, and the foreground grass and branches faster than the eye. */
const PARALLAX = { peaks: 0.1, ridge: 0.28, hills: 0.62, ground: 1, front: 1.45 };

interface Mood {
  /** Sun position as a share of the viewport width and of the ground height, its scale and its opacity. */
  sun: [number, number, number, number];
  peaks: number;
  ridge: number;
  hills: number;
  mist: number;
  veil: number;
  dusk: number;
}
/** Morning: clear and pale, the sun high. Fog: the far planes nearly gone, the sun a faint disc. Dusk: the sun low
 * and large behind the peaks, the sky deepening, the hills standing out dark. */
const MOODS: Mood[] = [
  { sun: [0.76, 0.16, 0.8, 0.42], peaks: 0.6, ridge: 0.9, hills: 1, mist: 0.65, veil: 0, dusk: 0 },
  { sun: [0.58, 0.22, 1, 0.12], peaks: 0.22, ridge: 0.45, hills: 0.75, mist: 1, veil: 0.8, dusk: 0.15 },
  { sun: [0.3, 0.5, 1.4, 0.62], peaks: 0.8, ridge: 1, hills: 1, mist: 0.4, veil: 0.12, dusk: 1 },
];
const NAV_STATIONS: StationName[] = ['hero', 'line', 'house', 'lectern', 'repos', 'mail'];

function place(element: HTMLElement, x: number, styles: Partial<CSSStyleDeclaration> = {}) {
  element.style.left = `${x}px`;
  Object.assign(element.style, styles);
}

const $ = <T extends Element = HTMLElement>(root: ParentNode, selector: string) => root.querySelector<T>(selector)! as T;

export function mountWorld(scrollTo: (y: number, immediate?: boolean) => void) {
  const root = document.querySelector<HTMLElement>('.mundo')!;
  const pin = $(root, '.mundo-pin');
  const layers = {
    peaks: $(root, '.mundo-peaks'),
    ridge: $(root, '.mundo-ridge'),
    hills: $(root, '.mundo-hills'),
    ground: $(root, '.mundo-ground'),
    front: $(root, '.mundo-front'),
  };
  const sky = $(root, '.mundo-sky');
  const sun = $(root, '.mundo-sun');
  const veil = $(root, '.mundo-veil');
  const planes = { peaks: $(layers.peaks, '.mundo-plane'), ridge: $(layers.ridge, '.mundo-plane'), hills: $(layers.hills, '.mundo-plane') };
  const mists = [...root.querySelectorAll<HTMLElement>('.mundo-mist')];
  const groundArt = $<SVGSVGElement>(root, '.mundo-ground-art');
  const heroSheet = $(root, '.station-hero-sheet');
  const heroText = $(root, '.station-hero-text');
  const signs = {
    processo: $(root, '[data-sign="processo"]'),
    varal: $(root, '[data-sign="varal"]'),
    estante: $(root, '[data-sign="estante"]'),
    atelie: $(root, '[data-sign="atelie"]'),
    sobre: $(root, '[data-sign="sobre"]'),
  };
  const signSeeds = { processo: 1300, varal: 1310, estante: 1320, atelie: 1330, sobre: 1340 };

  /** Shrinks a sign's label until it fits the plank, since translations and late fonts change its width. */
  function fitSignLabels() {
    Object.values(signs).forEach((sign) => {
      const label = $(sign, '.hand');
      label.style.fontSize = '';
      const range = document.createRange();
      range.selectNodeContents(label);
      const textWidth = range.getBoundingClientRect().width;
      const room = label.clientWidth - 8;
      if (textWidth > room) label.style.fontSize = `${(parseFloat(getComputedStyle(label).fontSize) * room) / textWidth}px`;
    });
  }

  function drawSign(name: keyof typeof signs, animate = false) {
    const svg = $<SVGSVGElement>(signs[name], 'svg');
    renderScene(svg, worldProps.signpost(signSeeds[name]), { animate });
    const defs = svg.querySelector('defs')!;
    defs.after(
      svgElement('path', { d: worldProps.signBoard.shadow, class: 'station-sign-shadow' }),
      svgElement('path', { d: worldProps.signBoard.plank, class: 'station-sign-plank' })
    );
  }
  const process = $(root, '.station-process');
  const repos = $(root, '.station-repos');
  const reposBoard = $(root, '.station-repos-board');
  const mail = $(root, '.station-mail');
  const github: GithubData = JSON.parse(document.getElementById('github-data')?.textContent ?? '{"repos":[],"days":[],"total":0,"live":false}');
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
  let mascotX = 0;
  let activeSection: StationName = 'hero';
  let inkSpilled = false;
  let settleOnStop: (() => void) | null = null;

  // Content that depends on the language
  function renderBoard() {
    const identity = characterIdentity();
    const bars = attributeList();
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'ink-button small';
    button.dataset.frame = '';
    button.innerHTML = '<span></span> →';
    button.querySelector('span')!.textContent = t('about.readFull');
    button.addEventListener('click', openCharacterSheet);
    boardBody.replaceChildren(identity, bars.list, button);
    return bars;
  }

  function renderPapers() {
    const featured = projects.filter((project) => project.featured);
    papersHost.replaceChildren(
      ...featured.map((project, index) => {
        const paper = document.createElement('button');
        paper.type = 'button';
        paper.className = 'line-paper';
        paper.style.setProperty('--delay', `${-index * 0.7}s`);
        paper.style.setProperty('--tilt', `${(index % 2 ? 1 : -1) * (2 + (index % 3))}deg`);
        paper.innerHTML = `
          <span class="line-paper-pin" aria-hidden="true"></span>
          <span class="line-paper-sheet">
            <svg class="ink" viewBox="0 0 240 160" aria-hidden="true"></svg>
            <span class="line-paper-title"></span>
            <span class="line-paper-summary"></span>
            <span class="line-paper-foot"><span class="hand line-paper-status"></span><span class="hand line-paper-open"></span></span>
          </span>`;
        paper.querySelector('.line-paper-title')!.textContent = pick(project.title);
        paper.querySelector('.line-paper-summary')!.textContent = pick(project.stat);
        paper.querySelector('.line-paper-status')!.textContent = pick(project.status);
        paper.querySelector('.line-paper-open')!.textContent = pick({ pt: 'abrir →', en: 'open →' });
        paper.setAttribute('aria-label', pick(project.title));
        const svg = paper.querySelector('svg')!;
        renderScene(svg, sketchFor(project.id));
        paper.addEventListener('mouseenter', () => {
          renderScene(svg, sketchFor(project.id), { animate: true, pace: 1.8 });
          sounds.paper();
        });
        paper.addEventListener('click', () => openBook(project.id));
        return paper;
      })
    );
  }

  function renderRepos() {
    const list = $(reposBoard, '.station-repos-list');
    const locale = getLang() === 'pt' ? 'pt-BR' : 'en-US';
    list.replaceChildren(
      ...github.repos.slice(0, 12).map((repo, index) => {
        const item = document.createElement('li');
        item.className = 'repo-card';
        item.style.setProperty('--tilt', `${((index * 37) % 5) - 2}deg`);
        item.innerHTML = '<a target="_blank" rel="noopener"><span class="repo-pin" aria-hidden="true"></span><strong></strong><span class="repo-description"></span><span class="repo-foot"><span class="hand repo-language"></span><span class="repo-date"></span></span></a>';
        item.querySelector('a')!.href = repo.url;
        item.querySelector('strong')!.textContent = repo.name.replace(/[-_]/g, ' ');
        item.querySelector('.repo-description')!.textContent = repo.description ?? '—';
        item.querySelector('.repo-language')!.textContent = repo.language ?? '';
        item.querySelector('.repo-date')!.textContent = `${t('repos.updated')} ${new Date(`${repo.pushedAt}T12:00:00`).toLocaleDateString(locale, { day: '2-digit', month: 'short' })}`;
        return item;
      })
    );
  }

  // Layout
  function buildWorld(): WorldLayout {
    const viewport = pin.clientWidth;
    const height = pin.clientHeight;
    const ground = Math.round(height * 0.8);
    const mobile = viewport < 700;
    const topbar = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--topbar-height')) || 64;
    const stations = {} as Record<StationName, number>;
    let x = viewport * (mobile ? 0.06 : 0.07);

    const sheetHeight = Math.min(ground - topbar - 30, mobile ? 360 : 560);
    const sheetWidth = sheetHeight * 0.66;
    const textWidth = Math.min(460, viewport * (mobile ? 0.84 : 0.4));
    stations.hero = 0;
    // Mel's invisible wall: the portrait's right edge, wherever the layout puts it
    let portraitRight: number;
    if (mobile) {
      place(heroText, x, { width: `${textWidth}px`, top: `${topbar + 24}px` });
      x += textWidth + 40;
      place(heroSheet, x, { width: `${sheetWidth}px`, height: `${sheetHeight}px`, top: `${ground - sheetHeight}px` });
      portraitRight = x + sheetWidth;
      x += sheetWidth + viewport * 0.3;
    } else {
      place(heroSheet, x, { width: `${sheetWidth}px`, height: `${sheetHeight}px`, top: `${ground - sheetHeight}px` });
      portraitRight = x + sheetWidth;
      x += sheetWidth + 56;
      place(heroText, x, { width: `${textWidth}px`, top: `${topbar + 36}px` });
      x += textWidth + viewport * 0.22;
    }

    stations.processo = x;
    place(signs.processo, x, { top: `${ground - 190}px` });
    x += 300;

    const flagWidth = mobile ? 190 : 210;
    stations.process = x;
    place(process, x, { top: `${ground - 260}px`, width: `${flagWidth * 4 + 60}px`, height: '260px' });
    process.style.setProperty('--flag-width', `${flagWidth}px`);
    x += flagWidth * 4 + 60 + viewport * 0.2;

    stations.varal = x;
    place(signs.varal, x, { top: `${ground - 190}px` });
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
    place(signs.sobre, x, { top: `${ground - 190}px` });
    x += 300;

    const boardWidth = Math.min(560, viewport * 0.88);
    const boardHeight = Math.min(ground - topbar - 30, 560);
    stations.house = x;
    place(house, x, { top: `${ground - boardHeight}px`, height: `${boardHeight}px`, width: `${(mobile ? 0 : 300) + boardWidth}px` });
    board.style.width = `${boardWidth}px`;
    board.style.height = `${boardHeight}px`;
    x += (mobile ? 0 : 300) + boardWidth + viewport * 0.25;

    stations.estante = x;
    place(signs.estante, x, { top: `${ground - 190}px` });
    x += 250;

    const lecternScale = Math.min(1.45, (ground - topbar - 90) / 270);
    stations.lectern = x;
    place(lectern, x, { top: `${ground - 256 * lecternScale}px`, width: `${160 * lecternScale}px`, height: `${260 * lecternScale}px` });
    x += 160 * lecternScale + viewport * 0.25;

    stations.atelie = x;
    place(signs.atelie, x, { top: `${ground - 190}px` });
    x += 300;

    const reposColumns = mobile ? 2 : 4;
    const reposWidth = Math.min(reposColumns * 220 + 60, viewport * 0.92);
    const reposHeight = Math.min(ground - topbar - 110, 470);
    stations.repos = x;
    place(repos, x, { top: `${ground - reposHeight - 74}px`, width: `${reposWidth}px`, height: `${reposHeight}px` });
    repos.style.setProperty('--repo-columns', String(reposColumns));
    x += reposWidth + viewport * 0.18;

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

    const width = Math.max(x, viewport * 2);
    const random = seededRandom(Math.round(width));
    const rocks = [
      stations.processo - viewport * 0.1,
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

  /** The distant planes, painted into canvas once per layout (see landscape.ts): one long scene that goes from
   * mountains and pines to the coast, the city, the fields and back to the mountains as the visitor walks. */
  function drawLandscape() {
    const { width, viewport, height, ground, stations } = world;
    const layerWidth = (factor: number) => viewport + (width - viewport) * factor;
    const phone = viewport < 700;
    // A point of the world lines up with a point of a plane when both sit mid-screen
    const onPlane = (x: number, factor: number) => (x - viewport / 2) * factor + viewport / 2;
    const scene: { biome: Biome; from: number; to: number }[] = [
      { biome: 'mountains', from: 0, to: stations.varal },
      { biome: 'coast', from: stations.varal, to: stations.estante },
      { biome: 'city', from: stations.estante, to: stations.mail - viewport * 0.6 },
      { biome: 'field', from: stations.mail - viewport * 0.6, to: stations.end },
      { biome: 'mountains', from: stations.end, to: width },
    ];
    const spec = (factor: number, planeHeight: number, planeGround: number): PlaneSpec => ({
      width: layerWidth(factor),
      height: planeHeight,
      ground: planeGround,
      stretches: scene.map(({ biome, from, to }) => ({ biome, from: onPlane(from, factor), to: onPlane(to, factor) })),
      avoid: Object.values(stations).map((x) => onPlane(x, factor)),
      phone,
    });

    const peaks = spec(PARALLAX.peaks, ground, ground);
    const ridge = spec(PARALLAX.ridge, ground, ground);
    const hills = spec(PARALLAX.hills, height, ground);
    layers.peaks.style.width = `${peaks.width}px`;
    layers.ridge.style.width = `${ridge.width}px`;
    layers.hills.style.width = `${hills.width}px`;
    // Far planes are soft anyway: half their pixels quarters their memory
    void paintPeaks($(layers.peaks, '.mundo-plane'), peaks, 0.5)
      .then(() => paintRidge($(layers.ridge, '.mundo-plane'), ridge, phone ? 0.5 : 0.75))
      .then(() => paintHills($(layers.hills, '.mundo-plane'), hills, phone ? 0.75 : 1));

    // Mist that drifts on its own, even while the page is still: a seamless baked strip slid by CSS
    const drift = async (host: HTMLElement, y: number, thickness: number, seed: number) => {
      const strip = mistStrip(viewport, ground, y, thickness, seed);
      Object.assign(host.style, { backgroundImage: `url(${strip})`, backgroundSize: `${viewport}px ${ground}px`, width: `${layerWidth(1) + viewport}px`, height: `${ground}px`, '--drift-by': `-${viewport}px` });
    };
    void drift($(layers.peaks, '.mundo-mist'), ground * 0.6, 120, 361);
    void drift($(layers.ridge, '.mundo-mist'), ground * 0.88, 90, 371);
  }

  function drawLayers() {
    const { width, viewport, height, ground, rocks } = world;
    const layerWidth = (factor: number) => viewport + (width - viewport) * factor;

    drawLandscape();

    layers.ground.style.width = `${width}px`;
    groundArt.setAttribute('viewBox', `0 0 ${width} ${height}`);
    const groundStrokes: Stroke[] = [
      stroke([[0, ground + 2], [width * 0.3, ground - 2], [width * 0.6, ground + 3], [width, ground]], 5, { seed: 11, dry: true, start: 0.005, end: 0.01 }),
      stroke([[0, ground + 24], [width, ground + 20]], 30, { tone: 'mist', filter: 'wash', seed: 12, start: 0.01, end: 0.01 }),
      ...grassTufts(width, ground, Math.round(width / 70), 5),
    ];
    rocks.forEach((rockX, index) => {
      worldProps.rock(500 + index).forEach((item) => groundStrokes.push({ ...item, points: item.points.map(([x, y]) => [x + rockX - 26, y + ground - 30] as Point) }));
    });
    renderScene(groundArt, groundStrokes);

    const frontWidth = layerWidth(PARALLAX.front);
    const front = $<SVGSVGElement>(layers.front, 'svg');
    layers.front.style.width = `${frontWidth}px`;
    front.setAttribute('viewBox', `0 0 ${frontWidth} ${height}`);
    const random = seededRandom(77);
    const blades: Stroke[] = [];
    for (let i = 0; i < frontWidth / 160; i++) {
      const x = random() * frontWidth;
      const tall = 50 + random() * 90;
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

  function drawStations() {
    const sheet = { width: heroSheet.offsetWidth, height: heroSheet.offsetHeight };
    const frame = $<SVGSVGElement>(heroSheet, '.station-hero-frame');
    frame.setAttribute('viewBox', `0 0 ${sheet.width} ${sheet.height + 40}`);
    renderScene(frame, [
      ...roughRect(4, 4, sheet.width - 8, sheet.height - 8, 2.2, 1201),
      stroke([[sheet.width * 0.18, sheet.height - 4], [sheet.width * 0.16, sheet.height + 36]], 4.5, { seed: 1206 }),
      stroke([[sheet.width * 0.82, sheet.height - 4], [sheet.width * 0.85, sheet.height + 36]], 4.5, { seed: 1207 }),
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

    renderScene($<SVGSVGElement>(lectern, '.station-lectern-art'), worldProps.lectern(1450));
    renderScene($<SVGSVGElement>(lectern, '.station-lectern-page'), worldProps.lecternPage(1470));

    process.querySelectorAll<SVGSVGElement>('.process-flag svg').forEach((svg, index) => renderScene(svg, worldProps.flag(2400 + index * 10)));
    const boardBox = { width: repos.clientWidth, height: repos.clientHeight };
    const reposArt = $<SVGSVGElement>(repos, '.station-repos-art');
    reposArt.setAttribute('viewBox', `0 0 ${boardBox.width} ${boardBox.height + 80}`);
    renderScene(reposArt, [...roughRect(4, 4, boardBox.width - 8, boardBox.height - 8, 2.6, 2501), ...worldProps.boardLegs(2510, boardBox.width, boardBox.height)]);
    renderScene($<SVGSVGElement>(mail, '.station-mail-art'), worldProps.mailbox(2700));
    renderScene($<SVGSVGElement>(mail, '.station-mail-flag'), worldProps.mailFlag(2710));
    const note = $(mail, '.station-mail-note');
    const noteFrame = $<SVGSVGElement>(mail, '.station-mail-note-frame');
    noteFrame.setAttribute('viewBox', `0 0 ${note.offsetWidth} ${note.offsetHeight}`);
    renderScene(noteFrame, roughRect(3, 3, note.offsetWidth - 6, note.offsetHeight - 6, 1.8, 2720));

    renderScene($<SVGSVGElement>(house, '.station-house-art'), worldProps.house(1500));
    const boardRect = { width: board.offsetWidth, height: board.offsetHeight };
    const boardFrame = $<SVGSVGElement>(board, '.station-board-frame');
    boardFrame.setAttribute('viewBox', `0 0 ${boardRect.width} ${boardRect.height}`);
    renderScene(boardFrame, roughRect(4, 4, boardRect.width - 8, boardRect.height - 8, 2.4, 1601));
    renderScene($<SVGSVGElement>(end, 'svg'), worldProps.enso(1700));

    renderScene($<SVGSVGElement>(desk, '.station-desk-art'), worldProps.desk(1750));
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

  let boardBars: ReturnType<typeof attributeList> | null = null;
  const reveals: Partial<Record<StationName, () => void>> = {
    hero: () => paintPortrait($<SVGSVGElement>(heroSheet, '.station-hero-painting'), { ...portraits.profile, animate: true, delay: 0.2 }),
    varal: () => drawSign('varal', true),
    processo: () => drawSign('processo', true),
    process: () => {
      if (reduced) return;
      gsap.fromTo(process.querySelectorAll('.process-flag'), { rotation: 80, autoAlpha: 0, transformOrigin: '8% 100%' }, { rotation: 0, autoAlpha: 1, duration: 1, stagger: 0.18, ease: 'back.out(1.8)', clearProps: 'transform,opacity,visibility' });
    },
    atelie: () => drawSign('atelie', true),
    repos: () => {
      mel.say(pick({ pt: 'quanto código!', en: 'so much code!' }));
      if (reduced) return;
      gsap.fromTo(repos.querySelectorAll('.repo-card'), { y: -30, autoAlpha: 0 }, { y: 0, autoAlpha: 1, duration: 0.7, stagger: 0.06, ease: 'back.out(2)', clearProps: 'transform,opacity,visibility' });
    },
    mail: () => {
      mel.say(pick({ pt: 'deixa um recado!', en: 'leave a note!' }));
      if (!reduced) gsap.fromTo($(mail, '.station-mail-flag'), { rotation: 0 }, { rotation: -80, transformOrigin: '15% 95%', duration: 0.5, yoyo: true, repeat: 3, ease: 'power2.inOut' });
    },
    line: () => {
      if (reduced) return;
      gsap.fromTo(papersHost.children, { rotation: -70, autoAlpha: 0 }, { rotation: 0, autoAlpha: 1, duration: 1.1, stagger: 0.12, ease: 'elastic.out(1, 0.45)', clearProps: 'transform,opacity,visibility' });
    },
    estante: () => drawSign('estante', true),
    lectern: () => {
      renderScene($<SVGSVGElement>(lectern, '.station-lectern-art'), worldProps.lectern(1450), { animate: true, pace: 1.2 });
      mel.say(pick({ pt: 'tem um livro ali!', en: 'there’s a book there!' }));
    },
    sobre: () => drawSign('sobre', true),
    house: () => {
      renderScene($<SVGSVGElement>(house, '.station-house-art'), worldProps.house(1500), { animate: true });
      boardBars?.animate(0.4);
    },
    end: () => renderScene($<SVGSVGElement>(end, 'svg'), worldProps.enso(1700), { animate: true, pace: 0.6 }),
    desk: () => {
      renderScene($<SVGSVGElement>(desk, '.station-desk-art'), worldProps.desk(1750), { animate: true });
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
    const at = (key: Exclude<keyof Mood, 'sun'>) => a[key] + (b[key] - a[key]) * blend;
    const sunAt = (i: number) => a.sun[i] + (b.sun[i] - a.sun[i]) * blend;
    const key = phase.toFixed(3);
    if (key === moodKey) return;
    moodKey = key;
    const { viewport, ground } = world;
    sun.style.transform = `translate3d(${(sunAt(0) * viewport).toFixed(1)}px, ${(sunAt(1) * ground).toFixed(1)}px, 0) scale(${sunAt(2).toFixed(3)})`;
    sun.style.opacity = sunAt(3).toFixed(3);
    pin.style.setProperty('--dusk', at('dusk').toFixed(3));
    veil.style.opacity = at('veil').toFixed(3);
    (['peaks', 'ridge', 'hills'] as const).forEach((name) => (planes[name].style.opacity = at(name).toFixed(3)));
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
    mascot.place(world.stations.desk + 150);
    painter.resize();
    frameAll(root);
    fitSignLabels();

    const distance = world.width - world.viewport;
    moodKey = '';
    setMood(0);
    const setters = {
      peaks: gsap.quickSetter(layers.peaks, 'x', 'px'),
      ridge: gsap.quickSetter(layers.ridge, 'x', 'px'),
      hills: gsap.quickSetter(layers.hills, 'x', 'px'),
      ground: gsap.quickSetter(layers.ground, 'x', 'px'),
      front: gsap.quickSetter(layers.front, 'x', 'px'),
    };
    let wind = 0;
    let windValue = '';
    // --wind is set only on the elements that tilt with it (and does not inherit, see global.css): on a container it
    // restyled every paper's whole subtree each frame. Papers are re-rendered with the language, so they are looked up.
    const setWind = (value: number) => {
      const next = value.toFixed(1);
      if (next === windValue) return;
      windValue = next;
      root.querySelectorAll<HTMLElement>('.line-paper, .station-lectern-page, .station-sign').forEach((element) => element.style.setProperty('--wind', next));
    };
    const frontSkew = gsap.quickTo(layers.front, 'skewX', { duration: 0.9, ease: 'elastic.out(1, 0.35)' });
    gsap.set(layers.front, { transformOrigin: '50% 100%' });
    // onUpdate stops firing with the scroll, so the wind and the grass settle here
    if (settleOnStop) ScrollTrigger.removeEventListener('scrollEnd', settleOnStop);
    settleOnStop = () => {
      wind = 0;
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
        setters.peaks(-offset * PARALLAX.peaks);
        setters.ridge(-offset * PARALLAX.ridge);
        setters.hills(-offset * PARALLAX.hills);
        setters.ground(-offset);
        setters.front(-offset * PARALLAX.front);
        progressFill.style.clipPath = `inset(0 ${(100 - self.progress * 100).toFixed(2)}% 0 0)`;
        setMood(self.progress);

        const velocity = self.getVelocity();
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
          if ((before > mascotX + 6 && screenX <= mascotX + 6) || (before < mascotX - 6 && screenX >= mascotX - 6)) mel.hop(0);
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

  // Hidden desk: paint the sky, spill the ink
  const painter = new InkPainter(paintCanvas, pin);
  function setPainting(value: boolean) {
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
    if (painter.enabled) brushCursor.style.transform = `translate3d(${event.clientX}px, ${event.clientY}px, 0)`;
  };
  window.addEventListener('pointermove', onPointerMove, { passive: true });
  renderScene($<SVGSVGElement>(brushCursor, 'svg'), deskObjects.brush);
  $(desk, '.desk-brush').addEventListener('click', () => setPainting(!painter.enabled));
  $(paintingBar, '[data-clear-sky]').addEventListener('click', () => {
    gsap.to(paintCanvas, { autoAlpha: 0, duration: 0.5, onComplete: () => (painter.clear(), gsap.set(paintCanvas, { autoAlpha: 1 })) });
    sounds.paper();
  });
  window.addEventListener('keydown', (event) => event.key === 'Escape' && painter.enabled && setPainting(false));

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

  $(lectern, '.station-lectern-button').addEventListener('click', () => openBook());

  const raiseFlag = () => gsap.to($(mail, '.station-mail-flag'), { rotation: -80, transformOrigin: '15% 95%', duration: 0.5, ease: 'back.out(2)' });
  const openMail = () => openNotebook(raiseFlag);
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
  const mel = new Mel({ layer: mascotLayer, groundY: () => (world ? world.ground + 4 : pin.clientHeight * 0.8) });
  let melFacing = 1;

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

  renderPapers();
  renderRepos();
  boardBars = renderBoard();
  setup();

  if (!reduced) {
    gsap.fromTo(heroText.children, { autoAlpha: 0, y: 24, filter: 'blur(8px)' }, { autoAlpha: 1, y: 0, filter: 'blur(0px)', duration: 0.9, stagger: 0.1, delay: 0.3, ease: 'power3.out', clearProps: 'all' });
  }

  onLangChange(() => {
    renderPapers();
    renderRepos();
    boardBars = renderBoard();
    if (revealed.has('house')) boardBars.animate();
    frameAll(root);
    fitSignLabels();
  });

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
