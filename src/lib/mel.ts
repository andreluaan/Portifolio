import gsap from 'gsap';
import { brushPath, prefersReducedMotion, svgElement, type Point } from './brush';
import { DOG_VIEW, EAR_REST, LEG_RIGS, PIVOTS, type Bone, type LegName } from './dog-rig';
import type { MelCutout } from './mel-cutout';
import { pick, t } from './i18n';
import { unlock } from './secrets';
import { sounds } from './sound';

/** The 200×160 rig is shown at 140×112 px: she reads a little bigger than Borrão's 64 px box. */
const SCALE = 0.7;
const DUST_POOL = 10;
const GRAVITY = 2400;
const SLEEP_AFTER = 28_000;
const PETS_FOR_SECRET = 5;

type Posture = 'stand' | 'sit' | 'lie';
type Action = 'tilt' | 'bark' | 'pet' | 'startle' | 'bow' | 'sniff' | 'scratch' | 'zoom' | 'lick';
type Eyes = 'open' | 'happy' | 'sleep';

interface Pose {
  bodyX: number;
  bodyY: number;
  pitch: number;
  neck: number;
  tilt: number;
  earOpen: number;
  tail: number;
  wagAmp: number;
  wagHz: number;
  jaw: number;
  /** How far the hind and front paws sit from where the drawing has them. */
  rearX: number;
  rearY: number;
  frontX: number;
  frontY: number;
}

// Positive tail angles lift it from its low, backwards rest (as in the pencil reference)
const REST: Pose = { bodyX: 0, bodyY: 0, pitch: 0, neck: 0, tilt: 0, earOpen: 0, tail: 0, wagAmp: 12, wagHz: 3, jaw: 0, rearX: 0, rearY: 0, frontX: 0, frontY: 0 };

const POSTURES: Record<Posture, Partial<Pose>> = {
  stand: {},
  sit: { pitch: -22, bodyX: 3, bodyY: 7, rearX: 7, rearY: 3, frontX: 1.8, frontY: 0, tail: 34, wagAmp: 10, wagHz: 2.5 },
  lie: { bodyY: 13, rearX: 11, rearY: 5, frontX: 13, frontY: 3.2, neck: 14, tilt: 6, earOpen: 26, tail: -6, wagAmp: 4, wagHz: 1.5 },
};

/** Foot timing per gait (Abourachid 2003: diagonals pair up in the trot; stance time drops as speed rises).
 * Her legs are almost straight at rest, so longer strides only reach the ground if the body crouches a little. */
const GAITS = {
  walk: { stride: 12, maxStride: 16, crouch: 1.5, duty: 0.62, lift: 3.4, bob: 0.7, minPeriod: 0.38, offsets: { nearRear: 0, nearFront: 0.25, farRear: 0.5, farFront: 0.75 } },
  trot: { stride: 15, maxStride: 20, crouch: 2.5, duty: 0.45, lift: 5, bob: 1.2, minPeriod: 0.26, offsets: { nearRear: 0, nearFront: 0.5, farRear: 0.5, farFront: 0 } },
  gallop: { stride: 19, maxStride: 24, crouch: 4, duty: 0.3, lift: 6.5, bob: 1.8, minPeriod: 0.22, offsets: { nearRear: 0, nearFront: 0.6, farRear: 0.1, farFront: 0.5 } },
};
type GaitName = keyof typeof GAITS;

/** 2D affine matrix in SVG order: x' = a·x + c·y + e, y' = b·x + d·y + f. */
type Matrix = [number, number, number, number, number, number];
const multiply = (m: Matrix, n: Matrix): Matrix => [
  m[0] * n[0] + m[2] * n[1],
  m[1] * n[0] + m[3] * n[1],
  m[0] * n[2] + m[2] * n[3],
  m[1] * n[2] + m[3] * n[3],
  m[0] * n[4] + m[2] * n[5] + m[4],
  m[1] * n[4] + m[3] * n[5] + m[5],
];
const chain = (...matrices: Matrix[]) => matrices.reduce(multiply);
const translate = (x: number, y: number): Matrix => [1, 0, 0, 1, x, y];
const rotate = (degrees: number, [px, py]: Point = [0, 0]): Matrix => {
  const c = Math.cos((degrees * Math.PI) / 180);
  const s = Math.sin((degrees * Math.PI) / 180);
  return [c, s, -s, c, px - c * px + s * py, py - s * px - c * py];
};
const scale = (sx: number, sy: number, [px, py]: Point = [0, 0]): Matrix => [sx, 0, 0, sy, px - sx * px, py - sy * py];
const apply = (m: Matrix, x: number, y: number): Point => [m[0] * x + m[2] * y + m[4], m[1] * x + m[3] * y + m[5]];

const deg = (radians: number) => (radians * 180) / Math.PI;
const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));
const mix = (a: number, b: number, amount: number) => a + (b - a) * amount;

