import { Application, Assets, Container, Graphics, Matrix, MeshPlane, MeshRope, Point as PixiPoint, Rectangle, Sprite, Texture } from 'pixi.js';
import atlas from '../data/mel-atlas.json';
import type { Point } from './brush';
import { EAR_REST, EYES, PIVOTS, type Bone, type LegName } from './dog-rig';

export type Affine = [number, number, number, number, number, number];

/** Everything the cut-out needs to draw one frame, computed by the rig in mel.ts. */
export interface CutoutFrame {
  bones: Record<Bone, Affine>;
  /** Each leg's joints in rig space, hip or shoulder first. */
  legs: Record<LegName, Point[]>;
  /** The tail's chain in rig space, root first. */
  tail: Point[];
  /** 1 = eyes open, 0 = shut. */
  blink: number;
  eyes: 'open' | 'happy' | 'sleep';
  tongue: boolean;
  shadow: number;
  dust: { x: number; y: number; r: number; alpha: number }[];
  /** Lab overlay: each leg's joints. */
  joints: Point[][] | null;
}

const LINE = 0x151515;
const SHADOW = 0x151515;
const DUST = 0x8d8f8b;
/** The far legs are a shade darker, as they are in the drawing's shadow side. */
const FAR_TINT = 0x8c8d8a;
const TAIL_POINTS = 10;
const LEG_POINTS = 24; // must match CHAIN_POINTS in prototipo/mel-recorte/cut.py
/** Where the body mesh hands over from the hips to the chest, in rig x. */
const SPINE_BLEND = [60, 100];

type PartName = keyof typeof atlas.parts;

const toPixi = (m: Affine) => new Matrix(m[0], m[1], m[2], m[3], m[4], m[5]);
const apply = (m: Affine, x: number, y: number): Point => [m[0] * x + m[2] * y + m[4], m[1] * x + m[3] * y + m[5]];
const multiply = (m: Affine, n: Affine): Affine => [
  m[0] * n[0] + m[2] * n[1],
  m[1] * n[0] + m[3] * n[1],
  m[0] * n[2] + m[2] * n[3],
  m[1] * n[2] + m[3] * n[3],
  m[0] * n[4] + m[2] * n[5] + m[4],
  m[1] * n[4] + m[3] * n[5] + m[5],
];
const invert = (m: Affine): Affine => {
  const det = m[0] * m[3] - m[1] * m[2];
  return [m[3] / det, -m[1] / det, -m[2] / det, m[0] / det, (m[2] * m[5] - m[3] * m[4]) / det, (m[1] * m[4] - m[0] * m[5]) / det];
};
/** The ear bones live in "ear space" (base at 0,0, pointing up); this undoes their rest placement so the cut-out ears,
 * which sit where the drawing has them, only receive the motion. */
const earRest = ([px, py]: Point, degrees: number): Affine => {
  const c = Math.cos((degrees * Math.PI) / 180);
  const s = Math.sin((degrees * Math.PI) / 180);
  return [c, s, -s, c, px, py];
};
const EAR_UNDO = { earNear: invert(earRest(PIVOTS.nearEar, EAR_REST.near)), earFar: invert(earRest(PIVOTS.farEar, EAR_REST.far)) };

/** Uniform Catmull-Rom through the points, 8 samples per span, resampled to `count` evenly spaced points. It mirrors
 * the cut-out script, so a leg's mesh at rest lies exactly over the strip of drawing it was unrolled from. */
function curve(points: Point[], count: number): Point[] {
  const dense: Point[] = [];
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[Math.max(0, i - 1)];
    const p1 = points[i];
    const p2 = points[i + 1];
    const p3 = points[Math.min(points.length - 1, i + 2)];
    for (let step = 0; step < 8; step++) {
      const t = step / 8;
      const at = (k: 0 | 1) => 0.5 * (2 * p1[k] + (-p0[k] + p2[k]) * t + (2 * p0[k] - 5 * p1[k] + 4 * p2[k] - p3[k]) * t * t + (-p0[k] + 3 * p1[k] - 3 * p2[k] + p3[k]) * t ** 3);
      dense.push([at(0), at(1)]);
    }
  }
  dense.push(points[points.length - 1]);
  const lengths = [0];
  for (let i = 1; i < dense.length; i++) lengths.push(lengths[i - 1] + Math.hypot(dense[i][0] - dense[i - 1][0], dense[i][1] - dense[i - 1][1]));
  const total = lengths[lengths.length - 1];
  const out: Point[] = [];
  let j = 0;
  for (let k = 0; k < count; k++) {
    const target = (k / (count - 1)) * total;
    while (j < lengths.length - 2 && lengths[j + 1] < target) j++;
    const t = (target - lengths[j]) / (lengths[j + 1] - lengths[j] || 1);
    out.push([dense[j][0] + (dense[j + 1][0] - dense[j][0]) * t, dense[j][1] + (dense[j + 1][1] - dense[j][1]) * t]);
  }
  return out;
}

