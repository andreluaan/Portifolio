import { SVG_NS, svgElement } from './brush';

/** Baked drawings are cut into tiles that stay inside every phone's texture limit. */
const TILE = 2048;

type Box = { x: number; y: number; width: number; height: number };

const SHAPES = 'path, circle, ellipse, rect, line, polyline, polygon';
/** Above this many pixels per drawing the bake gets softer instead of eating the phone's GPU memory. */
const PIXEL_BUDGET = 12_000_000;
/** How far the ink filters push a stroke past its geometry (the wash displaces up to 14px). */
const FILTER_REACH = 16;
const BOIL_FRAMES = 3;

const generations = new WeakMap<SVGSVGElement, number>();
const bakedUrls = new WeakMap<SVGSVGElement, string[]>();
const queue: (() => Promise<void>)[] = [];
let draining = false;

const idle = () => new Promise<void>((resolve) => ('requestIdleCallback' in window ? requestIdleCallback(() => resolve(), { timeout: 400 }) : setTimeout(resolve, 16)));

async function drain() {
  if (draining) return;
  draining = true;
  // One drawing per idle slot, so a page full of fresh drawings never lands as one long freeze
  while (queue.length) {
    await idle();
    await queue.shift()!().catch(() => {});
  }
  draining = false;
}

/** Turns a finished drawing into pictures: once the strokes stop moving, the live paths and their filters are swapped
 * for a few raster tiles, so scrolling only moves pixels and never re-runs the turbulence. Drawings that use the boil
 * filter get three frames that `startBoiling` cycles, the way hand-drawn animation boils. Call again (or re-render)
 * whenever the drawing changes; an `svg[data-live]` is never baked. */
export function scheduleBake(svg: SVGSVGElement, afterSeconds = 0) {
  const generation = (generations.get(svg) ?? 0) + 1;
  generations.set(svg, generation);
  if (svg.dataset.live !== undefined) return;
  window.setTimeout(() => {
    queue.push(() => (generations.get(svg) === generation ? bakeSvg(svg, generation) : Promise.resolve()));
    void drain();
  }, afterSeconds * 1000 + 120);
}

function userBox(svg: SVGSVGElement): Box {
  const viewBox = svg.viewBox.baseVal;
  return viewBox && viewBox.width ? { x: viewBox.x, y: viewBox.y, width: viewBox.width, height: viewBox.height } : { x: 0, y: 0, width: svg.clientWidth, height: svg.clientHeight };
}

/** Each shape's painted extent in the root's user space, padded for stroke width and filter displacement. */
function extents(svg: SVGSVGElement, shapes: SVGGraphicsElement[]) {
  const toRoot = svg.getScreenCTM()?.inverse();
  return shapes.flatMap((shape) => {
    const box = shape.getBBox();
    const matrix = toRoot && shape.getScreenCTM() ? toRoot.multiply(shape.getScreenCTM()!) : new DOMMatrix();
    const style = getComputedStyle(shape);
    const pad = (style.stroke !== 'none' ? parseFloat(style.strokeWidth) || 0 : 0) + (shape.closest('[filter]') ? FILTER_REACH : 2);
    const corners = [[box.x, box.y], [box.x + box.width, box.y], [box.x, box.y + box.height], [box.x + box.width, box.y + box.height]].map(([x, y]) => new DOMPoint(x, y).matrixTransform(matrix));
    const xs = corners.map((point) => point.x);
    const ys = corners.map((point) => point.y);
    if (!box.width && !box.height) return [];
    return [{ x0: Math.min(...xs) - pad, x1: Math.max(...xs) + pad, y0: Math.min(...ys) - pad, y1: Math.max(...ys) + pad }];
  });
}

/** A standalone copy of the drawing: computed paint inlined (an SVG drawn as an image cannot see the page's CSS) and
 * the reveal masks dropped, since the reveal has already finished. */
