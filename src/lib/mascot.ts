import { mascotLines, mascotReactions } from '../data/content';
import { brushPath, ellipsePoints, inkSplat, prefersReducedMotion, renderScene, svgElement } from './brush';
import { pick, t } from './i18n';
import { unlock } from './secrets';
import { sounds } from './sound';

type MascotState = 'idle' | 'walk' | 'carried' | 'falling' | 'knocked' | 'sleep';

export interface MascotOptions {
  layer: HTMLElement;
  groundY: () => number;
  minX?: () => number;
  maxX?: () => number;
  scripted?: boolean;
  footprints?: boolean;
  startX?: number;
}

const WIDTH = 64;
const HEIGHT = 64;
const SPRING = 260;
const DAMPING = 28;
const GRAVITY = 2400;
const WALK_SPEED = 70;
const SLEEP_AFTER = 28_000;

const MOUTHS = {
  smile: 'M26 36 Q30 39.5 34 36',
  flat: 'M26.5 37 L33.5 37',
  open: 'M28 36 Q30 41 32 36 Q30 34.5 28 36',
  frown: 'M26 38.5 Q30 35 34 38.5',
};

function mascotSvg() {
  const body = brushPath(ellipsePoints(30, 29, 13, 11, { seed: 7, count: 16 }), 21, { seed: 7, start: 0.02, end: 0.05, wobble: 0.2 });
  const tuft = brushPath([[29, 14], [31, 7], [37, 3]], 3, { seed: 8 });
  const tuftSmall = brushPath([[26, 16], [24, 10]], 2, { seed: 9 });
  return `
    <svg class="mascot-svg" viewBox="0 0 60 64" aria-hidden="true">
      <ellipse class="mascot-shadow" cx="30" cy="60" rx="14" ry="3"/>
      <g class="mascot-legs">
        <path class="mascot-leg leg-a" d="M24 40 L22 58"/>
        <path class="mascot-leg leg-b" d="M36 40 L38 58"/>
      </g>
      <g class="mascot-body">
        <path class="mascot-arm arm-a" d="M17 31 L10 36"/>
        <path class="mascot-arm arm-b" d="M43 31 L50 36"/>
        <path d="${body}" class="ink-ink" filter="url(#boil)"/>
        <path d="${tuft}" class="ink-ink"/>
        <path d="${tuftSmall}" class="ink-ink"/>
        <g class="mascot-eyes">
          <g class="mascot-eye"><circle cx="25" cy="27" r="4.2" class="ink-paper"/><circle class="mascot-pupil ink-ink" cx="25" cy="27" r="1.9"/></g>
          <g class="mascot-eye"><circle cx="35" cy="27" r="4.2" class="ink-paper"/><circle class="mascot-pupil ink-ink" cx="35" cy="27" r="1.9"/></g>
        </g>
        <path class="mascot-closed" d="M21.5 27.5 Q25 30 28.5 27.5 M31.5 27.5 Q35 30 38.5 27.5"/>
        <path class="mascot-mouth" d="${MOUTHS.smile}"/>
      </g>
    </svg>`;
}

export class Mascot {
  readonly el: HTMLDivElement;
  private readonly options: Required<Omit<MascotOptions, 'startX'>>;
  private readonly reduced = prefersReducedMotion();
  private readonly bubble: HTMLDivElement;
  private readonly pupils: SVGCircleElement[];
  private readonly mouth: SVGPathElement;
  private state: MascotState = 'idle';
  private x: number;
  private y = 0;
  private vx = 0;
  private vy = 0;
  private targetX: number;
  private facing = 1;
  private pointerTarget: { x: number; y: number } | null = null;
  private dragStart: { x: number; y: number; time: number } | null = null;
  private fallStartY = 0;
  private idleUntil = 0;
  private lastInteraction = performance.now();
  private lastFootprintX = 0;
  private bubbleTimer = 0;
  private sleepTimer = 0;
  private frame = 0;
  private lastTime = performance.now();
  private lineIndex = 0;
  private scriptedSpeed = 0;
  private destroyed = false;

