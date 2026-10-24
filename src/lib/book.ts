import gsap from 'gsap';
import { projects, type Project } from '../data/content';
import { prefersReducedMotion, renderScene, stroke } from './brush';
import { pick, t } from './i18n';
import { decorations, projectSketches, worldProps } from './scenes';
import { unlock } from './secrets';
import { sounds } from './sound';

const SPREAD_QUERY = '(min-width: 860px)';
const FLIP_DURATION = 0.9;

const coverArt = [
  stroke([[18, 8], [20, 492]], 26, { tone: 'wash', filter: 'wash', seed: 801 }),
  stroke([[300, -4], [302, 504]], 8, { seed: 802, start: 0.01, end: 0.01, dry: true }),
  stroke([[40, 30], [340, 26]], 1.4, { tone: 'wash', seed: 803 }),
  stroke([[40, 474], [340, 470]], 1.4, { tone: 'wash', seed: 804 }),
  stroke([[250, 420], [330, 400], [350, 460]], 24, { tone: 'mist', filter: 'wash', seed: 805 }),
];

function page(className: string, html = '') {
  const element = document.createElement('article');
  element.className = `book-page ${className}`;
  element.innerHTML = html;
  return element;
}

function pageNumber(element: HTMLElement, number: number) {
  const marker = document.createElement('span');
  marker.className = 'book-page-number hand';
  marker.textContent = String(number);
  element.append(marker);
}

class Book {
  private readonly dialog = document.getElementById('book-dialog') as HTMLDialogElement;
  private readonly bookElement = this.dialog.querySelector<HTMLElement>('.book')!;
  private readonly leavesHost = this.dialog.querySelector<HTMLElement>('.book-leaves')!;
  private readonly counter = this.dialog.querySelector<HTMLElement>('.book-counter')!;
  private readonly reduced = prefersReducedMotion();
  private pages: HTMLElement[] = [];
  private leaves: HTMLElement[] = [];
  private spread = 0;
  private isSpreadLayout = true;
  private projectSpread = new Map<string, number>();
  private drawn = new Set<HTMLElement>();
  private busy: gsap.core.Timeline | null = null;
  private drag: { leaf: number; startX: number; direction: 1 | -1; moved: boolean } | null = null;

  constructor() {
    this.dialog.querySelector('[data-close-book]')!.addEventListener('click', () => this.dialog.close());
    this.dialog.querySelector('.book-nav.prev')!.addEventListener('click', () => this.goTo(this.spread - 1));
    this.dialog.querySelector('.book-nav.next')!.addEventListener('click', () => this.goTo(this.spread + 1));
    this.dialog.addEventListener('keydown', (event) => {
      if (event.key === 'ArrowRight') this.goTo(this.spread + 1);
      if (event.key === 'ArrowLeft') this.goTo(this.spread - 1);
    });
    this.dialog.addEventListener('close', () => sounds.paper());
    let wheelLock = 0;
    this.dialog.addEventListener(
      'wheel',
      (event) => {
        event.preventDefault();
        const now = performance.now();
        if (now < wheelLock || Math.abs(event.deltaY) < 8) return;
        wheelLock = now + 650;
        this.goTo(this.spread + Math.sign(event.deltaY));
      },
      { passive: false }
    );
    this.bindDrag();
    window.matchMedia(SPREAD_QUERY).addEventListener('change', () => this.dialog.open && this.build(this.spread));
  }

  open(projectId?: string) {
    this.isSpreadLayout = window.matchMedia(SPREAD_QUERY).matches;
    this.build(0);
    this.dialog.showModal();
    sounds.paper();
    renderScene(this.dialog.querySelector('.book-cover-art')!, coverArt, { animate: true, pace: 0.9 });
    if (projectId && this.projectSpread.has(projectId)) {
      window.setTimeout(() => this.goTo(this.projectSpread.get(projectId)!), 450);
    }
  }