function standaloneCopy(svg: SVGSVGElement) {
  const copy = svg.cloneNode(true) as SVGSVGElement;
  const originals = [svg, ...svg.querySelectorAll('*')];
  const copies = [copy, ...copy.querySelectorAll('*')];
  originals.forEach((original, index) => {
    const target = copies[index] as SVGElement;
    target.removeAttribute('class');
    if (target.getAttribute('mask')?.includes('reveal-')) target.removeAttribute('mask');
    if (original.closest('defs')) return;
    const style = getComputedStyle(original);
    const paint = [`opacity:${style.opacity}`, style.display === 'none' ? 'display:none' : ''];
    if (original.matches(SHAPES)) {
      paint.push(`fill:${style.fill}`, `fill-opacity:${style.fillOpacity}`, `stroke:${style.stroke}`, `stroke-width:${style.strokeWidth}`, `stroke-opacity:${style.strokeOpacity}`, `stroke-linecap:${style.strokeLinecap}`, `stroke-linejoin:${style.strokeLinejoin}`);
    }
    target.setAttribute('style', paint.filter(Boolean).join(';'));
  });
  copy.querySelectorAll('mask[id^="reveal-"]').forEach((mask) => mask.remove());
  copy.removeAttribute('style');
  copy.removeAttribute('width');
  copy.removeAttribute('height');
  return copy;
}

