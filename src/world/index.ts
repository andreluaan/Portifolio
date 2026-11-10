// The paper world as a little game. Mel is the camera: W A S D (or the arrows) walk her along and across the floor,
// Space makes her jump, E uses the station she stands at, and a tap on the floor sends her there. The page's own
// scroll still works as a shortcut: scrolling runs her along, and walking writes the scroll back, so the scrollbar,
// PageDown, scroll restoration and touch momentum all keep working. Nothing here draws ink: every painting was baked
// at build time (scripts/ink-bake) and is only placed.
import gsap from 'gsap';
import { frameAll, inkSplat, prefersReducedMotion, renderScene, svgElement } from '../lib/brush';
import { openBook, openCharacterSheet, openNotebook } from '../lib/dialogs';
import { paintPortrait } from '../lib/effects';
import { depthAt, depthScale, LANE_DEPTH, laneY, type Lane } from '../lib/floor';
import { pick, t } from '../lib/i18n';
import { Mascot } from '../lib/mascot';
import { Mel } from '../lib/mel';
import type { InkPainter } from '../lib/painting';
import { unlock } from '../lib/secrets';
import { attributeBars, brushOn, portraits } from '../lib/sections';
import { sounds } from '../lib/sound';
import { viewFor, type SignName, type StationName, type View } from './map';
import { FloorProps } from './props';
import { Scenery } from './scenery';

export type { StationName };

const NAV_STATIONS: StationName[] = ['hero', 'line', 'house', 'lectern', 'repos', 'mail'];
const SIGNS: SignName[] = ['varal', 'estante', 'atelie', 'sobre'];
/** Where Mel stands in the view while the scroll leads, as a share of its width. */
const SCROLL_SLOT = { wide: 0.28, narrow: 0.22 };
/** While she leads, the camera only moves once she leaves this stretch of the view. */
const DEADZONE = { wide: [0.22, 0.55], narrow: [0.16, 0.5] };
/** World units per second: walking, the fastest run, and depth crossed per second. */
const WALK_SPEED = 620;
const RUN_SPEED = 1400;
const DEPTH_SPEED = 0.75;
const JUMP_STRENGTH = 560;
/** How close to a station Mel must stand for E to use it. */
const REACH = 260;

const $ = <T extends Element = HTMLElement>(root: ParentNode, selector: string) => root.querySelector<T>(selector)! as T;