  private buildPages() {
    let number = 1;
    const cover = page(
      'book-cover',
      `<svg class="ink book-cover-art" viewBox="0 0 360 500" preserveAspectRatio="none" aria-hidden="true"></svg>
       <div class="book-cover-content">
         <p class="hand"></p>
         <h2 class="book-cover-title"></h2>
         <p class="book-cover-author">André Luan</p>
         <svg class="ink book-cover-seal" viewBox="0 0 44 44" aria-hidden="true"></svg>
       </div>`
    );
    cover.querySelector('.hand')!.textContent = pick({ pt: 'estante nº 1', en: 'bookstand no. 1' });
    cover.querySelector('.book-cover-title')!.textContent = t('book.title');
    renderScene(cover.querySelector('.book-cover-art')!, coverArt);
    renderScene(cover.querySelector('.book-cover-seal')!, decorations.seal);

    const intro = page(
      'book-intro',
      `<p class="hand"></p><h2></h2><svg class="ink book-underline" viewBox="0 0 190 16" aria-hidden="true"></svg><p class="book-intro-text"></p><p class="hand book-intro-hint"></p>`
    );
    intro.querySelector('.hand')!.textContent = pick({ pt: 'na estante', en: 'on the bookstand' });
    intro.querySelector('h2')!.textContent = t('book.title');
    intro.querySelector('.book-intro-text')!.textContent = t('book.subtitle');
    intro.querySelector('.book-intro-hint')!.textContent = t('book.hint');
    renderScene(intro.querySelector('.book-underline')!, decorations.underline);
    pageNumber(intro, number++);

    const index = page('book-index', `<p class="label"></p><ol class="book-index-list"></ol>`);
    index.querySelector('.label')!.textContent = t('book.index');
    pageNumber(index, number++);

    const projectPages: HTMLElement[] = [];
    const indexList = index.querySelector('.book-index-list')!;
    projects.forEach((project, position) => {
      const left = this.projectLeft(project);
      const leftNumber = number;
      pageNumber(left, number++);
      const right = this.projectRight(project);
      pageNumber(right, number++);
      projectPages.push(left, right);

      const target = this.isSpreadLayout ? 2 + position : 3 + position * 2;
      this.projectSpread.set(project.id, target);
      const item = document.createElement('li');
      item.innerHTML = `<button type="button"><span class="book-index-title"></span><span class="book-index-dots" aria-hidden="true"></span><span class="hand"></span></button>`;
      item.querySelector('.book-index-title')!.textContent = pick(project.title);
      item.querySelector('.hand')!.textContent = String(leftNumber);
      item.querySelector('button')!.addEventListener('click', (event) => {
        event.stopPropagation();
        this.goTo(target);
      });
      indexList.append(item);
    });

    const end = page('book-end', `<svg class="ink book-end-enso" viewBox="0 0 120 120" aria-hidden="true"></svg><p class="hand"></p>`);
    end.querySelector('.hand')!.textContent = t('book.end');
    renderScene(end.querySelector('svg')!, worldProps.enso(1900));
    pageNumber(end, number);

    return [cover, intro, index, ...projectPages, end];
  }

  private projectLeft(project: Project) {
    const element = page(
      'book-project-left',
      `<div class="book-sketch"><svg class="ink" viewBox="0 0 240 160" aria-hidden="true"></svg></div>
       <p class="hand book-year"></p>
       <h3></h3>
       <p class="hand book-status"></p>`
    );
    element.dataset.project = project.id;
    element.querySelector('.book-year')!.textContent = project.year;
    element.querySelector('h3')!.textContent = pick(project.title);
    element.querySelector('.book-status')!.textContent = pick(project.status);
    renderScene(element.querySelector('svg')!, projectSketches[project.id]);
    return element;
  }

  private projectRight(project: Project) {
    const element = page(
      'book-project-right',
      `<div><p class="label"></p><p class="book-summary"></p></div>
       <div><p class="label"></p><p class="book-stat"></p></div>
       <div><p class="label"></p><ul class="tags"></ul></div>
       <p class="hand book-notes"></p>`
    );
    const labels = element.querySelectorAll('.label');
    labels[0].textContent = t('book.what');
    labels[1].textContent = t('book.numbers');
    labels[2].textContent = t('book.tools');
    element.querySelector('.book-summary')!.textContent = pick(project.summary);
    element.querySelector('.book-stat')!.textContent = pick(project.stat);
    element.querySelector('.tags')!.append(...pick(project.tags).map((tag) => Object.assign(document.createElement('li'), { textContent: tag })));
    element.querySelector('.book-notes')!.textContent = t('book.notes');
    return element;
  }