  constructor(options: MascotOptions) {
    this.options = {
      minX: () => 30,
      maxX: () => options.layer.clientWidth - 30,
      scripted: false,
      footprints: false,
      ...options,
    };
    this.x = options.startX ?? 80;
    this.targetX = this.x;

    this.el = document.createElement('div');
    this.el.className = 'mascot';
    this.el.setAttribute('role', 'button');
    this.el.tabIndex = 0;
    this.el.setAttribute('aria-label', t('mascot.name'));
    this.el.innerHTML = `<div class="mascot-flip">${mascotSvg()}</div><div class="mascot-bubble" hidden></div>`;
    this.bubble = this.el.querySelector('.mascot-bubble')!;
    this.pupils = [...this.el.querySelectorAll<SVGCircleElement>('.mascot-pupil')];
    this.mouth = this.el.querySelector('.mascot-mouth')!;
    options.layer.append(this.el);

    this.y = this.options.groundY();
    this.bindEvents();
    this.render();
    if (!this.reduced) this.frame = requestAnimationFrame(this.tick);
    this.sleepTimer = window.setInterval(this.spawnSnore, 1700);
  }

  destroy() {
    this.destroyed = true;
    cancelAnimationFrame(this.frame);
    window.clearInterval(this.sleepTimer);
    window.removeEventListener('pointermove', this.onWindowPointerMove);
    this.el.remove();
  }

  /** Used by scripted scenes (the paper world) to move the mascot along with the scroll. */
  drive(x: number, speed: number) {
    if (this.state === 'carried' || this.state === 'falling' || this.state === 'knocked') return;
    this.x = x;
    this.scriptedSpeed = speed;
    if (Math.abs(speed) > 4) {
      this.facing = Math.sign(speed);
      this.wake();
    }
    if (this.reduced) this.render();
  }

  hop(strength = 520) {
    if (this.state === 'falling' || this.state === 'carried') return;
    this.wake();
    this.fallStartY = this.y;
    this.vy = -strength;
    this.vx = this.options.scripted ? 0 : this.vx;
    this.setState('falling');
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
    if (this.options.scripted || this.state === 'carried' || this.state === 'falling' || this.state === 'knocked') return;
    this.wake();
    this.targetX = Math.max(this.options.minX(), Math.min(this.options.maxX(), x));
    this.setState('walk');
  }