export function mountWorld() {
  const root = $(document, '.mundo');
  const pin = $(root, '.mundo-pin');
  const layers = {
    roll: $(root, '.mundo-roll'),
    ground: $(root, '.mundo-ground'),
    floor: $(root, '.mundo-floor'),
    front: $(root, '.mundo-front'),
    mascot: $(root, '.mundo-mascot-layer'),
    sky: $(root, '.mundo-sky'),
  };
  const stationEl = {
    heroSheet: $(root, '.station-hero-sheet'),
    heroText: $(root, '.station-hero-text'),
    line: $(root, '.station-line'),
    house: $(root, '.station-house'),
    board: $(root, '.station-board'),
    lectern: $(root, '.station-lectern'),
    repos: $(root, '.station-repos'),
    mail: $(root, '.station-mail'),
    end: $(root, '.station-end'),
    desk: $(root, '.station-desk'),
  };
  const signs = Object.fromEntries(SIGNS.map((name) => [name, $(root, `[data-sign="${name}"]`)])) as Record<SignName, HTMLElement>;
  const progress = $(root, '.mundo-progress');
  const reduced = prefersReducedMotion();
  const revealed = new Set<StationName>();
  const sectionListeners = new Set<(name: StationName) => void>();

  let view!: View;
  let lane: Lane;
  let walkLength = 0;

  // The game's state, in world units: the camera is the left edge of the view
  let camera = 0;
  let cameraVelocity = 0;
  let melX = 0;
  let melVelocity = 0;
  let facing = 1;
  let depth = LANE_DEPTH.start;
  let depthGoal = depth;
  /** Who leads: the page's scroll (wheel, touch, scrollbar, navigation) or Mel (keys, taps). */
  let leader: 'scroll' | 'mel' = 'scroll';
  let walkTo: number | null = null;
  let writtenScroll = -1;
  let activeSection: StationName = 'hero';

  const scenery = new Scenery(layers);
  const mel = new Mel({
    layer: layers.mascot,
    groundY: () => (lane ? laneY(lane, depth) : 0),
    toLayer: (x, y) => ({ x: x / (view?.zoom ?? 1), y: y / (view?.zoom ?? 1) }),
  });
  const props = new FloorProps(layers.mascot, {
    hop: (strength) => mel.hop(0, strength),
    say: (text) => mel.say(text),
    bark: (times) => mel.bark(times),
  });
  // Borrão lives in his own corner, by the ink bottle on the hidden desk, and wanders only around it
  const deskSpan = () => (view ? [view.layout.stations.desk - 40, view.layout.stations.desk + 300] : [0, 0]);
  const mascot = new Mascot({
    layer: layers.ground,
    groundY: () => (view ? view.layout.ground + 4 : 0),
    minX: () => deskSpan()[0],
    maxX: () => deskSpan()[1],
  });

  // Layout -------------------------------------------------------------------

  /** Shrinks a sign's label until it fits the plank, since translations and late fonts change its width. */
  function fitSignLabels() {
    SIGNS.forEach((name) => {
      const label = $(signs[name], '.station-sign-label');
      label.style.fontSize = '';
      const range = document.createRange();
      range.selectNodeContents(label);
      const textWidth = range.getBoundingClientRect().width / view.zoom;
      const room = label.clientWidth - 8;
      if (textWidth > room) label.style.fontSize = `${(parseFloat(getComputedStyle(label).fontSize) * room) / textWidth}px`;
    });
  }

  function applyView(next: View) {
    const previous = view;
    view = next;
    const { layout, zoom, span } = view;
    lane = { back: layout.ground, front: layout.height };
    walkLength = Math.max(0, (layout.width - span) * zoom);
    // The same variables the head script set before the first paint (Base.astro), kept current on resize; the
    // stations' places come from each map's CSS (layout-css.ts)
    const html = document.documentElement;
    sectionTop = root.offsetTop;
    html.dataset.layout = layout.name;
    html.style.setProperty('--zoom', String(zoom));
    html.style.setProperty('--world-height', `${layout.height}px`);
    html.style.setProperty('--world-width', `${layout.width}px`);
    html.style.setProperty('--front-width', `${layout.frontWidth}px`);
    html.style.setProperty('--view-span', `${span}px`);
    html.style.setProperty('--walk-length', `${walkLength}px`);

    if (!previous || previous.layout !== layout) {
      props.place(layout.props, lane, layout.name === 'narrow' ? 0.8 : 1, zoom * Math.min(window.devicePixelRatio || 1, 2));
      mascot.place(layout.stations.desk + 150);
      previousRocks = layout.rocks.map(() => 0);
    }
    scenery.setView(view);
    mel.setDepthScale(depthScale(depth));

    // Keep the same spot of the world in view across a resize
    const share = previous ? camera / Math.max(1, previous.layout.width - previous.span) : 0;
    camera = clampCamera(share * (layout.width - span));
    melX = previous ? clampMel(melX * (layout.width / previous.layout.width)) : layout.portraitRight + span * 0.05 + 120;
    // On the first layout the page's scroll (restored, or a link's) decides where the walk starts
    if (previous) writeScroll();
  }

  const maxCamera = () => Math.max(0, view.layout.width - view.span);
  const clampCamera = (value: number) => Math.min(maxCamera(), Math.max(0, value));
  /** She never walks over the first picture, nor off the end of the world. */
  const clampMel = (value: number) => Math.min(view.layout.width - 80, Math.max(view.layout.portraitRight + 70, value));
  const clampDepth = (value: number) => Math.min(LANE_DEPTH.max, Math.max(LANE_DEPTH.min, value));
  /** Where the walk's section starts on the page; measured on layout changes only, never in a frame. */
  let sectionTop = 0;
  const scrollTop = () => sectionTop;
  /** The page's scroll, read once at the start of each frame, before anything is written (so it never forces layout). */
  let pageScroll = 0;
  const cameraFromScroll = () => clampCamera((pageScroll - sectionTop) / view.zoom);

  function writeScroll() {
    const y = Math.round(scrollTop() + camera * view.zoom);
    if (Math.abs(window.scrollY - y) < 1) return;
    writtenScroll = y;
    pageScroll = y;
    window.scrollTo(0, y);
  }

  // Input --------------------------------------------------------------------

  const KEY_AXES: Record<string, [side: number, forward: number]> = {
    a: [-1, 0], d: [1, 0], w: [0, -1], s: [0, 1],
    arrowleft: [-1, 0], arrowright: [1, 0], arrowup: [0, -1], arrowdown: [0, 1],
  };
  const heldKeys = new Set<string>();
  const dialogOpen = () => Boolean(document.querySelector('dialog[open]'));
  /** Letters belong to whatever is focused if it takes text; arrows and Space only steer Mel from the page itself. */
  const typing = (target: EventTarget | null) => target instanceof Element && Boolean(target.closest('input, textarea, select, [contenteditable], dialog'));
  const onPage = (target: EventTarget | null) => target === document.body || target === document.documentElement || target === pin;

  window.addEventListener('keydown', (event) => {
    if (event.ctrlKey || event.metaKey || event.altKey || dialogOpen() || typing(event.target) || painter?.enabled) return;
    const key = event.key.toLowerCase();
    const isArrow = key.startsWith('arrow');
    if (key in KEY_AXES && (!isArrow || onPage(event.target))) {
      if (isArrow) event.preventDefault();
      heldKeys.add(key);
      leader = 'mel';
      walkTo = null;
      // A quick tap can start and end between two frames: it still takes one small step
      if (!event.repeat && KEY_AXES[key][1]) depthGoal = clampDepth(depthGoal + KEY_AXES[key][1] * 0.07);
    } else if (key === ' ' && onPage(event.target)) {
      event.preventDefault();
      jump();
    } else if (key === 'e' && !event.repeat) {
      useNearestStation();
    }
  });
  window.addEventListener('keyup', (event) => heldKeys.delete(event.key.toLowerCase()));
  window.addEventListener('blur', () => heldKeys.clear());


  const toWorld = (event: MouseEvent) => {
    const box = pin.getBoundingClientRect();
    return { x: camera + (event.clientX - box.left) / view.zoom, y: (event.clientY - box.top) / view.zoom };
  };
  pin.addEventListener('click', (event) => {
    if (painter?.enabled) return;
    if (event.target instanceof Element && event.target.closest('button, a, input, textarea, label, [role="button"]')) return;
    const point = toWorld(event);
    if (point.y < view.layout.ground - 4) return;
    depthGoal = clampDepth(depthAt(lane, point.y));
    walkTo = clampMel(point.x);
    leader = 'mel';
  });
  pin.addEventListener('pointermove', (event) => view && pin.classList.toggle('is-over-floor', toWorld(event).y >= view.layout.ground - 4), { passive: true });
  // A tap on Mel herself makes her jump (a long press still pets her, see mel.ts)
  mel.el.addEventListener('click', () => jump());

  function jump() {
    if (reduced || mel.isAirborne) return;
    mel.hop(0, JUMP_STRENGTH);
    sounds.pop();
  }

  /** The station Mel stands at, if any, and what using it does. */
  const stationActions: Partial<Record<StationName, () => void>> = {
    line: () => void openBook(),
    lectern: () => void openBook(),
    house: () => void openCharacterSheet(),
    mail: () => openMail(),
    repos: () => $(root, '.station-repos-all').click(),
    desk: () => $(stationEl.desk, '.desk-ink').click(),
  };
  function useNearestStation() {
    const { stations } = view.layout;
    const near = (Object.keys(stationActions) as StationName[])
      .map((name) => ({ name, distance: Math.abs(stations[name] + 120 - melX) }))
      .sort((a, b) => a.distance - b.distance)[0];
    if (near && near.distance < REACH) stationActions[near.name]!();
    else mel.say(pick({ pt: 'aqui não tem nada…', en: 'nothing here…' }));
  }

  // The walk -------------------------------------------------------------------

  let previousRocks: number[] = [];
  let walkingInDepth = false;
  let reachedBack = false;
  let reachedFront = false;
  const paws: HTMLElement[] = [];
  let pawSide = 1;
  let pawTravel = 0;
  let lastFoot: [number, number] | null = null;
  let wind = 0;
  let windValue = '';
  // Live collections: they follow the papers without a selector query each frame
  const windBlown = [root.getElementsByClassName('line-paper'), root.getElementsByClassName('station-sign')];
  // The foreground grass drags behind the walk and springs back (an underdamped spring, in degrees)
  let skew = 0;
  let skewVelocity = 0;
  let lastPaw = 0;

  function setWind(value: number) {
    // Half-degree steps: finer ones restyled the papers on almost every frame for no visible gain
    const next = (Math.round(value * 2) / 2).toFixed(1);
    if (next === windValue) return;
    windValue = next;
    windBlown.forEach((collection) => {
      for (const element of collection) (element as HTMLElement).style.setProperty('--wind', next);
    });
  }

  function stampPaw(x: number, y: number, scale: number) {
    const paw = document.createElement('span');
    paw.className = 'mundo-paw';
    paw.style.transform = `translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, 0) scale(${scale.toFixed(2)})`;
    layers.ground.append(paw);
    paws.push(paw);
    if (paws.length > 24) paws.shift()!.remove();
    paw.addEventListener('animationend', () => {
      paw.remove();
      const index = paws.indexOf(paw);
      if (index >= 0) paws.splice(index, 1);
    }, { once: true });
  }

  function step(_time: number, deltaMs: number) {
    if (!view) return;
    const dt = Math.min(0.05, deltaMs / 1000);
    const { layout, span } = view;
    // Anything that scrolled the page that wasn't Mel walking hands the lead back to the scroll
    const scrolled = window.scrollY;
    if (scrolled !== pageScroll && Math.abs(scrolled - writtenScroll) > 2) {
      leader = 'scroll';
      walkTo = null;
    }
    pageScroll = scrolled;
    const previousCamera = camera;
    const previousMel = melX;

    let side = 0;
    let forward = 0;
    if (!dialogOpen()) {
      heldKeys.forEach((key) => {
        side += KEY_AXES[key][0];
        forward += KEY_AXES[key][1];
      });
    }
    side = Math.sign(side);
    if (forward) depthGoal = clampDepth(depth + Math.sign(forward) * 0.06);
    if (walkTo !== null && !side) {
      const gap = walkTo - melX;
      if (Math.abs(gap) < 12) walkTo = null;
      else side = Math.sign(gap);
    }

    if (leader === 'mel') {
      // She speeds up and slows down like a dog, not a cursor
      const target = side * WALK_SPEED;
      melVelocity += (target - melVelocity) * (1 - Math.exp(-dt * (side ? 6 : 10)));
      if (reduced) melVelocity = target;
      melX = clampMel(melX + melVelocity * dt);
      // The view only follows once she leaves the middle stretch
      const [from, to] = DEADZONE[layout.name];
      const onScreen = melX - camera;
      if (onScreen < span * from) camera = clampCamera(melX - span * from);
      else if (onScreen > span * to) camera = clampCamera(melX - span * to);
      writeScroll();
    } else {
      // The scroll leads: the view eases after it, and she runs to her place in the view
      const target = cameraFromScroll();
      camera = reduced ? target : camera + (target - camera) * (1 - Math.exp(-dt * 14));
      if (Math.abs(target - camera) < 0.05) camera = target;
      const slot = clampMel(camera + span * SCROLL_SLOT[layout.name]);
      const wanted = Math.max(-RUN_SPEED, Math.min(RUN_SPEED, (slot - melX) * 8));
      melVelocity += (wanted - melVelocity) * (1 - Math.exp(-dt * 12));
      melX = reduced ? slot : clampMel(melX + melVelocity * dt);
      // Never left behind off screen, however fast the scroll goes
      melX = Math.min(camera + span * 0.92, Math.max(camera + span * 0.04, melX));
    }
    // Snap to whole device pixels so the floor, the cards and Mel never shimmer against each other
    const pixel = view.zoom * Math.min(window.devicePixelRatio || 1, 2);
    camera = Math.round(camera * pixel) / pixel;
    cameraVelocity = (camera - previousCamera) / Math.max(dt, 1e-3);
    melVelocity = (melX - previousMel) / Math.max(dt, 1e-3);
    if (Math.abs(melVelocity) > 12) facing = Math.sign(melVelocity);

    // Depth: props push her aside, and she walks up and down the floor at her own pace
    const met = props.meet(melX, depth, depthGoal, mel.isAirborne);
    depthGoal = met.depthGoal;
    const gap = depthGoal - depth;
    const depthStep = reduced ? gap : Math.sign(gap) * Math.min(Math.abs(gap), DEPTH_SPEED * (met.dodging ? 2.5 : 1) * dt);
    depth += depthStep;
    if (depthStep) {
      mel.setDepthScale(depthScale(depth));
      walkingInDepth = true;
      if (depth <= LANE_DEPTH.min + 0.01) reachedBack = true;
      if (depth >= LANE_DEPTH.max - 0.01) reachedFront = true;
      if (reachedBack && reachedFront) unlock('depth');
    } else if (walkingInDepth) walkingInDepth = false;
    mel.el.style.zIndex = String(Math.round(laneY(lane, depth)));

    // Rocks at the back of the floor: only a walk along the back runs into them
    layout.rocks.forEach((rockX, index) => {
      const sideOf = Math.sign(melX - rockX) || 1;
      if (depth < 0.3 && previousRocks[index] && sideOf !== previousRocks[index]) mel.hop(0);
      previousRocks[index] = sideOf;
    });

    // Walking up or down the floor moves her legs too, when she isn't walking along it
    const depthPace = walkingInDepth && Math.abs(melVelocity) < 12 ? ((Math.abs(depthStep) * (layout.height - layout.ground)) / dt / 2.4) * facing : 0;
    mel.place(melX - camera, melVelocity - cameraVelocity + depthPace, cameraVelocity, facing);

    // The world itself: one transform per layer
    if (!reduced) {
      const lean = Math.max(-6, Math.min(6, (-cameraVelocity * view.zoom) / 400));
      skewVelocity += (60 * (lean - skew) - 5 * skewVelocity) * dt;
      skew += skewVelocity * dt;
    }
    // Plain transform strings: a tween library parsing transforms each frame cost more than everything it moved
    layers.ground.style.transform = `translate3d(${(-camera).toFixed(2)}px, 0, 0)`;
    layers.front.style.transform = `translate3d(${(-camera * 1.45).toFixed(2)}px, 0, 0) skewX(${skew.toFixed(2)}deg)`;
    scenery.update(camera);
    props.update(camera, span);
    const walked = camera / Math.max(1, maxCamera());
    progress.style.setProperty('--progress', walked.toFixed(4));
    wind += (Math.max(-14, Math.min(14, (cameraVelocity * view.zoom) / 260)) - wind) * 0.2;
    if (Math.abs(cameraVelocity) < 1) wind *= 0.9;
    setWind(wind);

    if (!reduced) {
      const foot: [number, number] = [melX, laneY(lane, depth)];
      if (lastFoot && !mel.isAirborne) pawTravel += Math.hypot(foot[0] - lastFoot[0], foot[1] - lastFoot[1]);
      lastFoot = foot;
      const scale = depthScale(depth);
      // At a gallop the prints would pile up faster than the paper drinks them; a few a second say enough
      if (pawTravel > 26 * scale && performance.now() - lastPaw > 110) {
        lastPaw = performance.now();
        pawTravel = 0;
        pawSide = -pawSide;
        stampPaw(foot[0] - 8 * facing, foot[1] - 3 + pawSide * 3 * scale, scale);
      }
    }

    (Object.keys(layout.stations) as StationName[]).forEach((name) => {
      if (revealed.has(name) || layout.stations[name] - camera > span * 0.85) return;
      revealed.add(name);
      reveals[name]?.();
    });
    const current = [...NAV_STATIONS].reverse().find((name) => camera >= offsetFor(name) - span * 0.3) ?? 'hero';
    if (current !== activeSection) {
      activeSection = current;
      sectionListeners.forEach((listener) => listener(current));
    }
    if (walked > 0.985) unlock('walker');
  }

  /** Where the camera stops to show a station: a little of the way before it. */
  function offsetFor(name: StationName) {
    if (name === 'hero') return 0;
    return clampCamera(view.layout.stations[name] - view.span * 0.12);
  }

  // Stations ---------------------------------------------------------------------

  const boardBars = attributeBars(stationEl.board);
  $(stationEl.board, '[data-open-sheet]').addEventListener('click', () => void openCharacterSheet());
  stationEl.line.querySelectorAll<HTMLButtonElement>('.line-paper').forEach((paper) => {
    const sketch = paper.querySelector<HTMLElement>('.line-paper-sketch');
    paper.addEventListener('mouseenter', () => {
      if (sketch && !reduced) brushOn(sketch);
      sounds.paper();
    });
    paper.addEventListener('click', () => void openBook(paper.dataset.project));
  });
  $(stationEl.lectern, '.station-lectern-button').addEventListener('click', () => void openBook());

  function nudgeMailbox() {
    if (reduced) return;
    gsap.fromTo($(stationEl.mail, '.station-mail-art'), { rotation: -5 }, { rotation: 0, duration: 1.1, ease: 'elastic.out(1.2, 0.25)', transformOrigin: '50% 100%' });
  }
  const openMail = () => void openNotebook(nudgeMailbox);
  $(stationEl.mail, '.station-mail-box').addEventListener('click', openMail);
  $(stationEl.mail, '[data-open-notebook]').addEventListener('click', openMail);
  const copyButton = $(stationEl.mail, '[data-copy-email]');
  copyButton.addEventListener('click', () => {
    const label = copyButton.querySelector('span')!;
    const fallback = () => window.getSelection()?.selectAllChildren($(stationEl.mail, '.station-mail-email'));
    if (!navigator.clipboard) return fallback();
    navigator.clipboard.writeText('andre.luanbq@gmail.com').then(() => {
      label.textContent = t('mail.copied');
      sounds.pop();
      window.setTimeout(() => (label.textContent = t('mail.copy')), 1600);
    }, fallback);
  });

  const brushSign = (name: SignName) => {
    const post = signs[name].querySelector('.station-sign-post');
    if (!post || reduced) return;
    post.classList.add('is-brushing-down');
    brushOn(post);
  };
  const reveals: Partial<Record<StationName, () => void>> = {
    hero: () => paintPortrait($<SVGSVGElement>(stationEl.heroSheet, '.station-hero-painting'), { ...portraits.profile, animate: true, delay: 0.2 }),
    varal: () => {
      brushSign('varal');
      // Once the visitor is walking, Mel tells them the floor goes back and forth too
      window.setTimeout(() => mel.say(t('mundo.depth'), 3600), 900);
    },
    atelie: () => brushSign('atelie'),
    estante: () => brushSign('estante'),
    sobre: () => brushSign('sobre'),
    repos: () => {
      mel.say(pick({ pt: 'quanto código!', en: 'so much code!' }));
      if (reduced) return;
      gsap.fromTo(stationEl.repos.querySelectorAll('.repo-card'), { y: -30, autoAlpha: 0 }, { y: 0, autoAlpha: 1, duration: 0.7, stagger: 0.06, ease: 'back.out(2)', clearProps: 'transform,opacity,visibility' });
    },
    mail: () => {
      mel.say(pick({ pt: 'deixa um recado!', en: 'leave a note!' }));
      nudgeMailbox();
    },
    line: () => {
      if (reduced) return;
      gsap.fromTo(stationEl.line.querySelectorAll('.line-paper'), { rotation: -70, autoAlpha: 0 }, { rotation: 0, autoAlpha: 1, duration: 1.1, stagger: 0.12, ease: 'elastic.out(1, 0.45)', clearProps: 'transform,opacity,visibility' });
    },
    lectern: () => mel.say(pick({ pt: 'tem um livro ali! (aperta E)', en: 'there’s a book there! (press E)' })),
    house: () => boardBars.animate(0.4),
    end: () => {
      const enso = stationEl.end.querySelector('.station-end-enso');
      if (enso && !reduced) brushOn(enso);
    },
    desk: () => {
      mascot.say(t('mundo.desk'), 2600);
      // Mel spots her old friend in his corner
      mel.bark(2);
    },
  };

  // Hidden desk: paint the sky, spill the ink. The painter (and its full-screen canvas) is made on first use.
  const paintCanvas = $<HTMLCanvasElement>(root, '.mundo-paint');
  const paintingBar = $(root, '.mundo-painting-bar');
  const brushCursor = $(root, '.mundo-brush-cursor');
  let painter: InkPainter | null = null;
  let inkSpilled = false;
  async function setPainting(value: boolean) {
    if (!painter) {
      const { InkPainter } = await import('../lib/painting');
      painter = new InkPainter(paintCanvas, pin);
      painter.resize();
    }
    painter.enabled = value;
    root.classList.toggle('is-painting', value);
    paintingBar.hidden = !value;
    gsap.to($(stationEl.desk, '.desk-brush'), { autoAlpha: value ? 0.15 : 1, duration: 0.3 });
    if (value) {
      sounds.brush();
      frameAll(paintingBar);
      mascot.say(pick({ pt: 'pinta o céu todo!', en: 'paint the whole sky!' }));
    }
  }
  window.addEventListener('pointermove', (event) => {
    if (painter?.enabled) brushCursor.style.transform = `translate3d(${event.clientX}px, ${event.clientY}px, 0)`;
  }, { passive: true });
  $(stationEl.desk, '.desk-brush').addEventListener('click', () => void setPainting(!painter?.enabled));
  $(paintingBar, '[data-clear-sky]').addEventListener('click', () => {
    gsap.to(paintCanvas, { autoAlpha: 0, duration: 0.5, onComplete: () => (painter?.clear(), gsap.set(paintCanvas, { autoAlpha: 1 })) });
    sounds.paper();
  });
  window.addEventListener('keydown', (event) => event.key === 'Escape' && painter?.enabled && void setPainting(false));
  $(stationEl.desk, '.desk-ink').addEventListener('click', () => {
    const bottle = $(stationEl.desk, '.desk-ink');
    inkSpilled = !inkSpilled;
    gsap.to(bottle, { rotation: inkSpilled ? 96 : 0, y: inkSpilled ? 54 : 0, x: inkSpilled ? 30 : 0, duration: inkSpilled ? 0.5 : 0.7, ease: inkSpilled ? 'power3.in' : 'back.out(2)', transformOrigin: '80% 95%' });
    if (!inkSpilled) return;
    sounds.splat();
    unlock('spill');
    // The one drawing still brushed live: every spill lands differently
    const splat = svgElement('svg', { class: 'ink desk-splat', viewBox: '-110 -70 220 140', 'aria-hidden': 'true' });
    stationEl.desk.append(splat);
    renderScene(splat, inkSplat(0, 0, 60, Math.floor(Math.random() * 999)), { animate: true, pace: 2.5 });
    gsap.fromTo(splat, { scale: 0.3, transformOrigin: '20% 50%' }, { scale: 1, duration: 0.9, ease: 'power2.out' });
    window.setTimeout(() => mascot.say(pick({ pt: 'opa! não fui eu', en: 'oops! wasn’t me' })), 700);
  });

  // Stations far off to either side stop animating and drop their drawings from paint; buttons stay focusable.
  const nearPieces = new Map<Element, Set<Element>>();
  const farAway = new IntersectionObserver(
    (entries) =>
      entries.forEach((entry) => {
        const station = entry.target.parentElement!;
        const near = nearPieces.get(station)!;
        if (entry.isIntersecting) near.add(entry.target);
        else near.delete(entry.target);
        station.classList.toggle('is-far', !near.size);
        if (station === stationEl.desk) near.size ? mascot.resume() : mascot.pause();
      }),
    { rootMargin: '0px 50% 0px 50%' }
  );
  root.querySelectorAll('.mundo-station').forEach((station) => {
    nearPieces.set(station, new Set());
    [...station.children].forEach((piece) => farAway.observe(piece));
  });

  // Keyboard focus inside a station walks the view there, so tabbing through the world never leaves it off screen
  root.addEventListener('focusin', (event) => {
    if (!view || !(event.target instanceof Element)) return;
    const station = event.target.closest<HTMLElement>('.mundo-station');
    const name = (Object.keys(stationEl) as (keyof typeof stationEl)[]).find((key) => stationEl[key] === station);
    const map: Partial<Record<keyof typeof stationEl, StationName>> = { heroText: 'hero', heroSheet: 'hero', line: 'line', house: 'house', lectern: 'lectern', repos: 'repos', mail: 'mail', end: 'end', desk: 'desk' };
    const target = name && map[name];
    if (target) api.goTo(target, true);
  });

  // Start ------------------------------------------------------------------------

  applyView(viewFor(pin.clientWidth, pin.clientHeight));
  pageScroll = window.scrollY;
  camera = cameraFromScroll();
  melX = clampMel(camera + view.span * SCROLL_SLOT[view.layout.name]);
  fitSignLabels();
  frameAll(root);
  gsap.ticker.add(step, false, true);

  if (!reduced) {
    gsap.fromTo(stationEl.heroText.children, { autoAlpha: 0, y: 24 }, { autoAlpha: 1, y: 0, duration: 0.9, stagger: 0.1, delay: 0.3, ease: 'power3.out', clearProps: 'all' });
  }
  document.fonts?.ready.then(() => {
    fitSignLabels();
    frameAll(root);
  });

  let resizeTimer = 0;
  window.addEventListener('resize', () => {
    // Mobile browsers resize whenever the URL bar shows or hides; the view is 100svh, so nothing changes then
    if (pin.clientWidth === view.width && pin.clientHeight === view.height) return;
    window.clearTimeout(resizeTimer);
    resizeTimer = window.setTimeout(() => {
      applyView(viewFor(pin.clientWidth, pin.clientHeight));
      fitSignLabels();
    }, 200);
  });

  window.setTimeout(() => mel.say(pick({ pt: 'anda comigo: A D ou ← →, espaço pula', en: 'walk with me: A D or ← →, space jumps' }), 3200), 1500);

  const api = {
    /** Takes the view to a station: the page scrolls there and Mel runs along. */
    goTo(name: StationName, immediate = false) {
      if (!view) return;
      walkTo = null;
      leader = 'scroll';
      const y = scrollTop() + offsetFor(name) * view.zoom;
      gsap.killTweensOf(scrollProxy);
      if (immediate || reduced) {
        window.scrollTo(0, y);
        return;
      }
      scrollProxy.y = window.scrollY;
      gsap.to(scrollProxy, { y, duration: 1.6, ease: 'power2.inOut', onUpdate: () => window.scrollTo(0, scrollProxy.y) });
    },
    has(name: string): name is StationName {
      return Boolean(view?.layout.stations && name in view.layout.stations);
    },
    onSection(listener: (name: StationName) => void) {
      sectionListeners.add(listener);
      listener(activeSection);
    },
  };
  const scrollProxy = { y: 0 };
  // A wheel or a touch interrupts a navigation in progress, as a native smooth scroll would
  ['wheel', 'touchstart'].forEach((type) => window.addEventListener(type, () => gsap.killTweensOf(scrollProxy), { passive: true }));
  return api;
}
