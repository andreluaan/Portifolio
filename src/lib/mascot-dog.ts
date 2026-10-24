import { mascotLines, mascotReactions } from '../data/content';
import { brushOutline, brushPath, densify, ellipsePoints, inkSplat, prefersReducedMotion, renderScene, svgElement, type Point } from './brush';
import { pick, t } from './i18n';
import { unlock } from './secrets';
import { sounds } from './sound';

/**
 * Archived: Borrão as a little ink dog (not used by the site). To try it again, import `Mascot` from this file
 * instead of './mascot' and import '../styles/mascot-dog.css'.
 *
 * Borrão, the little ink dog. A procedural rig: torso, neck, head, a floppy ear and a tail made of springs,
 * and four two-bone legs solved with IK and driven by a walk/trot gait cycle.
 */

type DogState = 'stand' | 'move' | 'sit' | 'lie' | 'sniff' | 'paw' | 'scratch' | 'bow' | 'air' | 'carried' | 'knocked';

export interface MascotOptions {
  layer: HTMLElement;
  groundY: () => number;
  minX?: () => number;
  maxX?: () => number;
  scripted?: boolean;
  footprints?: boolean;
  startX?: number;
}

interface Pose {
  hipX: number;
  hipY: number;
  shoulderX: number;
  shoulderY: number;
  headX: number;
  headY: number;
  headAngle: number;
  tailBase: number;
  wagAmp: number;
  wagFreq: number;
}

const VIEW_W = 120;
const VIEW_H = 92;
const GROUND = 88;
const DISPLAY_W = 116;
const SCALE = DISPLAY_W / VIEW_W;
const DISPLAY_H = VIEW_H * SCALE;
const FEET_FROM_TOP = GROUND * SCALE;

const SPRING = 260;
const DAMPING = 28;
const GRAVITY = 2300;
const WALK_SPEED = 80;
const REAR = { upper: 14, lower: 16 };
const FRONT = { upper: 13, lower: 16 };
const DEG = Math.PI / 180;

const POSES: Record<'stand' | 'move' | 'run' | 'sit' | 'lie' | 'sniff' | 'bow' | 'carried' | 'knocked' | 'air', Pose> = {
  stand: { hipX: 40, hipY: 59, shoulderX: 78, shoulderY: 58, headX: 10, headY: -18, headAngle: -6, tailBase: -58, wagAmp: 10, wagFreq: 6 },
  move: { hipX: 40, hipY: 59, shoulderX: 78, shoulderY: 58.5, headX: 12, headY: -16, headAngle: -2, tailBase: -48, wagAmp: 16, wagFreq: 9 },
  run: { hipX: 39, hipY: 60, shoulderX: 80, shoulderY: 59, headX: 15, headY: -12, headAngle: 6, tailBase: -18, wagAmp: 7, wagFreq: 13 },
  sit: { hipX: 46, hipY: 77, shoulderX: 71, shoulderY: 56, headX: 8, headY: -13, headAngle: -8, tailBase: 22, wagAmp: 22, wagFreq: 8 },
  lie: { hipX: 40, hipY: 78, shoulderX: 77, shoulderY: 76, headX: 15, headY: -3, headAngle: 10, tailBase: 70, wagAmp: 3, wagFreq: 3 },
  sniff: { hipX: 40, hipY: 58, shoulderX: 78, shoulderY: 63, headX: 20, headY: 10, headAngle: 34, tailBase: -64, wagAmp: 22, wagFreq: 12 },
  bow: { hipX: 40, hipY: 55, shoulderX: 80, shoulderY: 72, headX: 16, headY: -6, headAngle: -18, tailBase: -66, wagAmp: 26, wagFreq: 14 },
  carried: { hipX: 42, hipY: 54, shoulderX: 76, shoulderY: 52, headX: 10, headY: -15, headAngle: -12, tailBase: 72, wagAmp: 2, wagFreq: 4 },
  knocked: { hipX: 38, hipY: 80, shoulderX: 80, shoulderY: 80, headX: 16, headY: 2, headAngle: 14, tailBase: 85, wagAmp: 1, wagFreq: 2 },
  air: { hipX: 40, hipY: 56, shoulderX: 78, shoulderY: 53, headX: 12, headY: -18, headAngle: -12, tailBase: -30, wagAmp: 6, wagFreq: 10 },
};

const lerp = (a: number, b: number, k: number) => a + (b - a) * k;
const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));
const smoothstep = (edge0: number, edge1: number, x: number) => {
  const t = clamp((x - edge0) / (edge1 - edge0), 0, 1);
  return t * t * (3 - 2 * t);
};
const rotate = ([x, y]: Point, angle: number): Point => [x * Math.cos(angle) - y * Math.sin(angle), x * Math.sin(angle) + y * Math.cos(angle)];
const add = (a: Point, b: Point): Point => [a[0] + b[0], a[1] + b[1]];