/** Mel drawn from André's cut-out pencil drawing with WebGL. The body is a mesh that bends at the spine, each leg and
 * the tail are rope meshes along their joints (so they curve instead of hinging), and head and ears ride on bones. */
export class MelCutout {
  private readonly holders = new Map<'head' | 'earNear' | 'earFar', Container>();
  private readonly body: MeshPlane;
  private readonly bodyRest: Float32Array;
  private readonly legRopes = {} as Record<LegName, PixiPoint[]>;
  private readonly tailPoints: PixiPoint[];
  private readonly lids = new Graphics();
  private readonly tongue = new Graphics();
  private readonly shadow = new Graphics();
  private readonly dust = new Graphics();
  private readonly skeleton = new Graphics();

  private constructor(
    private readonly app: Application,
    texture: Texture,
    scale: number
  ) {
    const unit = atlas.unit;
    const root = new Container();
    root.scale.set(scale);
    app.stage.addChild(root);

    this.shadow.ellipse(0, 0, 40, 2.4).fill({ color: SHADOW, alpha: 0.12 });
    this.shadow.position.set(80, 150.6);
    root.addChild(this.shadow, this.dust);

    const slice = (name: PartName) => {
      const [x, y, w, h] = atlas.parts[name].frame;
      return new Texture({ source: texture.source, frame: new Rectangle(x, y, w, h) });
    };
    // Ropes work in drawing pixels, so they sit in holders scaled back to rig units
    const rope = (name: PartName, count: number, tint?: number) => {
      const points = Array.from({ length: count }, (_, i) => new PixiPoint(i, 0));
      const mesh = new MeshRope({ texture: slice(name), points, textureScale: 0 });
      if (tint) mesh.tint = tint;
      const holder = new Container();
      holder.scale.set(unit);
      holder.addChild(mesh);
      root.addChild(holder);
      return points;
    };
    const bone = (name: 'head' | 'earNear' | 'earFar', extras: Container[] = []) => {
      const holder = new Container();
      const sprite = new Sprite(slice(name));
      const [rx, ry] = (atlas.parts[name] as { rest: number[] }).rest;
      sprite.position.set(rx, ry);
      sprite.scale.set(unit);
      holder.addChild(sprite, ...extras);
      this.holders.set(name, holder);
      root.addChild(holder);
    };

    // Back to front: far legs, tail, body, near hind leg, ears, head, near front leg
    this.legRopes.farRear = rope('leg.farRear', LEG_POINTS, FAR_TINT);
    this.legRopes.farFront = rope('leg.nearFront', LEG_POINTS, FAR_TINT);
    this.tailPoints = rope('tail', TAIL_POINTS);

    this.body = new MeshPlane({ texture: slice('body'), verticesX: 12, verticesY: 8 });
    const [bx, by] = (atlas.parts.body as { rest: number[] }).rest;
    this.body.position.set(bx, by);
    this.body.scale.set(unit);
    const positions = this.body.geometry.getBuffer('aPosition').data as Float32Array;
    this.bodyRest = new Float32Array(positions.length);
    for (let i = 0; i < positions.length; i += 2) {
      this.bodyRest[i] = bx + positions[i] * unit;
      this.bodyRest[i + 1] = by + positions[i + 1] * unit;
    }
    root.addChild(this.body);

    this.legRopes.nearRear = rope('leg.nearRear', LEG_POINTS);
    bone('earFar');
    bone('earNear');
    bone('head', [this.tongue, this.lids]);
    this.legRopes.nearFront = rope('leg.nearFront', LEG_POINTS);
    root.addChild(this.skeleton);

    this.tongue.visible = false;
    // The tongue hangs just under the smile
    this.tongue.ellipse(134.4, 100.6, 1.7, 2.4).fill(0x8d8f8b).stroke({ color: LINE, width: 0.5 });
  }

  static async create(parent: HTMLElement, width: number, height: number, scale: number) {
    const app = new Application();
    await app.init({
      width,
      height,
      backgroundAlpha: 0,
      antialias: true,
      autoDensity: true,
      resolution: Math.min(2, window.devicePixelRatio || 1),
      autoStart: false,
      preference: 'webgl',
    });
    app.canvas.classList.add('mel-canvas');
    parent.append(app.canvas);
    const texture: Texture = await Assets.load({ src: '/images/mel-atlas.webp', data: { autoGenerateMipmaps: true, scaleMode: 'linear' } });
    return new MelCutout(app, texture, scale);
  }

