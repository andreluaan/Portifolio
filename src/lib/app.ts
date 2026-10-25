import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import Lenis from 'lenis';
import { brushPath, frameAll, prefersReducedMotion, renderScene, roughRect, stroke, svgElement } from './brush';
import { startBoiling } from './effects';
import { applyStrings, getLang, initLang, onLangChange, pick, setLang, t } from './i18n';
import { runIntro } from './intro';
import { foundSecrets, onSecretsChange, secrets, watchGlobalSecrets } from './secrets';
import { isSoundOn, onSoundChange, setSound, sounds } from './sound';
import { mountWorld, type StationName } from './world';

gsap.registerPlugin(ScrollTrigger);
ScrollTrigger.config({ ignoreMobileResize: true });

let lenis: Lenis | null = null;

function setupSmoothScroll() {
  if (prefersReducedMotion()) return;
  lenis = new Lenis({ lerp: 0.09, wheelMultiplier: 0.9 });
  lenis.on('scroll', ScrollTrigger.update);
  gsap.ticker.add((time) => lenis?.raf(time * 1000));
  gsap.ticker.lagSmoothing(0);
}

function scrollTo(y: number, immediate = false) {
  // A plain window.scrollTo is undone by Lenis on its next frame, so jumps go through Lenis too.
  if (lenis) {
    // Lenis caches the page height; right after the world pins, that value is stale and would clamp the jump.
    lenis.resize();
    lenis.scrollTo(y, immediate ? { immediate: true, force: true } : { duration: 1.6 });
  }
  else window.scrollTo({ top: y });
}

function setupTopbar() {
  const langButtons = document.querySelectorAll<HTMLButtonElement>('[data-lang]');
  const langDrop = document.querySelector<HTMLElement>('.lang-drop')!;
  const syncLang = () => {
    langButtons.forEach((button) => button.setAttribute('aria-pressed', String(button.dataset.lang === getLang())));
    // A drop of ink hops over to the chosen language
    const active = [...langButtons].find((button) => button.dataset.lang === getLang())!;
    const x = active.offsetLeft + active.offsetWidth / 2 - 3;
    if (prefersReducedMotion() || !langDrop.dataset.ready) gsap.set(langDrop, { x });
    else gsap.timeline().to(langDrop, { x, duration: 0.35, ease: 'power1.inOut' }).to(langDrop, { y: -9, duration: 0.17, ease: 'power1.out', yoyo: true, repeat: 1 }, 0);
    langDrop.dataset.ready = 'true';
  };
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

const HASH_TO_STATION: Record<string, StationName> = {
  inicio: 'hero',
  processo: 'process',
  destaques: 'line',
  estante: 'lectern',
  github: 'repos',
  ano: 'year',
  sobre: 'house',
  contato: 'mail',
  mesinha: 'desk',
};
const STATION_TO_HASH = Object.fromEntries(Object.entries(HASH_TO_STATION).map(([hash, station]) => [station, hash]));

function setupNavigation(world: ReturnType<typeof mountWorld>) {
  document.querySelectorAll<HTMLElement>('[data-go]').forEach((button) =>
    button.addEventListener('click', (event) => {
      event.preventDefault();
      const station = button.dataset.go as StationName;
      world.goTo(station);
      history.replaceState(null, '', station === 'hero' ? location.pathname : `#${STATION_TO_HASH[station] ?? station}`);
      sounds.brush();
    })
  );
  const navBrush = setupNavBrush();
  world.onSection((name) => {
    document.querySelectorAll<HTMLElement>('.world-nav [data-go]').forEach((button) => button.setAttribute('aria-current', String(button.dataset.go === name)));
    navBrush.moveTo(document.querySelector<HTMLElement>('.world-nav [aria-current="true"]'));
  });
}

/** One brushstroke under the navigation that travels to the current item (and previews the hovered one): it backs
 * off a little, stretches on the way and lands with a spring, leaving a drip where it started. */
function setupNavBrush() {
  const nav = document.querySelector<HTMLElement>('.world-nav')!;
  const brush = svgElement('svg', { class: 'nav-brush', viewBox: '0 0 100 10', preserveAspectRatio: 'none', 'aria-hidden': 'true' });
  svgElement('path', { d: brushPath([[2, 6], [40, 4.4], [98, 5.6]], 4.2, { seed: 21, start: 0.04, end: 0.35, wobble: 0.3 }), class: 'ink-ink' }, brush);
  const drip = document.createElement('span');
  drip.className = 'nav-drip';
  nav.append(brush, drip);
  let current: HTMLElement | null = null;
  const reduced = prefersReducedMotion();
  const place = (target: HTMLElement | null, settle = false) => {
    if (!target) return gsap.to(brush, { autoAlpha: 0, duration: 0.2 });
    const x = target.offsetLeft + 8;
    const width = target.offsetWidth - 16;
    const from = Number(gsap.getProperty(brush, 'x'));
    gsap.killTweensOf(brush);
    if (reduced || !brush.dataset.ready) {
      gsap.set(brush, { x, width, autoAlpha: 1, scaleX: 1 });
      brush.dataset.ready = 'true';
      return;
    }
    const away = Math.sign(x - from) || 1;
    gsap.timeline()
      .to(brush, { x: from - away * 6, duration: 0.08, ease: 'power2.in', autoAlpha: 1 })
      .to(brush, { x, width, duration: 0.6, ease: 'elastic.out(1, 0.55)' })
      .fromTo(brush, { scaleX: 1.35 }, { scaleX: 1, duration: 0.6, ease: 'power3.out' }, '<');
    if (settle && Math.abs(x - from) > 20) gsap.fromTo(drip, { x: from + 4, autoAlpha: 1, scale: 1 }, { autoAlpha: 0, scale: 0.4, y: 4, duration: 0.5, ease: 'power2.in' });
  };
  nav.querySelectorAll<HTMLElement>('[data-go]').forEach((button) => {
    button.addEventListener('pointerenter', () => place(button));
    button.addEventListener('pointerleave', () => place(current));
  });
  // Item widths change when the fonts arrive and with the language
  window.addEventListener('resize', () => place(current));
  document.fonts?.ready.then(() => place(current));
  onLangChange(() => requestAnimationFrame(() => place(current)));
  return {
    moveTo(target: HTMLElement | null) {
      current = target;
      place(target, true);
    },
  };
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
  const linked = HASH_TO_STATION[location.hash.slice(1)] ?? location.hash.slice(1);
  if (linked && world.has(linked)) requestAnimationFrame(() => world.goTo(linked, true));
  (document.fonts?.ready ?? Promise.resolve()).then(() => {
    frameAll();
    ScrollTrigger.refresh();
  });
}