function solveLeg(hip: Point, foot: Point, upper: number, lower: number, bend: 1 | -1): Point {
  const dx = foot[0] - hip[0];
  const dy = foot[1] - hip[1];
  const distance = clamp(Math.hypot(dx, dy), Math.abs(upper - lower) + 0.01, upper + lower - 0.01);
  const base = Math.atan2(dy, dx);
  const spread = Math.acos(clamp((upper * upper + distance * distance - lower * lower) / (2 * upper * distance), -1, 1));
  const angle = base + bend * spread;
  return [hip[0] + Math.cos(angle) * upper, hip[1] + Math.sin(angle) * upper];
}

/** Foot offset along one gait cycle: 60% stance sliding back on the ground, 40% swing lifting forward. */
function gaitFoot(phase: number, stride: number, lift: number): Point {
  const u = ((phase % 1) + 1) % 1;
  if (u < 0.6) return [stride / 2 - stride * (u / 0.6), 0];
  const s = (u - 0.6) / 0.4;
  const eased = s * s * (3 - 2 * s);
  return [-stride / 2 + stride * eased, -Math.sin(Math.PI * s) * lift];
}

const TORSO = [
  brushPath([[-24, -0.5], [-8, -3], [10, -2.5], [22, 0.5]], 18, { seed: 71, start: 0.22, end: 0.18, wobble: 0.2 }),
  brushPath([[10, 0], [19, 7.5]], 13, { seed: 72, start: 0.3, end: 0.45, wobble: 0.2 }),
  brushPath([[-23, 1], [-25, 7]], 9, { seed: 73, start: 0.3, end: 0.6, wobble: 0.2 }),
];
const SADDLE = brushPath([[-17, -6], [-4, -8.5], [9, -7]], 7, { seed: 74, start: 0.2, end: 0.4, wobble: 0.3 });
const HEAD = [
  brushPath(ellipsePoints(0, 0, 7, 6.2, { seed: 81, count: 14 }), 10.5, { seed: 81, start: 0.02, end: 0.05, wobble: 0.15 }),
  brushPath([[3, 1.2], [11, 2.6], [17.5, 3.8]], 7.4, { seed: 82, start: 0.05, end: 0.35, wobble: 0.15 }),
];
const MUZZLE = brushPath([[7, 4.6], [15, 5.6]], 2.6, { seed: 83, start: 0.2, end: 0.4 });
const BROW = brushPath([[0.5, -5.4], [4.6, -5.8]], 1.6, { seed: 84, start: 0.2, end: 0.3 });

function dogSvg() {
  return `
    <svg class="dog-svg" viewBox="0 0 ${VIEW_W} ${VIEW_H}" aria-hidden="true">
      <ellipse class="dog-shadow" cx="60" cy="${GROUND + 0.5}" rx="30" ry="2.6"/>
      <g class="dog-far">
        <path class="dog-far-rear dog-fur-far" filter="url(#bleed)"/>
        <path class="dog-far-front dog-fur-far" filter="url(#bleed)"/>
      </g>
      <path class="dog-tail ink-ink" filter="url(#boil)"/>
      <path class="dog-haunch dog-fur"/>
      <g class="dog-torso">
        ${TORSO.map((d) => `<path d="${d}" class="dog-fur" filter="url(#boil)"/>`).join('')}
        <path d="${SADDLE}" class="ink-soft" filter="url(#bleed)" opacity="0.85"/>
        <path class="dog-collar" d="M15.5 -7.5 Q18 1 19.5 8.5"/>
        <circle class="ink-paper" cx="19.8" cy="9.6" r="1.5"/>
      </g>
      <path class="dog-neck dog-fur" filter="url(#bleed)"/>
      <path class="dog-near-rear dog-fur" filter="url(#bleed)"/>
      <path class="dog-near-front dog-fur" filter="url(#bleed)"/>
      <g class="dog-head">
        <path class="dog-tongue ink-mist" d="M9 6.6 Q10 12 12.4 10.8 Q13 7.8 11.8 6.4 Z"/>
        ${HEAD.map((d) => `<path d="${d}" class="dog-fur" filter="url(#boil)"/>`).join('')}
        <path d="${MUZZLE}" class="ink-mist"/>
        <circle class="ink-ink" cx="17.8" cy="3.3" r="2.5"/>
        <circle class="ink-paper" cx="18.6" cy="2.5" r="0.7"/>
        <path d="${BROW}" class="ink-ink dog-brow"/>
        <g class="dog-eye">
          <circle class="dog-pupil ink-ink" cx="3" cy="-2.2" r="1.7"/>
          <circle class="ink-paper" cx="3.5" cy="-2.8" r="0.55"/>
        </g>
        <path class="dog-eye-closed" d="M1 -2 Q3 -0.6 5 -2"/>
      </g>
      <path class="dog-ear ink-ink" filter="url(#bleed)"/>
    </svg>`;
}

