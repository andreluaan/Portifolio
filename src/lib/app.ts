import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import Lenis from 'lenis';
import { frameAll, prefersReducedMotion, renderScene, roughRect, stroke } from './brush';
import { startBoiling } from './effects';
import { applyStrings, getLang, initLang, onLangChange, pick, setLang, t } from './i18n';
import { runIntro } from './intro';
import { foundSecrets, onSecretsChange, secrets, watchGlobalSecrets } from './secrets';
import { isSoundOn, onSoundChange, setSound, sounds } from './sound';
import { mountWorld, type StationName } from './world';

gsap.registerPlugin(ScrollTrigger);

let lenis: Lenis | null = null;

function setupSmoothScroll() {
  if (prefersReducedMotion()) return;
  lenis = new Lenis({ lerp: 0.09, wheelMultiplier: 0.9 });
  lenis.on('scroll', ScrollTrigger.update);
  gsap.ticker.add((time) => lenis?.raf(time * 1000));
  gsap.ticker.lagSmoothing(0);
}

function scrollTo(y: number) {
  if (lenis) lenis.scrollTo(y, { duration: 1.6 });
  else window.scrollTo({ top: y });
}

function setupTopbar() {
  const langButtons = document.querySelectorAll<HTMLButtonElement>('[data-lang]');
  const syncLang = () => langButtons.forEach((button) => button.setAttribute('aria-pressed', String(button.dataset.lang === getLang())));
  langButtons.forEach((button) => button.addEventListener('click', () => setLang(button.dataset.lang as 'pt' | 'en')));
  onLangChange(() => {
    syncLang();
    renderPassport();
    requestAnimationFrame(() => frameAll());
  });
  syncLang();

  const soundButton = document.querySelector<HTMLButtonElement>('.sound-toggle')!;
  const soundIcon = soundButton.querySelector('svg')!;
  const drawSound = (on: boolean) => {
    soundButton.setAttribute('aria-pressed', String(on));
    soundButton.dataset.i18nLabel = on ? 'topbar.sound.on' : 'topbar.sound.off';
    soundButton.setAttribute('aria-label', t(on ? 'topbar.sound.on' : 'topbar.sound.off'));
    renderScene(soundIcon, [
      stroke([[4, 10], [10, 10], [17, 4], [17, 24], [10, 18], [4, 18], [4, 10]], 2, { seed: 41, start: 0.02, end: 0.04 }),
      ...(on
        ? [stroke([[22, 9], [25, 14], [22, 19]], 1.8, { seed: 42 }), stroke([[25, 5], [30, 14], [25, 23]], 1.8, { seed: 43 })]
        : [stroke([[22, 9], [30, 19]], 2, { seed: 44 }), stroke([[30, 9], [22, 19]], 2, { seed: 45 })]),
    ]);
  };
  soundButton.addEventListener('click', () => {
    setSound(!isSoundOn());
    sounds.pop();
  });
  onSoundChange(drawSound);
  drawSound(isSoundOn());

  const passport = document.getElementById('passport')!;
  const secretsButton = document.querySelector<HTMLButtonElement>('.secrets-toggle')!;
  secretsButton.addEventListener('click', () => {
    passport.hidden = !passport.hidden;
    secretsButton.setAttribute('aria-expanded', String(!passport.hidden));
    if (!passport.hidden) sounds.paper();
  });
  document.addEventListener('click', (event) => {
    if (!passport.hidden && !passport.contains(event.target as Node) && !secretsButton.contains(event.target as Node)) {
      passport.hidden = true;
      secretsButton.setAttribute('aria-expanded', 'false');
    }
  });
  onSecretsChange(renderPassport);
  renderPassport();
}

function renderPassport() {
  const found = foundSecrets();
  document.querySelector('.secrets-count')!.textContent = `${found.size}/${secrets.length}`;
  document.querySelector('.secrets-toggle')!.classList.toggle('is-complete', found.size === secrets.length);
  document.querySelector('.passport-grid')!.replaceChildren(
    ...secrets.map((secret) => {
      const item = document.createElement('li');
      const isFound = found.has(secret.id);
      item.className = isFound ? 'is-found' : '';
      item.innerHTML = `<span class="passport-stamp" aria-hidden="true"></span><span class="passport-text"><strong></strong><span></span></span>`;
      item.querySelector('.passport-stamp')!.textContent = isFound ? secret.glyph : '?';
      item.querySelector('strong')!.textContent = isFound ? pick(secret.name) : t('secrets.locked');
      item.querySelector('.passport-text span')!.textContent = isFound ? pick(secret.hint) : '· · ·';
      return item;
    })
  );
}

function setupDialog() {
  const dialog = document.getElementById('sheet-dialog') as HTMLDialogElement;
  const frame = dialog.querySelector<SVGSVGElement>('.sheet-frame')!;
  const drawFrame = () => {
    const { width, height } = dialog.getBoundingClientRect();
    if (!width) return;
    frame.setAttribute('viewBox', `0 0 ${width} ${height}`);
    renderScene(frame, roughRect(8, 8, width - 16, height - 16, 2.4, 900), { animate: true, pace: 2 });
  };
  new MutationObserver(() => dialog.open && requestAnimationFrame(drawFrame)).observe(dialog, { attributes: true, attributeFilter: ['open'] });
  dialog.querySelector('[data-close-sheet]')!.addEventListener('click', () => dialog.close());
  dialog.addEventListener('click', (event) => event.target === dialog && dialog.close());
  dialog.addEventListener('close', () => sounds.paper());
}

function setupNavigation(world: ReturnType<typeof mountWorld>) {
  document.querySelectorAll<HTMLElement>('[data-go]').forEach((button) =>
    button.addEventListener('click', (event) => {
      event.preventDefault();
      world.goTo(button.dataset.go as StationName);
      sounds.brush();
    })
  );
  world.onSection((name) => {
    document.querySelectorAll<HTMLElement>('.world-nav [data-go]').forEach((button) => button.setAttribute('aria-current', String(button.dataset.go === name)));
  });
}

export async function boot() {
  initLang();
  startBoiling();
  watchGlobalSecrets();
  setupSmoothScroll();
  setupTopbar();
  setupDialog();
  await runIntro();
  window.scrollTo(0, 0);
  const world = mountWorld(scrollTo);
  setupNavigation(world);
  applyStrings();
  ScrollTrigger.refresh();
  (document.fonts?.ready ?? Promise.resolve()).then(() => {
    frameAll();
    ScrollTrigger.refresh();
  });
}