  private build(targetSpread: number) {
    this.busy?.kill();
    this.projectSpread.clear();
    this.drawn.clear();
    this.pages = this.buildPages();
    this.leavesHost.replaceChildren();
    this.bookElement.classList.toggle('is-spread', this.isSpreadLayout);

    const base = document.createElement('div');
    base.className = 'book-leaf-base';
    if (this.isSpreadLayout) base.append(page('book-blank'));
    else base.append(this.pages[this.pages.length - 1]);
    this.leavesHost.append(base);

    const groups: Array<[HTMLElement, HTMLElement | null]> = [];
    if (this.isSpreadLayout) {
      for (let i = 0; i < this.pages.length; i += 2) groups.push([this.pages[i], this.pages[i + 1] ?? null]);
    } else {
      this.pages.slice(0, -1).forEach((element) => groups.push([element, null]));
    }

    this.leaves = groups.map(([front, back], index) => {
      const leaf = document.createElement('div');
      leaf.className = 'book-leaf';
      const frontFace = document.createElement('div');
      frontFace.className = 'book-face book-front';
      frontFace.append(front);
      const backFace = document.createElement('div');
      backFace.className = 'book-face book-back';
      backFace.append(back ?? page('book-blank book-verso'));
      leaf.append(frontFace, backFace);
      this.leavesHost.append(leaf);
      const turned = index < targetSpread;
      gsap.set(leaf, { rotationY: turned ? -180 : 0, autoAlpha: !this.isSpreadLayout && turned ? 0 : 1 });
      return leaf;
    });
    this.spread = Math.min(targetSpread, this.leaves.length);
    this.updateStacking();
    this.updateShift(0);
    this.afterSpread();
  }

  private updateStacking() {
    this.leaves.forEach((leaf, index) => {
      const angle = Number(gsap.getProperty(leaf, 'rotationY'));
      const flipping = angle < -3 && angle > -177;
      leaf.style.zIndex = String(flipping ? 300 : angle <= -90 ? 100 + index : 200 - index);
      leaf.style.setProperty('--bend', Math.sin((Math.abs(angle) * Math.PI) / 180).toFixed(3));
    });
  }

  private shiftFor(spread: number) {
    if (!this.isSpreadLayout) return 0;
    if (spread === 0) return -25;
    if (spread >= this.leaves.length) return 25;
    return 0;
  }

  private updateShift(duration: number) {
    gsap.to(this.bookElement, { xPercent: this.shiftFor(this.spread), duration, ease: 'power2.inOut' });
  }

  private flipTween(index: number, turned: boolean, duration = FLIP_DURATION) {
    const leaf = this.leaves[index];
    let crossed = false;
    return gsap.to(leaf, {
      rotationY: turned ? -180 : 0,
      duration: this.reduced ? 0.01 : duration,
      ease: 'power2.inOut',
      onStart: () => {
        if (!this.isSpreadLayout && !turned) gsap.set(leaf, { autoAlpha: 1 });
      },
      onUpdate: () => {
        this.updateStacking();
        const angle = Number(gsap.getProperty(leaf, 'rotationY'));
        if (!crossed && (turned ? angle < -90 : angle > -90)) {
          crossed = true;
          sounds.pageFlip();
        }
      },
      onComplete: () => {
        if (!this.isSpreadLayout && turned) gsap.set(leaf, { autoAlpha: 0 });
      },
    });
  }

  goTo(target: number) {
    const clamped = Math.max(0, Math.min(this.leaves.length, target));
    if (clamped === this.spread) return;
    this.busy?.progress(1);
    const forward = clamped > this.spread;
    const steps = Math.abs(clamped - this.spread);
    const timeline = gsap.timeline({ onComplete: () => this.afterSpread() });
    for (let step = 0; step < steps; step++) {
      const index = forward ? this.spread + step : this.spread - step - 1;
      timeline.add(this.flipTween(index, forward, steps > 1 ? 0.7 : FLIP_DURATION), step * 0.14);
    }
    this.spread = clamped;
    this.updateShift(0.8);
    this.busy = timeline;
  }

