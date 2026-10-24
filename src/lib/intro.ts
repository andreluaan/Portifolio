import { prefersReducedMotion, renderScene, stroke } from './brush';
import { Mascot } from './mascot';
import { unlock } from './secrets';
import { sounds } from './sound';

const SESSION_KEY = 'portfolio-intro-seen';
const DURATION = 2600;

export function runIntro(): Promise<void> {
  let seen = false;
  try {
    seen = sessionStorage.getItem(SESSION_KEY) === '1';
  } catch {}
  const intro = document.getElementById('intro');
  if (!intro || seen || prefersReducedMotion()) {
    intro?.remove();
    return Promise.resolve();
  }

  intro.hidden = false;
  document.body.classList.add('is-locked');
  const line = intro.querySelector<SVGSVGElement>('.intro-line')!;
  const stage = intro.querySelector<HTMLElement>('.intro-stage')!;
  const percent = intro.querySelector<HTMLElement>('.intro-percent')!;
  renderScene(line, [stroke([[0, 9], [160, 7], [320, 10]], 4.5, { seed: 19, dry: true, start: 0.02, end: 0.1 })], { animate: true, pace: 0.32 });

  let progress = 0;
  const mascot = new Mascot({ layer: stage, groundY: () => stage.clientHeight - 6, scripted: true, startX: 10 });

  return new Promise((resolve) => {
    const started = performance.now();
    let finished = false;
    let previousX = 10;

    const finish = (skipped: boolean) => {
      if (finished) return;
      finished = true;
      try {
        sessionStorage.setItem(SESSION_KEY, '1');
      } catch {}
      window.removeEventListener('keydown', onKey);
      sounds.brush();
      intro.classList.add('is-leaving');
      document.body.classList.remove('is-locked');
      window.setTimeout(() => {
        mascot.destroy();
        intro.remove();
      }, 900);
      if (skipped) unlock('skip');
      resolve();
    };

    const onKey = (event: KeyboardEvent) => event.key === 'Escape' && finish(true);
    window.addEventListener('keydown', onKey);
    intro.querySelector('.intro-skip')!.addEventListener('click', () => finish(true));

    const tick = (now: number) => {
      if (finished) return;
      const raw = Math.min(1, (now - started) / DURATION);
      progress = raw < 0.5 ? 2 * raw * raw : 1 - Math.pow(-2 * raw + 2, 2) / 2;
      percent.textContent = `${Math.round(progress * 100)}%`;
      const x = 22 + progress * (stage.clientWidth - 44);
      mascot.drive(x, (x - previousX) * 60);
      previousX = x;
      if (raw < 1) requestAnimationFrame(tick);
      else {
        mascot.hop(380);
        window.setTimeout(() => finish(false), 500);
      }
    };
    requestAnimationFrame(tick);
  });
}