export interface MelOptions {
  layer: HTMLElement;
  /** Pixels per rig unit; the lab shows her bigger than the world does. */
  scale?: number;
  groundY: () => number;
  startX?: number;
  before?: Element;
}

export class Mel {
  readonly el: HTMLDivElement;
  private readonly reduced = prefersReducedMotion();
  private readonly groundY: () => number;
  private readonly scale: number;
  private readonly dust = Array.from({ length: DUST_POOL }, () => ({ x: 0, y: 0, vx: 0, vy: 0, r: 1, life: 0, age: 1 }));
  /** The WebGL cut-out, loaded lazily so the page never waits for it. */
  private cutout: MelCutout | null = null;
  private dustTimer = 0;
  private readonly bubble: HTMLDivElement;

  private pose: Pose = { ...REST };
  private velocity: Pose = Object.fromEntries(Object.keys(REST).map((key) => [key, 0])) as unknown as Pose;
  private posture: Posture = 'stand';
  private sleeping = false;
  private action: { name: Action; start: number; end: number } | null = null;
  private eyes: Eyes = 'open';

  private x: number;
  private vx = 0;
  private targetX: number;
  private groundSpeed = 0;
  private facing = 1;
  private leaderX = 0;
  private lift = 0;
  private liftVelocity = 0;
  private airborne = false;
  private squash = { x: 1, y: 1 };

  private gait: GaitName = 'walk';
  private gaitWeight = 0;
  private phase = 0;
  private stride: number = GAITS.walk.stride;
  private offsets = { ...GAITS.walk.offsets };
  private ears = { near: 0, far: 0, nearVelocity: 0, farVelocity: 0 };
  private previousHead = 0;
  private previousTravel = 0;
  private lean = 0;
  private previousBodyVelocity = 0;
  private look = { x: 0, y: 0, neck: 0 };
  private pointer: { x: number; y: number } | null = null;

  private clock = 0;
  private lastInteraction = performance.now();
  private idleTime = 0;
  private nextIdleEvent = 3;
  private nextBlink = 2;
  private blinkStart = -1;
  private boilTimer = 0;
  private boilIndex = 0;
  private petTimer = 0;
  private petStartedAt = 0;
  private pets = 0;
  private pokes: number[] = [];
  private scheduled: { at: number; run: () => void }[] = [];
  private destroyed = false;

  constructor(options: MelOptions) {
    this.groundY = options.groundY;
    this.scale = options.scale ?? SCALE;
    this.x = options.startX ?? 120;
    this.targetX = this.x;

    this.el = document.createElement('div');
    this.el.className = 'mel';
    this.el.setAttribute('role', 'button');
    this.el.tabIndex = 0;
    this.el.setAttribute('aria-label', t('mel.name'));
    this.el.style.width = `${DOG_VIEW.width * this.scale}px`;
    this.el.style.height = `${DOG_VIEW.height * this.scale}px`;
    const flip = document.createElement('div');
    flip.className = 'mel-flip';
    import('./mel-cutout')
      .then(({ MelCutout }) => MelCutout.create(flip, DOG_VIEW.width * this.scale, DOG_VIEW.height * this.scale, this.scale))
      .then((cutout) => {
        if (this.destroyed) return cutout.destroy();
        this.cutout = cutout;
        this.render();
      });
    this.bubble = document.createElement('div');
    this.bubble.className = 'mascot-bubble mel-bubble';
    this.bubble.hidden = true;
    this.el.append(flip, this.bubble);
    options.layer.insertBefore(this.el, options.before ?? null);

    const june = new Date().getMonth() === 5;
    this.el.classList.toggle('is-june', june);
    this.bindEvents();

    if (this.reduced) {
      // A still portrait: sitting, head tilted towards Borrão.
      this.posture = 'sit';
      Object.assign(this.pose, REST, POSTURES.sit, { tilt: 14, earOpen: -14, neck: -4 });
      this.render();
    } else {
      gsap.ticker.add(this.tick);
    }
  }

  destroy() {
    this.destroyed = true;
    gsap.ticker.remove(this.tick);
    window.removeEventListener('pointermove', this.onWindowPointerMove);
    window.removeEventListener('keydown', this.onWindowKey);
    this.cutout?.destroy();
    this.el.remove();
  }

  // Public API --------------------------------------------------------------

  /** Called on every world update when she leads the walk herself: she keeps to `x` and faces where the world goes. */
  walk(x: number, facing: number, speed: number) {
    this.follow(x, facing, speed, 0);
  }

  /** Called on every world update: Mel trails Borrão on the side he walks away from, the gap breathing with speed. */
  follow(leaderX: number, leaderFacing: number, speed: number, fixedGap?: number) {
    this.leaderX = leaderX;
    this.groundSpeed = speed;
    const pace = Math.abs(speed);
    const gap = fixedGap ?? (pace < 8 ? 48 : pace < 90 ? 70 : 90);
    this.targetX = leaderX - leaderFacing * gap;
    if (pace > 8) this.wake();
    if (this.reduced) {
      this.x = Math.max(this.minX, this.targetX);
      this.facing = Math.sign(leaderX - this.x) || 1;
      this.render();
    }
  }