export class Mascot {
  readonly el: HTMLDivElement;
  private readonly options: Required<Omit<MascotOptions, 'startX'>>;
  private readonly reduced = prefersReducedMotion();
  private readonly bubble: HTMLDivElement;
  private readonly parts: Record<string, SVGElement>;

  private state: DogState = 'stand';
  private pose: Pose = { ...POSES.stand };
  private x: number;
  private y = 0;
  private vx = 0;
  private vy = 0;
  private targetX: number;
  private drivenX: number | null = null;
  private facing = 1;
  private gaitPhase = 0;
  private gaitWeight = 0;
  private runBlend = 0;
  private legOffsets = [0, 0.25, 0.5, 0.75];
  private feet: Point[] = [];
  private scriptedSpeed = 0;
  private stillTime = 0;
  private runTime = 0;
  private pantUntil = 0;
  private happyUntil = 0;
  private stateUntil = 0;
  private squash = 0;
  private shakeUntil = 0;
  private wasCarried = false;
  private headKick = 0;
  private time = 0;
  private blinkAt = 2;
  private lookAngle = 0;
  private lookTarget = 0;
  private pupil: Point = [0, 0];
  private tailAngles = [0, 0, 0, 0, 0];
  private ear = { tip: [0, 0] as Point, velocity: [0, 0] as Point, ready: false };
  private pointerTarget: { x: number; y: number } | null = null;
  private dragStart: { x: number; y: number } | null = null;
  private fallStartY = 0;
  private lastDustAt = 0;
  private bubbleTimer = 0;
  private snoreTimer = 0;
  private frame = 0;
  private lastTime = performance.now();
  private lineIndex = 0;
  private destroyed = false;

  constructor(options: MascotOptions) {
    this.options = {
      minX: () => 50,
      maxX: () => options.layer.clientWidth - 50,
      scripted: false,
      footprints: false,
      ...options,
    };
    this.x = options.startX ?? 80;
    this.targetX = this.x;

    this.el = document.createElement('div');
    this.el.className = 'mascot dog';
    this.el.setAttribute('role', 'button');
    this.el.tabIndex = 0;
    this.el.setAttribute('aria-label', t('mascot.name'));
    this.el.innerHTML = `<div class="mascot-flip">${dogSvg()}</div><div class="mascot-bubble" hidden></div>`;
    this.bubble = this.el.querySelector('.mascot-bubble')!;
    const select = (name: string) => this.el.querySelector<SVGElement>(`.dog-${name}`)!;
    this.parts = Object.fromEntries(
      ['shadow', 'far-rear', 'far-front', 'tail', 'haunch', 'torso', 'neck', 'near-rear', 'near-front', 'head', 'ear', 'pupil', 'tongue'].map((name) => [name, select(name)])
    );
    options.layer.append(this.el);

    this.y = this.options.groundY();
    this.feet = this.standingFeet(this.pose);
    this.bindEvents();
    this.update(0);
    this.render();
    if (!this.reduced) this.frame = requestAnimationFrame(this.tick);
    this.snoreTimer = window.setInterval(this.spawnSnore, 1800);
    if (import.meta.env.DEV) ((window as unknown as { __dogs?: Mascot[] }).__dogs ??= []).push(this);
  }

  destroy() {
    this.destroyed = true;
    cancelAnimationFrame(this.frame);
    window.clearInterval(this.snoreTimer);
    window.removeEventListener('pointermove', this.onWindowPointerMove);
    this.el.remove();
  }

  /** Scripted scenes (the paper world) keep the dog at `x` and tell it how fast the world is moving. */
  drive(x: number, speed: number) {
    this.drivenX = x;
    this.scriptedSpeed = speed;
    if (Math.abs(speed) > 6 && this.state !== 'carried' && this.state !== 'air' && this.state !== 'knocked') this.facing = Math.sign(speed);
    if (this.reduced) {
      this.x = x;
      this.render();
    }
  }

  hop(strength = 520) {
    if (this.state === 'air' || this.state === 'carried' || this.state === 'knocked') return;
    this.wake();
    this.fallStartY = this.y;
    this.vy = -strength;
    this.setState('air');
  }

  say(text: string, duration = 2200) {
    this.bubble.textContent = text;
    this.bubble.hidden = false;
    this.bubble.classList.remove('is-popping');
    void this.bubble.offsetWidth;
    this.bubble.classList.add('is-popping');
    window.clearTimeout(this.bubbleTimer);
    this.bubbleTimer = window.setTimeout(() => (this.bubble.hidden = true), duration);
  }

  walkTo(x: number) {
    if (this.options.scripted) return;
    this.wake();
    this.targetX = clamp(x, this.options.minX(), this.options.maxX());
  }

