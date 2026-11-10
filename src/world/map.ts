// The baked world (scripts/ink-bake): its two maps and the paintings drawn for them.
import world from '../data/world.json';
import type { LayoutName, WorldLayout } from './layout';

export type { LayoutName, WorldLayout, StationName, SignName, PropSpot, Box } from './layout';

interface InkEntry {
  x: number;
  y: number;
  width: number;
  height: number;
  scales: number[];
  frames: number;
}

const ink = world.ink as Record<string, InkEntry>;
export const FRONT_PARALLAX = world.frontParallax;

/** Below this width-to-height ratio the narrow map is used. Kept equal to the `(max-aspect-ratio: 10/9)` media
 * queries of WorldPage.astro, which pick the same map's paintings before any script runs. */
const NARROW_RATIO = 10 / 9;

export interface View {
  layout: WorldLayout;
  /** Screen pixels per world unit: the world always fills the window's height. */
  zoom: number;
  width: number;
  height: number;
  /** How many world units fit across the window. */
  span: number;
}

export function viewFor(width: number, height: number): View {
  const name: LayoutName = width / height < NARROW_RATIO ? 'narrow' : 'wide';
  const layout = world.layouts[name] as unknown as WorldLayout;
  const zoom = height / layout.height;
  return { layout, zoom, width, height, span: width / zoom };
}

export const inkInfo = (name: string) => ink[name];

/** The painting's file at the density this screen needs: device pixels per world unit, rounded up to a baked scale. */
export function inkUrl(name: string, density: number, frame = 1) {
  const entry = ink[name];
  if (!entry) throw new Error(`No baked ink named ${name}`);
  const scale = entry.scales.find((value) => value >= density * 0.9) ?? entry.scales[entry.scales.length - 1];
  return `/ink/${name}@${scale}x${frame > 1 ? `-f${frame}` : ''}.webp`;
}