  /** Follow-the-leader hop: Borrão jumps a rock, she jumps it a beat later. */
  hop(delay = 0.12, strength = 420) {
    if (this.reduced || this.airborne || this.sleeping) return;
    this.later(delay, () => {
      this.posture = 'stand';
      this.squash = { x: 1.06, y: 0.9 };
      this.later(0.12, () => {
        this.airborne = true;
        this.liftVelocity = strength;
        this.squash = { x: 0.94, y: 1.08 };
        this.ears.nearVelocity -= 260;
        this.ears.farVelocity += 260;
      });
    });
  }

  /** Reactions to what Borrão does. */
  react(event: 'say' | 'poke' | 'carried' | 'dropped' | 'knocked' | 'sleep' | 'wake') {
    if (this.reduced) return;
    if (event === 'sleep') return this.lieDown(true);
    this.wake();
    if (event === 'say') this.start('tilt', 1.6);
    if (event === 'poke') this.start('bow', 1.2);
    if (event === 'carried') this.bark(3);
    if (event === 'dropped' || event === 'knocked') {
      this.start('sniff', 1.2);
      this.later(1.3, () => this.start('lick', 1.2));
    }
  }

  pet() {
    this.wake();
    if (this.reduced) return this.showHeart();
    this.start('pet', 2.6);
    this.later(1.2, () => this.showHeart());
  }

  poke() {
    this.wake();
    sounds.pop();
    const now = this.clock;
    this.pokes = [...this.pokes.filter((time) => now - time < 2), now];
    if (this.reduced) return this.say('?');
    if (this.pokes.length >= 3) {
      this.pokes = [];
      this.zoomies();
      return;
    }
    this.start('startle', 0.35);
    this.later(0.35, () => this.start('bow', 1));
  }

  bark(times = 1) {
    if (this.reduced) return this.say(pick({ pt: 'au!', en: 'woof!' }));
    this.wake();
    this.start('bark', 0.12 + times * 0.28);
    this.say(Array.from({ length: times }, () => pick({ pt: 'au!', en: 'woof!' })).join(' '), 1200);
    for (let i = 0; i < times; i++) this.later(0.1 + i * 0.28, () => sounds.bark());
  }

  zoomies() {
    this.wake();
    this.start('zoom', 2.6);
    this.bark(2);
  }

  /** Lab helpers: jump straight into a posture or action. */
  setPosture(posture: Posture, sleeping = false) {
    this.posture = posture;
    this.sleeping = sleeping;
    this.action = null;
  }

  perform(action: Action, seconds = 1.6) {
    this.wake();
    if (action === 'scratch') this.posture = 'sit';
    this.start(action, seconds);
  }

  /** An invisible wall, in screen pixels: she never goes left of it (the world keeps it at the portrait's right edge,
   * so she never walks over the first picture). */
  setWall(screenX: number) {
    // Her drawing fills about three quarters of her box, centred; the rest is a small gap before the wall
    this.minX = screenX + DOG_VIEW.width * this.scale * 0.43;
  }

  private minX = -Infinity;

  /** Lab only: draw the skeleton's joints over the drawing. */
  showSkeleton = false;
  private frozen = false;

  /** Lab only: stop the clock and pose her at one moment of the gait, like scrubbing an animation timeline. */
  inspect(phase: number, speed: number) {
    this.frozen = true;
    this.groundSpeed = speed;
    for (let i = 0; i < 90; i++) {
      this.groundSpeed = speed;
      this.update(1 / 60);
    }
    this.phase = phase;
    this.render();
  }

  resume() {
    this.frozen = false;
  }

  toggleHat(on = !this.el.classList.contains('is-june')) {
    this.el.classList.toggle('is-june', on);
  }

  // Behaviour ---------------------------------------------------------------

  private start(name: Action, seconds: number) {
    if (this.sleeping) this.wake();
    if (name !== 'zoom' && name !== 'tilt' && this.posture === 'lie') this.posture = 'stand';
    this.action = { name, start: this.clock, end: this.clock + seconds };
  }

  private later(seconds: number, run: () => void) {
    this.scheduled.push({ at: this.clock + seconds, run });
  }

  private wake() {
    this.lastInteraction = performance.now();
    this.idleTime = 0;
    if (this.sleeping || this.posture === 'lie') {
      this.sleeping = false;
      this.posture = 'stand';
      this.ears.nearVelocity -= 180;
    }
  }

  private lieDown(sleep: boolean) {
    this.action = null;
    this.posture = 'lie';
    this.later(1.4, () => {
      if (this.posture === 'lie') this.sleeping = sleep;
    });
  }

  say(text: string, duration = 1400) {
    this.bubble.textContent = text;
    this.bubble.hidden = false;
    this.bubble.classList.remove('is-popping');
    void this.bubble.offsetWidth;
    this.bubble.classList.add('is-popping');
    this.later(duration / 1000, () => (this.bubble.hidden = true));
  }