  /** Development hook to preview a pose. */
  preview(state: DogState) {
    this.setState(state);
    this.stateUntil = this.time + 6;
  }

  private bindEvents() {
    this.el.addEventListener('pointerdown', (event) => {
      event.preventDefault();
      this.el.setPointerCapture(event.pointerId);
      this.dragStart = { x: event.clientX, y: event.clientY };
      this.wake();
    });
    this.el.addEventListener('pointermove', (event) => {
      if (!this.dragStart) return;
      const moved = Math.hypot(event.clientX - this.dragStart.x, event.clientY - this.dragStart.y);
      if (this.state !== 'carried' && moved > 6 && !this.reduced) {
        this.setState('carried');
        this.say(pick(mascotReactions.carried), 1200);
        sounds.pop();
      }
      if (this.state === 'carried') this.pointerTarget = this.toLayer(event.clientX, event.clientY);
    });
    const release = (event: PointerEvent) => {
      if (!this.dragStart) return;
      const wasCarried = this.state === 'carried';
      this.dragStart = null;
      this.pointerTarget = null;
      if (this.el.hasPointerCapture(event.pointerId)) this.el.releasePointerCapture(event.pointerId);
      if (wasCarried) {
        this.fallStartY = this.y;
        this.wasCarried = true;
        this.setState('air');
      } else {
        this.poke();
      }
    };
    this.el.addEventListener('pointerup', release);
    this.el.addEventListener('pointercancel', release);
    this.el.addEventListener('keydown', (event) => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        this.poke();
      }
    });
    window.addEventListener('pointermove', this.onWindowPointerMove, { passive: true });
  }

  private onWindowPointerMove = (event: PointerEvent) => {
    const rect = this.el.getBoundingClientRect();
    const headX = rect.left + rect.width * (this.facing > 0 ? 0.78 : 0.22);
    const headY = rect.top + rect.height * 0.3;
    const dx = (event.clientX - headX) * this.facing;
    const dy = event.clientY - headY;
    const distance = Math.hypot(dx, dy);
    this.lookTarget = dx > -20 ? clamp(Math.atan2(dy, Math.max(20, dx)) / DEG, -22, 22) : 0;
    this.pupil = [clamp(dx / 260, -0.8, 0.9), clamp(dy / 260, -0.7, 0.7)];
    if (distance < 120) this.wake();
  };

  private poke() {
    this.wake();
    unlock('tickle');
    this.happyUntil = this.time + 2.5;
    if (this.state === 'sit') {
      this.setState('paw');
      this.stateUntil = this.time + 1.8;
      this.say(pick(mascotReactions.paw), 1800);
      sounds.pop();
      return;
    }
    const lines = pick(mascotLines);
    this.say(lines[this.lineIndex++ % lines.length]);
    sounds.pop();
    this.headKick = 1;
    if (!this.reduced) this.hop(420);
  }

  private wake() {
    this.stillTime = 0;
    if (this.state === 'lie') {
      this.setState('bow');
      this.stateUntil = this.time + 1.1;
    } else if (this.state === 'sit' || this.state === 'scratch') {
      this.setState('stand');
    }
  }

  private toLayer(clientX: number, clientY: number) {
    const rect = this.options.layer.getBoundingClientRect();
    return { x: clientX - rect.left, y: clientY - rect.top + DISPLAY_H * 0.55 };
  }

  private setState(state: DogState) {
    this.state = state;
    this.el.dataset.state = state;
  }

  private tick = (now: number) => {
    if (this.destroyed) return;
    const dt = Math.min(1 / 30, (now - this.lastTime) / 1000);
    this.lastTime = now;
    this.update(dt);
    this.render();
    this.frame = requestAnimationFrame(this.tick);
  };

  private update(dt: number) {
    this.time += dt;
    const ground = this.options.groundY();
    const minX = this.options.minX();
    const maxX = this.options.maxX();
    let groundSpeed = 0;

    switch (this.state) {
      case 'carried': {
        if (this.pointerTarget) {
          this.vx += ((this.pointerTarget.x - this.x) * SPRING - DAMPING * this.vx) * dt;
          this.vy += ((this.pointerTarget.y - this.y) * SPRING - DAMPING * this.vy) * dt;
          this.x += this.vx * dt;
          this.y += this.vy * dt;
        }
        break;
      }
      case 'air': {
        this.vy += GRAVITY * dt;
        this.x += this.vx * dt;
        this.y += this.vy * dt;
        this.vx *= 0.99;
        if (this.x < minX || this.x > maxX) {
          this.x = clamp(this.x, minX, maxX);
          this.vx *= -0.4;
        }
        if (this.y >= ground) this.land(ground);
        break;
      }
      case 'knocked':
        this.y = ground;
        if (this.time > this.stateUntil) this.setState('stand');
        break;
      default: {
        this.y = ground;
        if (this.options.scripted && this.drivenX !== null) {
          const gap = this.drivenX - this.x;
          const correction = clamp(gap * 4, -260, 260);
          this.x += correction * dt;
          if (Math.abs(correction) > 20) this.facing = Math.sign(correction);
          groundSpeed = Math.abs(this.scriptedSpeed) + Math.abs(correction);
          this.scriptedSpeed *= Math.exp(-dt * 6);
        } else {
          const gap = this.targetX - this.x;
          this.vx = clamp(gap * 3, -WALK_SPEED, WALK_SPEED);
          if (Math.abs(gap) < 2) this.vx = 0;
          this.x += this.vx * dt;
          if (Math.abs(this.vx) > 4) this.facing = Math.sign(this.vx);
          groundSpeed = Math.abs(this.vx);
          if (groundSpeed < 4 && this.stillTime > 4 && Math.random() < dt * 0.25) this.walkTo(minX + Math.random() * (maxX - minX));
        }
        this.updateBehaviour(dt, groundSpeed);
      }
    }

    this.updateGait(dt, groundSpeed);
    this.updatePose(dt);
    this.updateFeet(dt);
    this.updateTail(dt);
    this.squash = Math.max(0, this.squash - dt * 4);
    this.headKick = Math.max(0, this.headKick - dt * 3);
    this.lookAngle = lerp(this.lookAngle, this.lookTarget, 1 - Math.exp(-dt * 6));
  }

  private updateBehaviour(dt: number, speed: number) {
    const moving = speed > 8;
    if (moving) {
      this.stillTime = 0;
      if (this.state !== 'move') this.setState('move');
      this.runTime = speed > 200 ? this.runTime + dt : Math.max(0, this.runTime - dt);
      if (this.runTime > 1.6) this.pantUntil = this.time + 5;
      return;
    }
    this.stillTime += dt;
    if (this.state === 'move') this.setState('stand');
    if ((this.state === 'paw' || this.state === 'scratch') && this.time > this.stateUntil) this.setState('sit');
    if ((this.state === 'sniff' || this.state === 'bow') && this.time > this.stateUntil) this.setState('stand');
    if (this.state === 'sit' && this.stillTime > 7 && this.stillTime < 18 && Math.random() < dt * 0.12) {
      this.setState('scratch');
      this.stateUntil = this.time + 1.4;
    }
    if (this.state === 'stand' && this.stillTime > 1.2 && this.stillTime < 3.2 && Math.random() < dt * 0.5) {
      this.setState('sniff');
      this.stateUntil = this.time + 1.4 + Math.random();
    }
    if (this.state === 'stand' && this.stillTime > 3.6) this.setState('sit');
    if (this.state === 'sit' && this.stillTime > 22) this.setState('lie');
  }

  private updateGait(dt: number, speed: number) {
    const moving = this.state === 'move' || this.state === 'stand' || this.state === 'sniff';
    const targetWeight = moving ? smoothstep(6, 40, speed) : 0;
    this.gaitWeight = lerp(this.gaitWeight, targetWeight, 1 - Math.exp(-dt * 10));
    this.runBlend = lerp(this.runBlend, smoothstep(160, 320, speed), 1 - Math.exp(-dt * 4));
    const stride = lerp(18, 26, this.runBlend);
    const visualSpeed = Math.min(speed, 420);
    this.gaitPhase = (this.gaitPhase + (visualSpeed * dt) / (stride / 0.6) / 1.6) % 1;
    const walk = [0, 0.25, 0.5, 0.75];
    const trot = [0, 0.5, 0.5, 0];
    this.legOffsets = this.legOffsets.map((offset, index) => lerp(offset, lerp(walk[index], trot[index], this.runBlend), 1 - Math.exp(-dt * 5)));
  }

  private targetPose(): Pose {
    switch (this.state) {
      case 'move': {
        const blend = this.runBlend;
        const move = POSES.move;
        const run = POSES.run;
        return Object.fromEntries(Object.keys(move).map((key) => [key, lerp(move[key as keyof Pose], run[key as keyof Pose], blend)])) as unknown as Pose;
      }
      case 'paw':
      case 'scratch':
        return POSES.sit;
      default:
        return POSES[this.state];
    }
  }

  private updatePose(dt: number) {
    const target = this.targetPose();
    const speed = this.state === 'air' || this.state === 'carried' ? 14 : this.state === 'knocked' ? 18 : 7;
    const k = 1 - Math.exp(-dt * speed);
    for (const key of Object.keys(target) as (keyof Pose)[]) this.pose[key] = lerp(this.pose[key], target[key], k);
  }

  private standingFeet(pose: Pose): Point[] {
    return [
      [pose.hipX + 2, GROUND],
      [pose.shoulderX + 1, GROUND],
      [pose.hipX - 3, GROUND],
      [pose.shoulderX + 5, GROUND],
    ];
  }

  private stateFeet(pose: Pose): Point[] {
    const { hipX, hipY, shoulderX, shoulderY } = pose;
    switch (this.state) {
      case 'sit':
        return [[hipX + 13, GROUND], [shoulderX + 2, GROUND], [hipX + 9, GROUND], [shoulderX + 6, GROUND]];
      case 'paw':
        return [[hipX + 13, GROUND], [shoulderX + 15, shoulderY + 14 + Math.sin(this.time * 10) * 3], [hipX + 9, GROUND], [shoulderX + 6, GROUND]];
      case 'scratch':
        return [[shoulderX - 1, shoulderY - 3 + Math.sin(this.time * 34) * 3], [shoulderX + 2, GROUND], [hipX + 9, GROUND], [shoulderX + 6, GROUND]];
      case 'bow':
        return [[hipX + 1, GROUND], [shoulderX + 14, GROUND], [hipX - 3, GROUND], [shoulderX + 18, GROUND]];
      case 'lie':
      case 'knocked':
        return [[hipX + 16, GROUND], [shoulderX + 19, GROUND], [hipX + 12, GROUND - 1], [shoulderX + 23, GROUND - 1]];
      case 'air':
        return [[hipX + 8, hipY + 18], [shoulderX - 4, shoulderY + 19], [hipX + 5, hipY + 17], [shoulderX - 1, shoulderY + 18]];
      case 'carried': {
        const swing = clamp(-this.vx * 0.0016, -0.7, 0.7) + Math.sin(this.time * 7) * 0.08;
        return [
          add([hipX, hipY], rotate([0, REAR.upper + REAR.lower - 2], swing)),
          add([shoulderX, shoulderY], rotate([0, FRONT.upper + FRONT.lower - 2], swing * 1.2)),
          add([hipX - 3, hipY], rotate([0, REAR.upper + REAR.lower - 3], swing * 0.8)),
          add([shoulderX + 3, shoulderY], rotate([0, FRONT.upper + FRONT.lower - 3], swing)),
        ];
      }
      case 'sniff':
        return [[hipX + 2, GROUND], [shoulderX + 4, GROUND], [hipX - 3, GROUND], [shoulderX + 8, GROUND]];
      default:
        return this.standingFeet(pose);
    }
  }

  private updateFeet(dt: number) {
    const pose = this.pose;
    const targets = this.stateFeet(pose);
    const k = 1 - Math.exp(-dt * 12);
    const lift = lerp(5, 8, this.runBlend);
    const stride = lerp(18, 26, this.runBlend);
    this.feet = targets.map((target, index) => {
      let goal = target;
      if (this.gaitWeight > 0.01) {
        const joint = index % 2 === 0 ? pose.hipX : pose.shoulderX;
        const [offsetX, offsetY] = gaitFoot(this.gaitPhase + this.legOffsets[index], stride, lift);
        const gait: Point = [joint + offsetX + (index >= 2 ? (index === 2 ? -3 : 4) : 0), GROUND + offsetY];
        goal = [lerp(target[0], gait[0], this.gaitWeight), lerp(target[1], gait[1], this.gaitWeight)];
        return goal;
      }
      const current = this.feet[index] ?? goal;
      return [lerp(current[0], goal[0], k), lerp(current[1], goal[1], k)];
    });
  }

  private updateTail(dt: number) {
    const happy = this.time < this.happyUntil;
    const amplitude = (happy ? 30 : this.pose.wagAmp) * DEG;
    const frequency = happy ? 17 : this.pose.wagFreq;
    const wag = Math.sin(this.time * frequency) * amplitude;
    this.tailAngles = this.tailAngles.map((angle, index) => {
      const target = this.pose.tailBase * DEG + wag * (0.4 + index * 0.25) + index * 0.12;
      return lerp(angle, target, 1 - Math.exp(-dt * (22 - index * 3)));
    });
  }

  private land(ground: number) {
    const impact = this.vy;
    const height = ground - this.fallStartY;
    this.y = ground;
    this.squash = Math.min(1, impact / 1200);
    this.spawnDust(5);
    if (impact > 1150 || height > 260) {
      this.vx = 0;
      this.vy = 0;
      this.setState('knocked');
      this.stateUntil = this.time + 1.6;
      this.say(pick(mascotReactions.dropped), 1400);
      sounds.splat();
      this.leaveStain();
      if (height > 260) unlock('splat');
    } else if (impact > 520) {
      this.vy = -impact * 0.28;
      this.fallStartY = ground;
    } else {
      this.vx = 0;
      this.vy = 0;
      this.setState('stand');
      if (this.wasCarried) this.shakeUntil = this.time + 0.9;
    }
    this.wasCarried = false;
  }

  private leaveStain() {
    const stain = svgElement('svg', { class: 'mascot-stain ink', viewBox: '-60 -40 120 80', 'aria-hidden': 'true' });
    stain.style.left = `${this.x - 60}px`;
    stain.style.top = `${this.y - 40}px`;
    this.options.layer.insertBefore(stain, this.el);
    renderScene(stain, inkSplat(0, 0, 26, Math.floor(Math.random() * 999)));
    window.setTimeout(() => stain.classList.add('is-drying'), 7000);
    window.setTimeout(() => stain.remove(), 9000);
  }

  private spawnDust(count: number) {
    for (let i = 0; i < count; i++) {
      const puff = document.createElement('span');
      puff.className = 'dog-dust';
      puff.style.left = `${this.x + (Math.random() - 0.5) * 50}px`;
      puff.style.top = `${this.y - 4}px`;
      puff.style.setProperty('--drift', `${(Math.random() - 0.5) * 40}px`);
      this.options.layer.insertBefore(puff, this.el);
      window.setTimeout(() => puff.remove(), 900);
    }
  }

  private spawnSnore = () => {
    if (this.state !== 'lie' || this.destroyed) return;
    const z = document.createElement('span');
    z.className = 'mascot-snore';
    z.textContent = pick(mascotReactions.sleep);
    this.el.append(z);
    window.setTimeout(() => z.remove(), 2400);
  };

  private render() {
    const pose = this.pose;
    const bobAmount = lerp(1.2, 2.8, this.runBlend) * this.gaitWeight;
    const bob = Math.cos(this.gaitPhase * Math.PI * 4) * bobAmount;
    const breathing = this.state === 'lie' ? Math.sin(this.time * 1.6) * 0.04 : Math.sin(this.time * (this.time < this.pantUntil ? 14 : 3)) * 0.022;
    const pitchWave = Math.sin(this.gaitPhase * Math.PI * 4 + 0.6) * 3 * this.runBlend * this.gaitWeight * DEG;
    const squashDrop = this.squash * 5;
    const shaking = Math.max(0, this.shakeUntil - this.time);
    const shake = Math.sin(this.time * 46) * Math.min(1, shaking * 2) * 7 * DEG;

    const hip: Point = [pose.hipX, pose.hipY + bob + squashDrop];
    const shoulder: Point = [pose.shoulderX, pose.shoulderY - bob * 0.6 + squashDrop * 0.8];
    const pitch = Math.atan2(shoulder[1] - hip[1], shoulder[0] - hip[0]) + pitchWave + shake * 0.4;
    const middle: Point = [(hip[0] + shoulder[0]) / 2, (hip[1] + shoulder[1]) / 2];

    this.parts.torso.setAttribute(
      'transform',
      `translate(${middle[0].toFixed(2)} ${middle[1].toFixed(2)}) rotate(${(pitch / DEG).toFixed(2)}) scale(${(1 + this.squash * 0.12).toFixed(3)} ${(1 + breathing - this.squash * 0.18).toFixed(3)})`
    );

    // Head and neck
    const nod = Math.sin(this.gaitPhase * Math.PI * 4 + 1.2) * 1.4 * this.gaitWeight;
    const sniffBob = this.state === 'sniff' ? Math.sin(this.time * 22) * 0.8 : 0;
    const head: Point = [shoulder[0] + pose.headX, shoulder[1] + pose.headY + nod + sniffBob];
    const lookAllowed = this.state === 'stand' || this.state === 'sit' || this.state === 'paw';
    if (shaking > 0) this.ear.velocity[1] -= Math.sin(this.time * 46) * 40;
    const scratchTilt = this.state === 'scratch' ? -16 + Math.sin(this.time * 34) * 2 : 0;
    const headAngle = pose.headAngle + (lookAllowed ? this.lookAngle : 0) - this.headKick * 14 * Math.sin(this.headKick * 9) + shake / DEG * 2.2 + scratchTilt;
    this.parts.head.setAttribute('transform', `translate(${head[0].toFixed(2)} ${head[1].toFixed(2)}) rotate(${headAngle.toFixed(2)})`);
    const neckBase = add(shoulder, rotate([2, -7], pitch));
    const headBase = add(head, rotate([-4, 4], headAngle * DEG));
    const neckMid: Point = [(neckBase[0] + headBase[0]) / 2 + 2, (neckBase[1] + headBase[1]) / 2];
    this.parts.neck.setAttribute('d', brushPath([neckBase, neckMid, headBase], 10, { seed: 91, start: 0.05, end: 0.1, wobble: 0.1 }));

    // Floppy ear: a damped spring hanging from the skull
    const earRoot = add(head, rotate([-4.5, -5], headAngle * DEG));
    const earRest = add(earRoot, rotate([-4.5, 11.5], headAngle * DEG * 0.35));
    if (!this.ear.ready) {
      this.ear.tip = earRest;
      this.ear.ready = true;
    }
    const step = 1 / 60;
    this.ear.velocity = [
      this.ear.velocity[0] + ((earRest[0] - this.ear.tip[0]) * 320 - this.ear.velocity[0] * 14) * step,
      this.ear.velocity[1] + ((earRest[1] - this.ear.tip[1]) * 320 - this.ear.velocity[1] * 14 + (this.state === 'air' ? -this.vy * 0.4 : 0)) * step,
    ];
    this.ear.tip = add(this.ear.tip, [this.ear.velocity[0] * step, this.ear.velocity[1] * step]);
    const earMid: Point = [(earRoot[0] + this.ear.tip[0]) / 2 - 1.5, (earRoot[1] + this.ear.tip[1]) / 2];
    this.parts.ear.setAttribute('d', brushPath([earRoot, earMid, this.ear.tip], 7, { seed: 92, start: 0.08, end: 0.55, wobble: 0.1 }));

    // Tail: a chain of segments rooted at the rump
    const tailPoints: Point[] = [add(hip, rotate([-5, -5], pitch))];
    this.tailAngles.forEach((angle) => {
      const previous = tailPoints[tailPoints.length - 1];
      tailPoints.push(add(previous, rotate([-5.2, 0], pitch - angle)));
    });
    this.parts.tail.setAttribute('d', brushPath(tailPoints, 5.2, { seed: 93, start: 0.04, end: 0.8, wobble: 0.1 }));

    // Legs (near pair over the body, far pair under it)
    const rearHipNear = add(hip, rotate([2, 2], pitch));
    const rearHipFar = add(hip, rotate([-1, 1], pitch));
    const frontNear = add(shoulder, rotate([0, 4], pitch));
    const frontFar = add(shoulder, rotate([3, 3], pitch));
    const leg = (root: Point, foot: Point, bones: typeof REAR, bend: 1 | -1, width: number, seed: number) => {
      const knee = solveLeg(root, foot, bones.upper, bones.lower, bend);
      const paw: Point = [foot[0] + 3.2, foot[1] - 0.2];
      return brushOutline(densify([root, knee, foot, paw], 2), width, { seed, start: 0.03, end: 0.1, wobble: 0.08 });
    };
    const [rearNearFoot, frontNearFoot, rearFarFoot, frontFarFoot] = this.feet;
    this.parts['near-rear'].setAttribute('d', leg(rearHipNear, rearNearFoot, REAR, 1, 4.8, 94));
    this.parts['near-front'].setAttribute('d', leg(frontNear, frontNearFoot, FRONT, -1, 4.4, 95));
    this.parts['far-rear'].setAttribute('d', leg(rearHipFar, rearFarFoot, REAR, 1, 4.2, 96));
    this.parts['far-front'].setAttribute('d', leg(frontFar, frontFarFoot, FRONT, -1, 3.9, 97));
    const haunchKnee = solveLeg(rearHipNear, rearNearFoot, REAR.upper, REAR.lower, 1);
    this.parts.haunch.setAttribute('d', brushPath([add(rearHipNear, [1, -4]), [(rearHipNear[0] + haunchKnee[0]) / 2, (rearHipNear[1] + haunchKnee[1]) / 2]], 15, { seed: 98, start: 0.3, end: 0.55, wobble: 0.1 }));

    // Face details
    const blinking = this.time > this.blinkAt && this.time < this.blinkAt + 0.12;
    if (this.time > this.blinkAt + 0.12) this.blinkAt = this.time + 2 + Math.random() * 4;
    this.el.classList.toggle('is-blinking', blinking || this.state === 'lie' || this.state === 'knocked');
    this.el.classList.toggle('is-panting', this.time < this.pantUntil || this.time < this.happyUntil);
    this.parts.pupil.parentElement!.setAttribute('transform', `translate(${(this.pupil[0] * 0.6).toFixed(2)} ${(this.pupil[1] * 0.5).toFixed(2)})`);

    // Shadow and placement
    const lift = Math.max(0, this.options.groundY() - this.y);
    this.parts.shadow.setAttribute('transform', `translate(60 ${GROUND}) scale(${(1 - Math.min(0.6, lift / 300)).toFixed(3)} 1) translate(-60 ${-GROUND})`);
    this.parts.shadow.style.opacity = String(0.16 - Math.min(0.12, lift / 1500));
    this.el.style.transform = `translate3d(${(this.x - DISPLAY_W / 2).toFixed(1)}px, ${(this.y - FEET_FROM_TOP).toFixed(1)}px, 0)`;
    this.el.style.setProperty('--facing', String(this.facing));

    if (this.gaitWeight > 0.5 && this.runBlend > 0.6 && this.time - this.lastDustAt > 0.35) {
      this.lastDustAt = this.time;
      this.spawnDust(1);
    }
  }
}
