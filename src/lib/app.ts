import gsap from 'gsap';
import { brushPath, frameAll, prefersReducedMotion, renderScene, roughRect, svgElement } from './brush';
import { startBoiling } from './effects';
import { getLang, pick, t } from './i18n';
import { runIntro } from './intro';
import { foundSecrets, onSecretsChange, secrets, watchGlobalSecrets } from './secrets';
import { isSoundOn, onSoundChange, setSound, sounds } from './sound';
import { mountWorld, type StationName } from '../world';

/** While the notebook, the character sheet or the book is open, the world stays where it is: they have their own
 * scrolling, and the wheel reaching the page underneath would walk the world on behind them. */
function lockWorldUnderDialogs() {
  const dialogs = [...document.querySelectorAll('dialog')];
  const sync = () => {
    const open = dialogs.some((dialog) => dialog.open);
    document.documentElement.classList.toggle('is-locked', open);
  };
  const observer = new MutationObserver(sync);
  dialogs.forEach((dialog) => observer.observe(dialog, { attributes: true, attributeFilter: ['open'] }));
}

function setupTopbar() {
  // Each language is its own page. The drop of ink sits under the current one and, on the way out, hops to the other
  const langLinks = [...document.querySelectorAll<HTMLAnchorElement>('.lang-switch [data-lang]')];
  const langDrop = document.querySelector<HTMLElement>('.lang-drop')!;
  const dropOver = (link: HTMLElement) => link.offsetLeft + link.offsetWidth / 2 - 3;
  gsap.set(langDrop, { x: dropOver(langLinks.find((link) => link.dataset.lang === getLang())!) });
  langLinks.forEach((link) =>
    link.addEventListener('click', (event) => {
      if (link.dataset.lang === getLang() || prefersReducedMotion() || event.metaKey || event.ctrlKey) return;
      event.preventDefault();
      gsap.timeline({ onComplete: () => location.assign(link.href + location.hash) })
        .to(langDrop, { x: dropOver(link), duration: 0.3, ease: 'power1.inOut' })
        .to(langDrop, { y: -9, duration: 0.15, ease: 'power1.out', yoyo: true, repeat: 1 }, 0);
    })
  );

  const soundButton = document.querySelector<HTMLButtonElement>('.sound-toggle')!;
  // Both icons are baked; aria-pressed shows the right one (pieces.css)
  const drawSound = (on: boolean) => {
    soundButton.setAttribute('aria-pressed', String(on));
    soundButton.setAttribute('aria-label', t(on ? 'topbar.sound.on' : 'topbar.sound.off'));
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

/** Switches between walking the world and reading the page; the choice is kept and the page reloads into it. */
function setupModeToggle() {
  document.querySelector('[data-mode-toggle]')?.addEventListener('click', () => {
    const reading = !document.documentElement.classList.contains('has-world');
    try {
      localStorage.setItem('portfolio-mode', reading ? 'world' : 'read');
    } catch {}
    location.reload();
  });
}

const HASH_TO_STATION: Record<string, StationName> = {
  inicio: 'hero',
  destaques: 'line',
  estante: 'lectern',
  github: 'repos',
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
  // Item widths change when the fonts arrive
  window.addEventListener('resize', () => place(current));
  document.fonts?.ready.then(() => place(current));
  return {
    moveTo(target: HTMLElement | null) {
      current = target;
      place(target, true);
    },
  };
}

export async function boot() {
  // A link to a station wins over the scroll the browser would restore from the last visit
  if (location.hash.length > 1) history.scrollRestoration = 'manual';
  startBoiling();
  watchGlobalSecrets();
  lockWorldUnderDialogs();
  setupTopbar();
  setupDialog();
  setupModeToggle();
  // Reading mode: the same page as a plain document, no world to mount
  if (!document.documentElement.classList.contains('has-world')) {
    document.getElementById('intro')?.remove();
    return;
  }
  await runIntro();
  const world = mountWorld();
  window.addEventListener('hashchange', () => {
    const station = HASH_TO_STATION[location.hash.slice(1)];
    if (station) world.goTo(station);
  });
  setupNavigation(world);
  const linked = HASH_TO_STATION[location.hash.slice(1)] ?? location.hash.slice(1);
  if (linked && world.has(linked)) {
    // The browser also jumps to the element with that id once the page loads, and inside the pinned view that
    // means the top: the station is taken again after it
    const go = () => requestAnimationFrame(() => world.goTo(linked, true));
    go();
    if (document.readyState !== 'complete') window.addEventListener('load', go, { once: true });
  }
  (document.fonts?.ready ?? Promise.resolve()).then(() => frameAll());
}