  private bindEvents() {
    this.el.addEventListener('pointerdown', (event) => {
      event.preventDefault();
      this.el.setPointerCapture(event.pointerId);
      this.dragStart = { x: event.clientX, y: event.clientY, time: performance.now() };
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
        this.setState('falling');
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
    const eyeX = rect.left + rect.width / 2;
    const eyeY = rect.top + rect.height * 0.42;
    const angle = Math.atan2(event.clientY - eyeY, event.clientX - eyeX);
    const distance = Math.min(1, Math.hypot(event.clientX - eyeX, event.clientY - eyeY) / 220);
    const dx = Math.cos(angle) * 1.7 * distance * this.facing;
    const dy = Math.sin(angle) * 1.5 * distance;
    this.pupils.forEach((pupil) => pupil.setAttribute('transform', `translate(${dx.toFixed(2)} ${dy.toFixed(2)})`));
    if (distance < 0.5) this.wake();
  };

  private poke() {
    this.wake();
    unlock('tickle');
    sounds.pop();
    const lines = pick(mascotLines);
    this.say(lines[this.lineIndex++ % lines.length]);
    this.setMouth('open');
    window.setTimeout(() => this.setMouth('smile'), 700);
    if (!this.reduced) this.hop(460);
  }

  private wake() {
    this.lastInteraction = performance.now();
    if (this.state === 'sleep') this.setState('idle');
  }

  private toLayer(clientX: number, clientY: number) {
    const rect = this.options.layer.getBoundingClientRect();
    return { x: clientX - rect.left, y: clientY - rect.top + HEIGHT * 0.45 };
  }

  private setState(state: MascotState) {
    this.state = state;
    this.el.dataset.state = state;
    if (state === 'carried') this.setMouth('open');
    else if (state === 'sleep' || state === 'idle' || state === 'walk') this.setMouth(state === 'sleep' ? 'flat' : 'smile');
  }

  private setMouth(shape: keyof typeof MOUTHS) {
    this.mouth.setAttribute('d', MOUTHS[shape]);
  }

  private tick = (now: number) => {
    if (this.destroyed) return;
    const dt = Math.min(1 / 30, (now - this.lastTime) / 1000);
    this.lastTime = now;
    this.update(dt, now);
    this.render();
    this.frame = requestAnimationFrame(this.tick);
  };

  private update(dt: number, now: number) {
    const ground = this.options.groundY();
    const minX = this.options.minX();
    const maxX = this.options.maxX();

    switch (this.state) {
      case 'carried': {
        if (!this.pointerTarget) break;
        const ax = (this.pointerTarget.x - this.x) * SPRING - DAMPING * this.vx;
        const ay = (this.pointerTarget.y - this.y) * SPRING - DAMPING * this.vy;
        this.vx += ax * dt;
        this.vy += ay * dt;
        this.x += this.vx * dt;
        this.y += this.vy * dt;
        if (Math.abs(this.vx) > 30) this.facing = Math.sign(this.vx);
        break;
      }
      case 'falling': {
        this.vy += GRAVITY * dt;
        this.x += this.vx * dt;
        this.y += this.vy * dt;
        this.vx *= 0.992;
        if (this.x < minX || this.x > maxX) {
          this.x = Math.max(minX, Math.min(maxX, this.x));
          this.vx *= -0.5;
        }
        if (this.y >= ground) this.land(ground);
        break;
      }
      case 'knocked':
        this.y = ground;
        break;
      default: {
        this.y = ground;
        if (this.options.scripted) {
          this.setStateQuiet(Math.abs(this.scriptedSpeed) > 4 ? 'walk' : this.state === 'sleep' ? 'sleep' : 'idle');
          this.scriptedSpeed *= 0.85;
        } else if (this.state === 'walk') {
          const dx = this.targetX - this.x;
          this.vx = Math.max(-WALK_SPEED, Math.min(WALK_SPEED, dx * 3));
          this.x += this.vx * dt;
          this.facing = Math.sign(dx) || this.facing;
          if (Math.abs(dx) < 2) {
            this.vx = 0;
            this.setState('idle');
            this.idleUntil = now + 2500 + Math.random() * 4500;
          }
          this.leaveFootprint();
        } else if (this.state === 'idle' && now > this.idleUntil && now - this.lastInteraction < SLEEP_AFTER) {
          if (Math.random() < 0.6) this.walkTo(minX + Math.random() * (maxX - minX));
          else this.idleUntil = now + 2000 + Math.random() * 3000;
        }
        if (this.state !== 'sleep' && now - this.lastInteraction > SLEEP_AFTER && this.state === 'idle') this.setState('sleep');
      }
    }
  }

  private setStateQuiet(state: MascotState) {
    if (this.state !== state) this.setState(state);
  }

  private land(ground: number) {
    const impact = this.vy;
    const height = ground - this.fallStartY;
    this.y = ground;
    if (impact > 1100 || height > 260) {
      this.vx = 0;
      this.vy = 0;
      this.setState('knocked');
      this.setMouth('frown');
      this.say(pick(mascotReactions.dropped), 1400);
      sounds.splat();
      this.leaveStain();
      if (height > 260) unlock('splat');
      window.setTimeout(() => {
        if (this.state === 'knocked') {
          this.setState('idle');
          this.idleUntil = performance.now() + 1500;
        }
      }, 1500);
    } else if (impact > 380) {
      this.vy = -impact * 0.32;
      this.fallStartY = ground;
    } else {
      this.vx = 0;
      this.vy = 0;
      this.setState('idle');
      this.idleUntil = performance.now() + 1800;
    }
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

  private leaveFootprint() {
    if (!this.options.footprints || Math.abs(this.x - this.lastFootprintX) < 22) return;
    this.lastFootprintX = this.x;
    const print = document.createElement('span');
    print.className = 'mascot-footprint';
    print.style.left = `${this.x + (Math.random() - 0.5) * 8}px`;
    print.style.top = `${this.y - 2}px`;
    this.options.layer.insertBefore(print, this.el);
    window.setTimeout(() => print.remove(), 2600);
  }

  private spawnSnore = () => {
    if (this.state !== 'sleep' || this.destroyed) return;
    const z = document.createElement('span');
    z.className = 'mascot-snore';
    z.textContent = pick(mascotReactions.sleep);
    this.el.append(z);
    window.setTimeout(() => z.remove(), 2400);
  };

  private render() {
    const lift = Math.max(0, this.options.groundY() - this.y);
    this.el.style.transform = `translate3d(${(this.x - WIDTH / 2).toFixed(1)}px, ${(this.y - HEIGHT).toFixed(1)}px, 0)`;
    this.el.style.setProperty('--facing', String(this.facing));
    this.el.style.setProperty('--lift', String(Math.min(1, lift / 200)));
    this.el.style.setProperty('--sway', `${Math.max(-35, Math.min(35, -this.vx * 0.06)).toFixed(1)}deg`);
  }
}
