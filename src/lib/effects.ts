import gsap from 'gsap';
import { centerlineOf, prefersReducedMotion, svgElement, type Point } from './brush';

/** Reveals a raster portrait with broad, displaced brush sweeps. Returns the reveal duration in seconds. */
export function paintPortrait(
  target: SVGSVGElement,
  { href, width, height, animate = true, delay = 0 }: { href: string; width: number; height: number; animate?: boolean; delay?: number }
) {
  target.replaceChildren();
  const image = svgElement('image', { href, x: 0, y: 0, width, height, preserveAspectRatio: 'xMidYMid slice' });
  if (!animate || prefersReducedMotion()) {
    target.append(image);
    return 0;
  }

  const id = `portrait-mask-${Math.random().toString(36).slice(2, 8)}`;
  const defs = svgElement('defs', {}, target);
  const mask = svgElement('mask', { id, maskUnits: 'userSpaceOnUse', x: 0, y: 0, width, height }, defs);
  const group = svgElement('g', { filter: 'url(#brush-mask)' }, mask);
  const sweeps: Point[][] = [
    [[0.45, 0.06], [0.62, 0.12], [0.7, 0.22], [0.6, 0.3]],
    [[0.3, 0.26], [0.5, 0.33], [0.78, 0.37], [0.92, 0.46]],
    [[0.25, 0.42], [0.42, 0.58], [0.58, 0.7], [0.85, 0.72]],
    [[0.92, 0.55], [0.78, 0.72], [0.62, 0.88], [0.45, 1]],
    [[0.2, 0.65], [0.34, 0.84], [0.32, 1.02]],
    [[0.62, 0.8], [0.86, 0.9], [0.95, 1.04]],
    [[0.1, 0.2], [0.5, 0.5], [0.98, 0.28]],
    [[0.08, 0.95], [0.5, 0.65], [0.98, 0.95]],
  ];
  const brushWidth = Math.max(width, height) * 0.24;
  let clock = delay;
  sweeps.forEach((relative, index) => {
    const points = relative.map(([x, y]) => [x * width, y * height] as Point);
    const trail = svgElement(
      'path',
      {
        d: `M${centerlineOf(points).map((p) => p.join(' ')).join('L')}`,
        fill: 'none',
        stroke: '#fff',
        'stroke-width': index > 5 ? brushWidth * 1.4 : brushWidth,
        'stroke-linecap': 'round',
        pathLength: 1,
      },
      group
    );
    trail.style.strokeDasharray = '1.02';
    trail.style.strokeDashoffset = '1.02';
    trail.style.animation = `ink-draw 0.6s cubic-bezier(.5,.1,.3,1) ${clock}s forwards`;
    clock += 0.2;
  });
  const settle = svgElement('rect', { x: -10, y: -10, width: width + 20, height: height + 20, fill: '#fff', opacity: 0 }, mask);
  gsap.to(settle, { attr: { opacity: 1 }, duration: 0.6, delay: clock + 0.4 });
  image.setAttribute('mask', `url(#${id})`);
  target.append(image);
  return clock + 1;
}

let overlay: SVGSVGElement | null = null;

function getOverlay() {
  if (overlay) return overlay;
  overlay = svgElement('svg', { class: 'ink-transition', 'aria-hidden': 'true' });
  document.body.append(overlay);
  return overlay;
}

/** Floods the screen with an ink blot from `origin`, runs `swap` while covered, then lets paper bleed back in. */
export function inkTransition(origin: { x: number; y: number }, swap: () => void | Promise<void>) {
  if (prefersReducedMotion()) {
    return Promise.resolve(swap());
  }
  const svg = getOverlay();
  const width = window.innerWidth;
  const height = window.innerHeight;
  svg.setAttribute('viewBox', `0 0 ${width} ${height}`);
  svg.replaceChildren();
  const cover = Math.hypot(Math.max(origin.x, width - origin.x), Math.max(origin.y, height - origin.y)) * 1.35;
  const inkBlot = svgElement('circle', { cx: origin.x, cy: origin.y, r: 0, class: 'ink-ink', filter: 'url(#blot-edge)' }, svg);
  const droplets = Array.from({ length: 9 }, () => {
    const angle = Math.random() * Math.PI * 2;
    return svgElement('circle', { cx: origin.x, cy: origin.y, r: 4 + Math.random() * 10, class: 'ink-ink', 'data-angle': angle }, svg);
  });
  const paperBlot = svgElement('circle', { cx: width / 2, cy: height / 2, r: 0, class: 'ink-paper', filter: 'url(#blot-edge)' }, svg);
  svg.classList.add('is-active');

  return new Promise<void>((resolve) => {
    const timeline = gsap.timeline({
      onComplete: () => {
        svg.classList.remove('is-active');
        svg.replaceChildren();
        resolve();
      },
    });
    timeline.to(inkBlot, { attr: { r: cover }, duration: 0.6, ease: 'power3.in' }, 0);
    droplets.forEach((drop) => {
      const angle = Number(drop.getAttribute('data-angle'));
      const reach = 80 + Math.random() * 180;
      timeline.to(drop, { attr: { cx: origin.x + Math.cos(angle) * reach, cy: origin.y + Math.sin(angle) * reach }, duration: 0.45, ease: 'power2.out' }, 0);
    });
    timeline.add(async () => {
      timeline.pause();
      await swap();
      timeline.resume();
    }, 0.62);
    timeline.to(paperBlot, { attr: { r: Math.hypot(width, height) * 0.75 }, duration: 0.7, ease: 'power2.inOut' }, 0.66);
  });
}

let boilTimer = 0;

/** Cycles the turbulence seed behind `filter="url(#boil)"` so linework trembles like hand-drawn animation. */
export function startBoiling() {
  if (prefersReducedMotion() || boilTimer) return;
  const noise = document.getElementById('boil-noise');
  if (!noise) return;
  let seed = 1;
  boilTimer = window.setInterval(() => {
    if (document.hidden) return;
    seed = (seed % 3) + 1;
    noise.setAttribute('seed', String(seed));
  }, 120);
}