  private afterSpread() {
    const total = this.leaves.length;
    this.counter.textContent = `${this.spread} / ${total}`;
    this.dialog.querySelector<HTMLButtonElement>('.book-nav.prev')!.disabled = this.spread === 0;
    this.dialog.querySelector<HTMLButtonElement>('.book-nav.next')!.disabled = this.spread === total;
    if (this.spread === total) unlock('reader');
    this.visiblePages().forEach((element) => {
      if (this.drawn.has(element)) return;
      this.drawn.add(element);
      if (element.classList.contains('book-project-left')) {
        renderScene(element.querySelector('svg')!, projectSketches[element.dataset.project!], { animate: true, pace: 1.3 });
      } else if (element.classList.contains('book-intro')) {
        renderScene(element.querySelector('.book-underline')!, decorations.underline, { animate: true, delay: 0.2 });
      } else if (element.classList.contains('book-index') && !this.reduced) {
        gsap.fromTo(element.querySelectorAll('li'), { autoAlpha: 0, x: -10 }, { autoAlpha: 1, x: 0, stagger: 0.06, duration: 0.4, clearProps: 'all' });
      } else if (element.classList.contains('book-end')) {
        renderScene(element.querySelector('svg')!, worldProps.enso(1900), { animate: true, pace: 0.6 });
      }
    });
  }

  private visiblePages() {
    if (this.isSpreadLayout) return [this.pages[this.spread * 2 - 1], this.pages[this.spread * 2]].filter(Boolean);
    return [this.pages[this.spread]].filter(Boolean);
  }

  private bindDrag() {
    const pageWidth = () => this.leaves[0]?.getBoundingClientRect().width || 400;

    this.bookElement.addEventListener('pointerdown', (event) => {
      if ((event.target as HTMLElement).closest('button, a')) return;
      const rect = this.bookElement.getBoundingClientRect();
      const onRight = this.isSpreadLayout ? event.clientX > rect.left + rect.width / 2 : event.clientX > rect.left + rect.width * 0.35;
      const direction: 1 | -1 = onRight ? 1 : -1;
      const leaf = direction === 1 ? this.spread : this.spread - 1;
      if (leaf < 0 || leaf >= this.leaves.length) return;
      this.busy?.progress(1);
      this.drag = { leaf, startX: event.clientX, direction, moved: false };
      this.bookElement.setPointerCapture(event.pointerId);
      if (!this.isSpreadLayout && direction === -1) gsap.set(this.leaves[leaf], { autoAlpha: 1 });
    });

    this.bookElement.addEventListener('pointermove', (event) => {
      if (!this.drag) return;
      const distance = (this.drag.startX - event.clientX) * this.drag.direction;
      if (Math.abs(distance) > 6) this.drag.moved = true;
      if (!this.drag.moved) return;
      const progress = Math.max(0, Math.min(1, distance / pageWidth()));
      const angle = this.drag.direction === 1 ? -180 * progress : -180 * (1 - progress);
      gsap.set(this.leaves[this.drag.leaf], { rotationY: angle });
      this.updateStacking();
    });

    const release = (event: PointerEvent) => {
      if (!this.drag) return;
      const { leaf, direction, moved, startX } = this.drag;
      this.drag = null;
      if (this.bookElement.hasPointerCapture(event.pointerId)) this.bookElement.releasePointerCapture(event.pointerId);
      if (!moved) {
        this.goTo(this.spread + direction);
        return;
      }
      const progress = ((startX - event.clientX) * direction) / pageWidth();
      const complete = progress > 0.3;
      const turned = direction === 1 ? complete : !complete;
      if (complete) this.spread += direction;
      this.flipTween(leaf, turned, 0.45).eventCallback('onComplete', () => {
        if (!this.isSpreadLayout && turned) gsap.set(this.leaves[leaf], { autoAlpha: 0 });
        this.afterSpread();
      });
      this.updateShift(0.6);
    };
    this.bookElement.addEventListener('pointerup', release);
    this.bookElement.addEventListener('pointercancel', release);
  }
}

let instance: Book | null = null;

export function openBook(projectId?: string) {
  instance ??= new Book();
  instance.open(projectId);
}
