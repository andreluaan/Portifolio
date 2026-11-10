// Props standing in the middle of the floor. They share Mel's layer, so whoever stands nearer the viewer (lower
// feet) is drawn in front, as in the arcade beat 'em ups. Low ones are hopped over, tall ones walked around.
import { depthScale, FLOOR_PROPS, LANE_DEPTH, laneY, type FloorPropKind, type Lane } from '../lib/floor';
import { pick } from '../lib/i18n';
import { unlock } from '../lib/secrets';
import { sounds } from '../lib/sound';
import { inkUrl, type PropSpot } from './map';

interface FloorProp {
  spot: PropSpot;
  kind: FloorPropKind;
  halfWidth: number;
  el: HTMLElement;
  visible: boolean;
  lit: boolean;
  /** Where Mel stood relative to it last frame, to notice when she walks across it. */
  previousSide: number;
}

export interface PropsHost {
  hop(strength: number): void;
  say(text: string): void;
  bark(times: number): void;
}

const RAY_VARIANTS = 4;

export class FloorProps {
  private props: FloorProp[] = [];
  private lastCamera = Number.NaN;
  private firstLight = true;

  constructor(private readonly layer: HTMLElement, private readonly host: PropsHost) {}

  place(spots: PropSpot[], lane: Lane, shrink: number, density: number) {
    this.props.forEach((prop) => prop.el.remove());
    this.props = spots.map((spot) => {
      const kind: FloorPropKind = FLOOR_PROPS[spot.name];
      const size = depthScale(spot.depth) * shrink;
      const baseY = laneY(lane, spot.depth);
      const el = document.createElement('div');
      el.className = 'mundo-prop';
      Object.assign(el.style, { width: `${kind.width * size}px`, height: `${kind.height * size}px`, top: `${baseY - kind.base * size}px`, zIndex: String(Math.round(baseY)) });
      const art = new Image();
      art.alt = '';
      art.decoding = 'async';
      art.loading = 'lazy';
      art.className = 'mundo-prop-art';
      art.src = inkUrl(`prop-${spot.name}-${spot.seed}`, density);
      el.append(art);
      this.layer.append(el);
      const prop: FloorProp = { spot, kind, halfWidth: (kind.width * size) / 2, el, visible: true, lit: false, previousSide: 0 };
      if (kind.light) this.makeLantern(prop, kind.light, size, density);
      return prop;
    });
    this.lastCamera = Number.NaN;
  }

  /** A lantern is a button: a click (or Enter) lights its window, another blows it out. */
  private makeLantern(prop: FloorProp, light: NonNullable<FloorPropKind['light']>, size: number, density: number) {
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
    const flame = new Image();
    flame.alt = '';
    flame.className = 'mundo-prop-flame';
    flame.src = inkUrl('lantern-flame', density * 2);
    const rays = new Image();
    rays.alt = '';
    rays.className = 'mundo-prop-rays';
    el.append(glow, flame, rays);
    const toggle = () => this.toggleLantern(prop, rays, density);
    el.addEventListener('click', toggle);
    el.addEventListener('keydown', (event) => {
      if (event.key !== 'Enter' && event.key !== ' ') return;
      event.preventDefault();
      toggle();
    });
  }

  private toggleLantern(prop: FloorProp, rays: HTMLImageElement, density: number) {
    prop.lit = !prop.lit;
    prop.el.classList.toggle('is-lit', prop.lit);
    prop.el.setAttribute('aria-pressed', String(prop.lit));
    prop.el.setAttribute('aria-label', prop.lit ? pick({ pt: 'apagar a lanterna', en: 'blow out the lantern' }) : pick({ pt: 'acender a lanterna', en: 'light the lantern' }));
    if (!prop.lit) {
      sounds.paper();
      return;
    }
    sounds.light();
    // A different set of rays each time it is lit, brushed on from the window outwards
    rays.src = inkUrl(`lantern-rays-${Math.floor(Math.random() * RAY_VARIANTS)}`, density);
    rays.classList.remove('is-brushed');
    void rays.offsetWidth;
    rays.classList.add('is-brushed');
    if (this.firstLight) {
      this.firstLight = false;
      this.host.say(pick({ pt: 'que luzinha bonita!', en: 'what a pretty light!' }));
    }
    if (this.props.filter((item) => item.kind.light).every((item) => item.lit)) {
      unlock('lanterns');
      this.host.bark(2);
    }
  }

  /** Places the props on screen for a camera position (world units), hiding the ones far outside the view. */
  update(camera: number, span: number) {
    if (camera === this.lastCamera) return;
    this.lastCamera = camera;
    this.props.forEach((prop) => {
      const screenX = prop.spot.x - camera;
      const visible = screenX > -300 && screenX < span + 300;
      if (visible !== prop.visible) {
        prop.visible = visible;
        prop.el.style.visibility = visible ? '' : 'hidden';
      }
      if (visible) prop.el.style.transform = `translate3d(${(screenX - prop.halfWidth).toFixed(1)}px, 0, 0)`;
    });
  }

  /** Low props are hopped over when she walks across them in their row; tall ones push her aside along the depth.
   * Returns the depth she should head for (unchanged when nothing is in the way) and whether she is being pushed. */
  meet(x: number, depth: number, depthGoal: number, airborne: boolean): { depthGoal: number; dodging: boolean } {
    let dodging = false;
    this.props.forEach((prop) => {
      const distance = Math.abs(prop.spot.x - x);
      const reach = prop.halfWidth * 0.7 + 18;
      const inRow = Math.abs(depth - prop.spot.depth) < prop.kind.band;
      const side = Math.sign(x - prop.spot.x) || 1;
      if (prop.kind.tall) {
        const heading = Math.abs(depthGoal - prop.spot.depth) < prop.kind.band + 0.01;
        if ((distance < reach + 40 && heading) || (distance < reach && inRow)) {
          const clearance = prop.kind.band + 0.04;
          let sideOf = depth <= prop.spot.depth ? -1 : 1;
          const edge = prop.spot.depth + sideOf * clearance;
          if (edge < LANE_DEPTH.min || edge > LANE_DEPTH.max) sideOf = -sideOf;
          depthGoal = Math.min(LANE_DEPTH.max, Math.max(LANE_DEPTH.min, prop.spot.depth + sideOf * clearance));
          dodging ||= distance < reach && inRow;
        }
      } else if (inRow && !airborne && prop.previousSide && side !== prop.previousSide && distance < reach + 30) {
        this.host.hop(380);
      }
      prop.previousSide = side;
    });
    return { depthGoal, dodging };
  }
}