  draw(frame: CutoutFrame) {
    for (const name of ['head', 'earNear', 'earFar'] as const) {
      const matrix = name === 'head' ? frame.bones.skull : multiply(frame.bones[name], EAR_UNDO[name]);
      this.holders.get(name)!.setFromMatrix(toPixi(matrix));
    }
    this.bendBody(frame.bones.hips, frame.bones.chest);
    (Object.keys(this.legRopes) as LegName[]).forEach((leg) => this.follow(this.legRopes[leg], curve(frame.legs[leg], LEG_POINTS)));
    this.follow(this.tailPoints, this.tailPath(frame.tail));
    this.drawLids(frame);
    this.tongue.visible = frame.tongue;

    this.shadow.scale.set(frame.shadow, 1);
    this.dust.clear();
    for (const mote of frame.dust) if (mote.alpha > 0.01) this.dust.circle(mote.x, mote.y, mote.r).fill({ color: DUST, alpha: mote.alpha });

    this.skeleton.clear();
    frame.joints?.forEach((leg, index) => {
      const color = index % 2 ? 0x2b7bd8 : 0xd8402b;
      leg.forEach(([x, y], i) => (i ? this.skeleton.lineTo(x, y) : this.skeleton.moveTo(x, y)));
      this.skeleton.stroke({ color, width: 0.5 });
      leg.forEach(([x, y]) => this.skeleton.circle(x, y, 0.9).fill(color));
    });

    this.app.renderer.render(this.app.stage);
  }

  /** Each vertex of the body follows the hips or the chest, blended along the back, so the spine bends smoothly. */
  private bendBody(hips: Affine, chest: Affine) {
    const buffer = this.body.geometry.getBuffer('aPosition');
    const positions = buffer.data as Float32Array;
    const unit = atlas.unit;
    const [bx, by] = (atlas.parts.body as { rest: number[] }).rest;
    for (let i = 0; i < positions.length; i += 2) {
      const x = this.bodyRest[i];
      const y = this.bodyRest[i + 1];
      const t = Math.min(1, Math.max(0, (x - SPINE_BLEND[0]) / (SPINE_BLEND[1] - SPINE_BLEND[0])));
      const w = t * t * (3 - 2 * t);
      const [hx, hy] = apply(hips, x, y);
      const [cx, cy] = apply(chest, x, y);
      // The plane's vertices are in its own (texture pixel) space; the plane itself sits at the body's rest corner
      positions[i] = (hx + (cx - hx) * w - bx) / unit;
      positions[i + 1] = (hy + (cy - hy) * w - by) / unit;
    }
    buffer.update();
  }

  private follow(points: PixiPoint[], path: Point[]) {
    const unit = atlas.unit;
    points.forEach((point, index) => point.set(path[index][0] / unit, path[index][1] / unit));
  }

  /** The tail rope's points, spread evenly along its chain from a little inside the rump. */
  private tailPath(chain: Point[]): Point[] {
    const lead = atlas.parts.tail.lead * atlas.unit;
    const [r0, r1] = chain;
    const back = Math.hypot(r1[0] - r0[0], r1[1] - r0[1]) || 1;
    const start: Point = [r0[0] - ((r1[0] - r0[0]) / back) * lead, r0[1] - ((r1[1] - r0[1]) / back) * lead];
    return curve([start, ...chain], TAIL_POINTS);
  }

  /** Eyelids in the grey of her face close over the drawn eyes; happy and sleepy eyes get a lash curve. */
  private drawLids({ blink, eyes }: CutoutFrame) {
    const g = this.lids;
    g.clear();
    const closed = eyes === 'open' ? 1 - blink : 1;
    if (closed < 0.04) return;
    for (const eye of [EYES.near, EYES.far]) {
      const top = eye.cy - eye.ry - 0.5;
      const height = (eye.ry * 2 + 1) * closed;
      g.ellipse(eye.cx, top + height / 2, eye.rx + 0.7, height / 2).fill(eye.lid);
      // A few pencil hairs on the lid, so it reads as drawn fur rather than a flat patch
      for (let i = -1; i <= 1; i++) g.moveTo(eye.cx + i * eye.rx * 0.45, top + height * 0.2).lineTo(eye.cx + i * eye.rx * 0.5 - 0.3, top + height * 0.6);
      g.stroke({ color: 0x5c5d5a, width: 0.35 });
      const lashY = top + height;
      if (eyes === 'happy') g.moveTo(eye.cx - eye.rx, eye.cy + 0.6).quadraticCurveTo(eye.cx, eye.cy - eye.ry * 0.9, eye.cx + eye.rx, eye.cy + 0.6);
      else g.moveTo(eye.cx - eye.rx, lashY - 0.6).quadraticCurveTo(eye.cx, lashY + (eyes === 'sleep' ? eye.ry * 0.5 : 0.4), eye.cx + eye.rx, lashY - 0.6);
      g.stroke({ color: LINE, width: 1.1, cap: 'round' });
    }
  }

  destroy() {
    this.app.destroy(true, { children: true, texture: false });
  }
}