const boilSeed = (filters: string, frame: number) => filters.replace(/(id="boil-noise"[^>]*seed=")\d+/, (_, head) => `${head}${frame}`);

async function drawTile(copy: SVGSVGElement, filters: string, box: Box, ratio: number) {
  const width = Math.max(1, Math.ceil(box.width * ratio));
  const height = Math.max(1, Math.ceil(box.height * ratio));
  copy.setAttribute('viewBox', `${box.x} ${box.y} ${box.width} ${box.height}`);
  copy.setAttribute('width', String(width));
  copy.setAttribute('height', String(height));
  copy.setAttribute('preserveAspectRatio', 'none');
  copy.setAttribute('overflow', 'hidden');
  const markup = new XMLSerializer().serializeToString(copy).replace(/(<svg[^>]*>)/, `$1<defs>${filters}</defs>`);
  const source = URL.createObjectURL(new Blob([markup], { type: 'image/svg+xml' }));
  try {
    const image = new Image();
    image.src = source;
    await image.decode();
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    canvas.getContext('2d')!.drawImage(image, 0, 0, width, height);
    return await new Promise<string>((resolve, reject) => canvas.toBlob((blob) => (blob ? resolve(URL.createObjectURL(blob)) : reject(new Error('empty tile'))), 'image/png'));
  } finally {
    URL.revokeObjectURL(source);
  }
}

async function bakeSvg(svg: SVGSVGElement, generation: number) {
  if (!svg.isConnected || svg.ownerSVGElement) return;
  const box = userBox(svg);
  const shapes = [...svg.querySelectorAll<SVGGraphicsElement>(SHAPES)].filter((shape) => !shape.closest('defs, mask, clipPath'));
  // Hidden drawings (a closed book, a page off to the side) have no size to bake at; they stay live until redrawn
  if (!shapes.length || !svg.clientWidth || !svg.clientHeight || !box.width || !box.height) return;

  const spans = extents(svg, shapes);
  const clip = getComputedStyle(svg).overflow !== 'visible';
  const region = {
    x0: clip ? box.x : Math.min(box.x, ...spans.map((span) => span.x0)),
    x1: clip ? box.x + box.width : Math.max(box.x + box.width, ...spans.map((span) => span.x1)),
  };
  let ratio = Math.min(2, window.devicePixelRatio || 1) * Math.max(svg.clientWidth / box.width, svg.clientHeight / box.height);

  // Columns that keep only the band where ink actually is: the ground and the grass are thousands of pixels wide but
  // only a strip tall, and most of the front layer is empty sky
  const columns = (step: number) => {
    const tiles: Box[] = [];
    for (let x = region.x0; x < region.x1; x += step) {
      const inside = spans.filter((span) => span.x1 > x && span.x0 < x + step);
      if (!inside.length) continue;
      let y0 = Math.min(...inside.map((span) => span.y0));
      let y1 = Math.max(...inside.map((span) => span.y1));
      if (clip) [y0, y1] = [Math.max(y0, box.y), Math.min(y1, box.y + box.height)];
      for (let y = y0; y < y1; y += step) tiles.push({ x, y, width: Math.min(step, region.x1 - x), height: Math.min(step, y1 - y) });
    }
    return tiles;
  };
  let tiles = columns(TILE / ratio);
  const area = tiles.reduce((sum, tile) => sum + tile.width * tile.height, 0) * ratio * ratio;
  if (area > PIXEL_BUDGET) {
    ratio *= Math.sqrt(PIXEL_BUDGET / area);
    tiles = columns(TILE / ratio);
  }

  const copy = standaloneCopy(svg);
  const filterMarkup = document.getElementById('bleed')?.parentElement?.innerHTML ?? '';
  const boils = svg.querySelector('[filter="url(#boil)"]') ? BOIL_FRAMES : 1;
  const frames: { url: string; tile: Box; frame: number }[] = [];
  try {
    for (let frame = 0; frame < boils; frame++) {
      const filters = boilSeed(filterMarkup, frame + 1);
      for (const tile of tiles) {
        if (generations.get(svg) !== generation) throw new Error('stale');
        frames.push({ url: await drawTile(copy, filters, tile, ratio), tile, frame });
      }
    }
  } catch {
    frames.forEach(({ url }) => URL.revokeObjectURL(url));
    return;
  }
  if (generations.get(svg) !== generation) return frames.forEach(({ url }) => URL.revokeObjectURL(url));

  bakedUrls.get(svg)?.forEach((url) => URL.revokeObjectURL(url));
  bakedUrls.set(svg, frames.map(({ url }) => url));
  svg.replaceChildren(
    ...frames.map(({ url, tile, frame }) =>
      svgElement('image', {
        href: url,
        x: tile.x,
        y: tile.y,
        width: tile.width,
        height: tile.height,
        preserveAspectRatio: 'none',
        ...(boils > 1 ? { class: `boil-frame boil-frame-${frame + 1}` } : {}),
      })
    )
  );
  svg.dataset.baked = 'true';
}

/** Swaps one boiling shape inside a live drawing (Borrão's body, which squashes every frame) for its three baked boil
 * frames, so the per-frame transforms only move pictures. */
export async function bakeBoilingShape(shape: SVGGraphicsElement, oversample = 1.5) {
  await idle();
  const svg = shape.ownerSVGElement;
  if (!svg || !shape.isConnected || !svg.clientWidth) return;
  const bounds = shape.getBBox();
  const tile = { x: bounds.x - FILTER_REACH, y: bounds.y - FILTER_REACH, width: bounds.width + FILTER_REACH * 2, height: bounds.height + FILTER_REACH * 2 };
  const ratio = Math.min(2, window.devicePixelRatio || 1) * (svg.clientWidth / userBox(svg).width) * oversample;
  const copy = svgElement('svg', { xmlns: SVG_NS });
  const style = getComputedStyle(shape);
  const clone = shape.cloneNode(true) as SVGGraphicsElement;
  clone.removeAttribute('class');
  clone.setAttribute('style', `fill:${style.fill};opacity:${style.opacity}`);
  copy.append(clone);
  const filterMarkup = document.getElementById('bleed')?.parentElement?.innerHTML ?? '';
  const urls: string[] = [];
  for (let frame = 1; frame <= BOIL_FRAMES; frame++) {
    urls.push(await drawTile(copy, boilSeed(filterMarkup, frame), tile, ratio));
  }
  if (!shape.isConnected) return urls.forEach((url) => URL.revokeObjectURL(url));
  const frames = svgElement('g', { class: shape.getAttribute('class') ?? '' });
  urls.forEach((url, index) => svgElement('image', { href: url, ...tile, preserveAspectRatio: 'none', class: `boil-frame boil-frame-${index + 1}` }, frames));
  shape.replaceWith(frames);
}