  private showHeart() {
    const heart = svgElement('svg', { class: 'mel-heart ink', viewBox: '0 0 24 22', 'aria-hidden': 'true' });
    svgElement('path', { d: brushPath([[12, 19], [3, 10], [4, 4], [9, 3], [12, 7], [15, 3], [20, 4], [21, 10], [12, 19]], 2.2, { seed: 77 + this.pets, start: 0.05, end: 0.1 }), class: 'ink-ink' }, heart);
    this.el.append(heart);
    window.setTimeout(() => heart.remove(), 1500);
    sounds.pop();
    if (++this.pets === PETS_FOR_SECRET) unlock('carinho');
  }

  private bindEvents() {
    // Hovering her head (or a long press on touch) is a pet; a plain click is a poke.
    let pressTimer = 0;
    let pressed = false;
    let petted = false;
    this.el.addEventListener('pointerenter', (event) => {
      if (event.pointerType !== 'mouse') return;
      this.petStartedAt = performance.now();
      window.clearTimeout(this.petTimer);
      this.petTimer = window.setTimeout(() => this.pet(), 600);
    });
    this.el.addEventListener('pointerleave', () => window.clearTimeout(this.petTimer));
    this.el.addEventListener('pointerdown', (event) => {
      pressed = true;
      petted = false;
      if (event.pointerType === 'mouse') return;
      pressTimer = window.setTimeout(() => {
        petted = true;
        this.pet();
      }, 450);
    });
    this.el.addEventListener('pointerup', () => {
      window.clearTimeout(pressTimer);
      window.clearTimeout(this.petTimer);
      if (pressed && !petted) this.poke();
      pressed = false;
    });
    this.el.addEventListener('pointercancel', () => {
      window.clearTimeout(pressTimer);
      pressed = false;
    });
    this.el.addEventListener('keydown', (event) => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        this.pet();
      }
    });
    window.addEventListener('pointermove', this.onWindowPointerMove, { passive: true });
    window.addEventListener('keydown', this.onWindowKey);
  }

  /** Typing her name anywhere outside a text field calls her. */
  private typed = '';
  private onWindowKey = (event: KeyboardEvent) => {
    if ((event.target as HTMLElement).closest('input, textarea, [contenteditable]') || event.key.length !== 1) return;
    this.typed = (this.typed + event.key.toLowerCase()).slice(-3);
    if (this.typed !== 'mel') return;
    this.typed = '';
    unlock('mel');
    this.zoomies();
    this.later(2.7, () => this.pet());
  };

  private onWindowPointerMove = (event: PointerEvent) => {
    this.pointer = { x: event.clientX, y: event.clientY };
  };

  private tick = (time: number, deltaMs: number) => {
    if (this.destroyed || this.frozen) return;
    const dt = Math.min(1 / 30, deltaMs / 1000);
    this.clock += dt;
    this.update(dt);
    this.render();
  };

  private update(dt: number) {
    const now = this.clock;
    this.scheduled = this.scheduled.filter((task) => (now >= task.at ? (task.run(), false) : true));
    if (this.action && now >= this.action.end) this.action = null;
    const action = this.action?.name;

    // Position: a critically damped spring towards the formation slot (zoomies circle around Borrão instead)
    let target = this.targetX;
    if (action === 'zoom') target = this.leaderX + Math.sin((now - this.action!.start) * 3.2) * 70;
    if (action === 'sniff' || action === 'lick') target = this.leaderX - Math.sign(this.leaderX - this.x || 1) * 30;
    target = Math.max(this.minX, target);
    const stiffness = action === 'zoom' ? 90 : 40;
    this.vx += (stiffness * (target - this.x) - 2 * Math.sqrt(stiffness) * this.vx) * dt;
    this.x += this.vx * dt;
    if (this.x < this.minX) {
      // The wall moves with the world: it pushes her along instead of letting her slip behind the portrait
      this.x = this.minX;
      this.vx = Math.max(0, this.vx);
    }
    const travel = this.groundSpeed + this.vx;
    // The world only reports speed while it scrolls, so it fades out between updates
    this.groundSpeed *= Math.exp(-dt * 8);
    const pace = Math.abs(travel);
    const moving = pace > 10 && !this.airborne;
    if (pace > 10) this.facing = Math.sign(travel);
    else if (Math.abs(this.leaderX - this.x) > 4) this.facing = Math.sign(this.leaderX - this.x);

    // Jump physics
    if (this.airborne) {
      this.liftVelocity -= GRAVITY * dt;
      this.lift += this.liftVelocity * dt;
      if (this.lift <= 0) {
        this.lift = 0;
        this.airborne = false;
        this.squash = { x: 1.1, y: 0.86 };
        this.ears.nearVelocity += 300;
        this.ears.farVelocity -= 300;
      }
    }
    this.squash.x = mix(this.squash.x, 1, 1 - Math.exp(-dt * 9));
    this.squash.y = mix(this.squash.y, 1, 1 - Math.exp(-dt * 9));

    // Posture and idle life
    if (moving) {
      if (this.posture !== 'stand') this.posture = 'stand';
      this.sleeping = false;
      this.idleTime = 0;
    } else if (!this.action && !this.airborne) {
      this.idleTime += dt;
      if (this.posture === 'stand' && this.idleTime > 1.4) this.posture = 'sit';
      if (now > this.nextIdleEvent) this.idleEvent();
      if (this.posture !== 'lie' && performance.now() - this.lastInteraction > SLEEP_AFTER) this.lieDown(true);
    }

    // Gait
    const gait: GaitName = pace < 90 ? 'walk' : pace < 260 ? 'trot' : 'gallop';
    this.gait = gait;
    const spec = GAITS[gait];
    const blend = 1 - Math.exp(-dt / 0.3 * 3);
    (Object.keys(this.offsets) as LegName[]).forEach((leg) => (this.offsets[leg] = mix(this.offsets[leg], spec.offsets[leg], blend)));
    this.gaitWeight = mix(this.gaitWeight, moving || action === 'zoom' ? 1 : 0, 1 - Math.exp(-dt * 10));
    // Planted paws must slide back exactly at ground speed: once the cycle hits its fastest period, the stride grows instead
    this.stride = clamp((pace * spec.duty * spec.minPeriod) / this.scale, spec.stride, spec.maxStride);
    const period = pace > 1 ? Math.max(spec.minPeriod, (this.stride * this.scale) / (pace * spec.duty)) : 1;
    if (this.gaitWeight > 0.01) this.phase = (this.phase + dt / period) % 1;

    // Pose target: posture, then the action on top, then locomotion
    const goal: Pose = { ...REST, ...POSTURES[this.posture] };
    if (this.sleeping) Object.assign(goal, { tail: -12, wagAmp: 0, earOpen: 32, neck: 18 });
    const since = this.action ? now - this.action.start : 0;
    switch (action) {
      case 'tilt':
        Object.assign(goal, { tilt: 14, earOpen: -14, neck: goal.neck - 4 });
        break;
      case 'startle':
        Object.assign(goal, { earOpen: -18, bodyY: goal.bodyY - 2, wagAmp: 0 });
        break;
      case 'bow':
        Object.assign(goal, { ...REST, pitch: 14, bodyY: 4, frontX: 9, frontY: 1.2, neck: 6, tail: 40, wagAmp: 26, wagHz: 6 });
        break;
      case 'pet':
        Object.assign(goal, { tilt: goal.tilt + 10, earOpen: 22, tail: goal.tail + 15, wagAmp: 28, wagHz: 7 });
        break;
      case 'sniff':
        Object.assign(goal, { ...REST, neck: 30, tilt: 6, pitch: 4, tail: 30, wagAmp: 10, wagHz: 2 });
        break;
      case 'lick':
        Object.assign(goal, { ...REST, neck: 14, tilt: 4, tail: 30, wagAmp: 24, wagHz: 6 });
        break;
      case 'scratch': {
        const kick = Math.sin(since * Math.PI * 2 * 10) * 4;
        Object.assign(goal, { tilt: -18, earOpen: 10, rearX: 15 + kick, rearY: -24 + kick * 0.6 });
        break;
      }
      case 'bark': {
        const beat = (since - 0.1) % 0.28;
        const open = since > 0.1 && beat < 0.12;
        Object.assign(goal, { jaw: open ? 16 : 0, neck: goal.neck + (open ? 6 : -8), bodyX: goal.bodyX - (open ? 1.5 : 0), earOpen: -10 });
        break;
      }
      case 'zoom':
        Object.assign(goal, { ...REST, neck: 10, earOpen: 20, tail: 24, wagAmp: 8 });
        break;
    }
    // Weight: she leans into a push-off and rocks back when braking
    const accel = (travel - this.previousTravel) / dt;
    this.previousTravel = travel;
    this.lean = mix(this.lean, clamp(accel * this.facing * 0.004, -4, 6), 1 - Math.exp(-dt * 6));
    goal.pitch += this.lean;
    if (moving) {
      // Lean into the run, a little more the faster she goes
      goal.pitch += clamp(pace / 90, 0, 5);
      const gaitPose = gait === 'gallop' ? { neck: 8, earOpen: 4, tail: 24 } : gait === 'trot' ? { neck: 4, earOpen: 0, tail: 14 } : { neck: 2, tail: 8 };
      Object.assign(goal, gaitPose, { bodyY: goal.bodyY + spec.crouch, wagAmp: 14, wagHz: 4 });
    }
    if (this.airborne) Object.assign(goal, { rearX: -9, rearY: -3, frontX: 6, frontY: -7, earOpen: -16 });

    // Look at the pointer while idle and awake
    if (this.pointer && !this.sleeping && !moving) {
      const rect = this.el.getBoundingClientRect();
      const dx = (this.pointer.x - (rect.left + rect.width * 0.7)) * this.facing;
      const dy = this.pointer.y - (rect.top + rect.height * 0.35);
      const distance = Math.min(1, Math.hypot(dx, dy) / 260);
      const angle = Math.atan2(dy, dx);
      this.look.x = mix(this.look.x, Math.cos(angle) * 1.2 * distance, 1 - Math.exp(-dt * 6));
      this.look.y = mix(this.look.y, Math.sin(angle) * 1.2 * distance, 1 - Math.exp(-dt * 6));
      this.look.neck = mix(this.look.neck, clamp(dy / 20, -12, 12) * distance, 1 - Math.exp(-dt * 6));
    } else {
      this.look.neck = mix(this.look.neck, 0, 1 - Math.exp(-dt * 6));
    }
    goal.neck += this.look.neck;

    // Every parameter chases its goal with a critically damped spring; reactions move faster
    const omega = action === 'bark' || action === 'startle' ? 22 : action ? 12 : 8;
    (Object.keys(goal) as (keyof Pose)[]).forEach((key) => {
      const accel = omega * omega * (goal[key] - this.pose[key]) - 2 * omega * this.velocity[key];
      this.velocity[key] += accel * dt;
      this.pose[key] += this.velocity[key] * dt;
    });

    // Ears: an underdamped spring kicked by head turns and body bumps, so they flop and settle
    const head = this.pose.neck + this.pose.tilt;
    const headSpeed = (head - this.previousHead) / dt;
    this.previousHead = head;
    const bodyAccel = (this.velocity.bodyY - this.previousBodyVelocity) / dt;
    this.previousBodyVelocity = this.velocity.bodyY;
    const kick = -0.9 * headSpeed + 0.04 * bodyAccel + (moving ? Math.sin(this.phase * Math.PI * 4) * pace * 0.08 : 0);
    for (const side of ['near', 'far'] as const) {
      const velocityKey = `${side}Velocity` as const;
      const accel = -170 * this.ears[side] - 11 * this.ears[velocityKey] + kick * (side === 'near' ? 1 : -1);
      this.ears[velocityKey] += accel * dt;
      this.ears[side] = clamp(this.ears[side] + this.ears[velocityKey] * dt, -40, 40);
    }

    // Blink, with a 30% chance of a double blink
    if (now > this.nextBlink && !this.sleeping) {
      this.blinkStart = now;
      this.nextBlink = now + (Math.random() < 0.3 ? 0.32 : 2.4 + Math.random() * 3.1);
    }

    this.updateDust(dt, moving, pace);
    this.eyes = this.sleeping ? 'sleep' : action === 'pet' || action === 'lick' ? 'happy' : 'open';

    // Line boil without filters: the drawing is redrawn every frame anyway, so it just cycles between three brush
    // seeds (8 fps moving, 4 fps idle, none asleep), like hand-drawn animation
    const boilRate = this.sleeping ? 0 : moving || action ? 8 : 4;
    this.boilTimer += dt * boilRate;
    if (this.boilTimer >= 1) {
      this.boilTimer = 0;
      this.boilIndex = (this.boilIndex + 1) % 3;
    }
  }

  /** Dust kicked up by her paws: a small pool of motes, so nothing is created while she runs. */
  private updateDust(dt: number, moving: boolean, pace: number) {
    // Paws sit near the ankles at ground level; motes drift back with the ground
    if (moving) {
      this.dustTimer += dt * Math.min(18, pace / 22);
      while (this.dustTimer >= 1) {
        this.dustTimer -= 1;
        const particle = this.dust.find((item) => item.age >= item.life);
        if (!particle) break;
        const rear = Math.random() < 0.55;
        Object.assign(particle, {
          x: (rear ? LEG_RIGS.nearRear.toe[0] : LEG_RIGS.nearFront.toe[0]) + (Math.random() - 0.5) * 12,
          y: DOG_VIEW.ground - 1,
          vx: -(pace / this.scale) * (0.1 + Math.random() * 0.2),
          vy: -(30 + Math.random() * 50),
          r: 0.8 + Math.random() * 1.2,
          life: 0.55 + Math.random() * 0.45,
          age: 0,
        });
      }
    }
    for (const particle of this.dust) {
      if (particle.age >= particle.life) continue;
      particle.age += dt;
      particle.vy += 260 * dt;
      particle.x += particle.vx * dt;
      particle.y = Math.min(DOG_VIEW.ground, particle.y + particle.vy * dt);
    }
  }

  private idleEvent() {
    const now = this.clock;
    this.nextIdleEvent = now + 3 + Math.random() * 4;
    const roll = Math.random();
    if (roll < 0.35) this.start('tilt', 1.6);
    else if (roll < 0.55 && this.posture === 'sit') this.start('scratch', 1.1);
    else if (roll < 0.65) this.start('sniff', 1.2);
    else if (Math.random() < 0.5) this.ears.nearVelocity += 220;
    else this.ears.farVelocity -= 220;
  }

  // Drawing -----------------------------------------------------------------

  private footTarget(leg: LegName): { ankle: Point; pawAngle: number } {
    const rig = LEG_RIGS[leg];
    // Postures move each paw by an offset from where the drawing has it
    const offset: Point = rig.rear ? [this.pose.rearX, this.pose.rearY] : [this.pose.frontX, this.pose.frontY];
    const tucked: Point = leg === 'farRear' && this.action?.name === 'scratch' ? [POSTURES.sit.rearX!, POSTURES.sit.rearY!] : offset;
    const settled: Point = [rig.end[0] + tucked[0], rig.end[1] + tucked[1]];
    if (this.gaitWeight < 0.01) return { ankle: settled, pawAngle: 0 };

    const spec = GAITS[this.gait];
    const p = (this.phase + this.offsets[leg]) % 1;
    let x: number;
    let y = rig.end[1];
    let pawAngle = 0;
    if (p < spec.duty) {
      x = rig.end[0] + this.stride * (0.5 - p / spec.duty);
    } else {
      // Swing: the paw peels off the ground, folds back and reaches forward, highest early in the swing
      const s = (p - spec.duty) / (1 - spec.duty);
      const eased = s * s * (3 - 2 * s);
      x = rig.end[0] + this.stride * (eased - 0.5);
      y -= spec.lift * Math.sin(Math.PI * Math.pow(s, 0.8));
      pawAngle = (rig.rear ? 24 : 34) * Math.sin(Math.PI * Math.pow(s, 0.7));
    }
    return { ankle: [mix(settled[0], x, this.gaitWeight), mix(settled[1], y, this.gaitWeight)], pawAngle: pawAngle * this.gaitWeight };
  }

  /** Two-bone IK by the law of cosines: returns each joint's rotation relative to its rest angle in the drawing. */
  private solveLeg(leg: LegName, root: Point) {
    const rig = LEG_RIGS[leg];
    const { ankle: target, pawAngle } = this.footTarget(leg);
    let dx = target[0] - root[0];
    let dy = target[1] - root[1];
    const length = Math.hypot(dx, dy) || 0.001;
    const distance = clamp(length, Math.abs(rig.upper - rig.lower) + 0.5, (rig.upper + rig.lower) * 0.999);
    dx *= distance / length;
    dy *= distance / length;
    const base = Math.atan2(dy, dx);
    const spread = Math.acos(clamp((rig.upper ** 2 + distance ** 2 - rig.lower ** 2) / (2 * rig.upper * distance), -1, 1));
    const kneeAngle = base + rig.bend * spread;
    const knee: Point = [root[0] + Math.cos(kneeAngle) * rig.upper, root[1] + Math.sin(kneeAngle) * rig.upper];
    const upper = deg(kneeAngle) - rig.upperRest;
    const lower = deg(Math.atan2(root[1] + dy - knee[1], root[0] + dx - knee[0])) - rig.lowerRest - upper;
    return { upper, lower, paw: pawAngle - upper - lower };
  }

  /** The gait's rhythm through the whole body: the spine gathers and stretches, the trunk rocks, all in step. */
  private bodyRhythm() {
    const w = this.gaitWeight;
    const turn = Math.PI * 2 * this.phase;
    if (this.gait === 'gallop') return { flex: w * 10 * Math.sin(turn - 0.9), rock: w * 3.5 * Math.cos(turn) };
    if (this.gait === 'trot') return { flex: w * 2.4 * Math.sin(2 * turn), rock: w * 1.3 * Math.sin(2 * turn + Math.PI / 2) };
    return { flex: w * 1.6 * Math.sin(2 * turn), rock: w * 0.8 * Math.sin(2 * turn) };
  }

  /** Where every part of the drawing sits this frame, as one matrix per bone (identity at rest). */
  private poseBones(breath: number, bob: number): Record<Bone, Matrix> {
    const pose = this.pose;
    const now = this.clock;
    const bones = {} as Record<Bone, Matrix>;
    const { flex, rock } = this.bodyRhythm();
    const squash = scale(this.squash.x, this.squash.y, [PIVOTS.body[0], DOG_VIEW.ground]);
    bones.body = chain(squash, translate(pose.bodyX, pose.bodyY), rotate(pose.pitch + rock, PIVOTS.body), scale(1, breath, PIVOTS.body));
    // The spine bends at its middle: an arched back when she gathers, a long flat one when she stretches out
    bones.chest = multiply(bones.body, rotate(flex / 2, PIVOTS.spine));
    bones.hips = multiply(bones.body, rotate(-flex / 2, PIVOTS.spine));

    // Legs hang from wherever the hips and shoulders went
    for (const leg of ['nearRear', 'farRear', 'nearFront', 'farFront'] as const) {
      const rig = LEG_RIGS[leg];
      const root = apply(rig.rear ? bones.hips : bones.chest, ...rig.root);
      const angles = this.solveLeg(leg, root);
      const base = translate(root[0] - rig.root[0], root[1] - rig.root[1]);
      const upper = multiply(base, rotate(angles.upper, rig.root));
      const lower = multiply(upper, rotate(angles.lower, rig.mid));
      bones[`${leg}.upper`] = upper;
      bones[`${leg}.lower`] = lower;
      bones[`${leg}.paw`] = multiply(lower, rotate(angles.paw, rig.end));
    }

    // The head rides on the chest but soaks up half of the bounce and most of the rocking, so it stays steady on
    // the run (like Ori), and lags a quarter breath behind
    const neck = apply(bones.chest, ...PIVOTS.neck);
    const nod = 0.5 * Math.sin((now * Math.PI * 2) / 2.6 - Math.PI / 2) - bob * 0.5;
    const steady = pose.pitch * 0.35 - rock * 0.7 + flex * 0.25;
    bones.head = chain(squash, translate(neck[0] - PIVOTS.neck[0], neck[1] - PIVOTS.neck[1] + nod), rotate(pose.neck + steady, PIVOTS.neck));
    const sniff = this.action?.name === 'sniff' && Math.floor(now * 14) % 3 !== 0 ? Math.sin(now * 88) * 0.4 : 0;
    bones.skull = chain(bones.head, translate(sniff, 0), rotate(pose.tilt, PIVOTS.skull));
    bones.jaw = multiply(bones.skull, rotate(pose.jaw, PIVOTS.jaw));
    bones.earNear = chain(bones.skull, translate(...PIVOTS.nearEar), rotate(EAR_REST.near - pose.earOpen + this.ears.near));
    bones.earFar = chain(bones.skull, translate(...PIVOTS.farEar), rotate(EAR_REST.far + pose.earOpen + this.ears.far));

    // Tail: follow-through down the chain, so the tip lags behind the root; on the run it streams with the stride
    const wag = Math.PI * 2 * pose.wagHz * now;
    const stream = this.gaitWeight * 7 * Math.sin(Math.PI * 2 * this.phase - 1.2);
    let tail = bones.hips;
    for (let index = 0; index < 4; index++) {
      const swing = pose.wagAmp * Math.sin(wag - 0.6 * index) * (0.6 + 0.25 * index) + stream * (0.5 + 0.2 * index);
      tail = multiply(tail, rotate((index === 0 ? pose.tail : 0) + swing, PIVOTS.tail[index]));
      bones[`tail${index}` as Bone] = tail;
    }
    return bones;
  }

  private render() {
    const f = (value: number) => value.toFixed(1);
    const ground = this.groundY();
    this.el.style.transform = `translate3d(${f(this.x - (DOG_VIEW.width * this.scale) / 2)}px, ${f(ground - DOG_VIEW.ground * this.scale - this.lift)}px, 0)`;
    this.el.style.setProperty('--facing', String(this.facing));
    this.el.dataset.action = this.action?.name ?? '';
    if (!this.cutout) return;

    const now = this.clock;
    const breath = 1 + (this.sleeping ? 0.035 : 0.018) * Math.sin((now * Math.PI * 2) / (this.sleeping ? 3.6 : 2.6));
    // Bob downwards only: lifting the body would pull the planted paws off the ground
    const bob = this.gaitWeight * GAITS[this.gait].bob * (0.5 + 0.5 * Math.cos(this.phase * Math.PI * 4));
    this.pose.bodyY += bob;
    const bones = this.poseBones(breath, bob);
    this.pose.bodyY -= bob;

    const blinkTime = now - this.blinkStart;
    const blink = blinkTime < 0.06 ? 1 - blinkTime / 0.06 : blinkTime < 0.1 ? 0 : blinkTime < 0.19 ? (blinkTime - 0.1) / 0.09 : 1;
    const tail = PIVOTS.tail.map((pivot, index) => apply(bones[`tail${Math.min(3, Math.max(0, index - 1))}` as Bone], pivot[0], pivot[1]));
    const legs = Object.fromEntries((Object.keys(LEG_RIGS) as LegName[]).map((leg) => [leg, this.legChain(bones, leg)])) as Record<LegName, Point[]>;
    this.cutout.draw({
      bones,
      legs,
      tail,
      blink,
      eyes: this.eyes,
      tongue: this.action?.name === 'pet' || this.action?.name === 'lick' || this.action?.name === 'zoom',
      shadow: 1 - Math.min(1, this.lift / 120) * 0.5,
      dust: this.dust.map(({ x, y, r, life, age }) => ({ x, y, r, alpha: age < life ? (1 - age / life) * 0.8 : 0 })),
      joints: this.showSkeleton ? Object.values(legs) : null,
    });
  }

  /** A leg's joints this frame, hip to toes: the curve its mesh follows. */
  private legChain(bones: Record<Bone, Matrix>, leg: LegName): Point[] {
    const rig = LEG_RIGS[leg];
    return [apply(bones[`${leg}.upper`], ...rig.root), apply(bones[`${leg}.upper`], ...rig.mid), apply(bones[`${leg}.lower`], ...rig.end), apply(bones[`${leg}.paw`], ...rig.toe)];
  }
}
