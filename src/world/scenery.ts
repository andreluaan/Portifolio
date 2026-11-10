// The painted scenery behind and in front of the stations: the emaki roll, the floor, the foreground grass and the
// birds. Everything here was painted at build time; at runtime it is only placed, and the long strips are added a
// few tiles at a time as the camera nears them (and dropped when it is far, to keep image memory low).
import roll from '../data/rolo.json';
import { FRONT_PARALLAX, inkInfo, inkUrl, type View } from './map';

/** A long painting cut into tiles (see strips() in scripts/ink-bake/page.ts), shown only near the camera. */
class TiledStrip {
  private readonly tiles = new Map<number, HTMLImageElement>();
  private readonly count: number;
  private readonly first: ReturnType<typeof inkInfo>;

  constructor(private readonly host: HTMLElement, private readonly prefix: string, private density: number) {
    let count = 0;
    while (inkInfo(`${prefix}-${count}`)) count++;
    this.count = count;
    this.first = inkInfo(`${prefix}-0`);
  }

  /** Keeps the tiles within `ahead` world units on either side of the visible stretch, and lets go of the rest. */
  show(from: number, to: number, ahead: number) {
    for (let index = 0; index < this.count; index++) {
      const info = inkInfo(`${this.prefix}-${index}`);
      const near = info.x + info.width > from - ahead && info.x < to + ahead;
      const far = info.x + info.width < from - ahead * 2.5 || info.x > to + ahead * 2.5;
      if (near && !this.tiles.has(index)) this.add(index, info);
      else if (far && this.tiles.has(index)) {
        this.tiles.get(index)!.remove();
        this.tiles.delete(index);
      }
    }
  }

  private add(index: number, info: ReturnType<typeof inkInfo>) {
    const tile = new Image();
    tile.alt = '';
    tile.decoding = 'async';
    tile.className = 'scenery-tile';
    tile.src = inkUrl(`${this.prefix}-${index}`, this.density);
    // One unit wider than its share, so no hairline of paper shows between two tiles
    Object.assign(tile.style, { left: `${info.x}px`, top: `${info.y}px`, width: `${info.width + 1}px`, height: `${info.height}px` });
    this.host.append(tile);
    this.tiles.set(index, tile);
  }

  clear() {
    this.tiles.forEach((tile) => tile.remove());
    this.tiles.clear();
  }

  get top() {
    return this.first.y;
  }
}

export class Scenery {
  private floor: TiledStrip | null = null;
  private front: TiledStrip | null = null;
  private rollImage: HTMLImageElement | null = null;
  private rollTravel = 0;
  private view!: View;

  constructor(
    private readonly layers: { roll: HTMLElement; floor: HTMLElement; front: HTMLElement; sky: HTMLElement }
  ) {
    for (let index = 0; index < 3; index++) {
      const bird = new Image();
      bird.alt = '';
      bird.className = 'mundo-bird';
      bird.src = inkUrl('bird', 2);
      bird.style.top = `${22 + index * 4}%`;
      bird.style.setProperty('--fly', `${18 + index * 5}s`);
      bird.style.animationDelay = `${-index * 6}s`;
      layers.sky.append(bird);
    }
  }

  /** Lays the scenery out for a view: called on start and whenever the window changes size. */
  setView(view: View) {
    const previous = this.view;
    this.view = view;
    const { layout, zoom } = view;
    const density = zoom * Math.min(window.devicePixelRatio || 1, 2);
    if (!previous || previous.layout !== layout || densityChanged(previous, view)) {
      this.floor?.clear();
      this.front?.clear();
      this.floor = new TiledStrip(this.layers.floor, `floor-${layout.name}`, density);
      this.front = new TiledStrip(this.layers.front, `front-${layout.name}`, density);
      this.placeBranches();
    }

    // The painting is scaled so its ground band meets the world's ground, and it travels its whole length during the walk
    const scale = Math.max(layout.ground / (roll.height * 0.8), (view.span * 1.4) / roll.width);
    const shown = { width: roll.width * scale, height: roll.height * scale };
    this.rollTravel = shown.width - view.span;
    if (!this.rollImage) {
      this.rollImage = new Image();
      this.rollImage.alt = '';
      this.rollImage.decoding = 'async';
      this.rollImage.fetchPriority = 'high';
      this.layers.roll.querySelector('.mundo-plane')!.append(this.rollImage);
    }
    const wanted = shown.height * density;
    const preloaded = Number(document.documentElement.dataset.roll);
    // The first choice is the size Base.astro already preloaded, so the painting is never fetched twice
    const source = !previous && roll.sizes.includes(preloaded) ? preloaded : roll.sizes.find((size) => size >= wanted) ?? roll.sizes[roll.sizes.length - 1];
    const src = `/images/rolo/scroll-${source}-0.webp`;
    if (!this.rollImage.src.endsWith(src)) this.rollImage.src = src;
    Object.assign(this.rollImage.style, { width: `${shown.width}px`, height: `${shown.height}px`, top: `${layout.ground - shown.height * 0.8}px` });
    this.layers.roll.style.setProperty('--painting-height', `${shown.height}px`);
  }

  /** Three pine branches hang in from the top edge along the way, close to the eye. */
  private placeBranches() {
    const { layout, zoom } = this.view;
    this.layers.front.querySelectorAll('.scenery-branch').forEach((branch) => branch.remove());
    [0.18, 0.47, 0.81].forEach((at, index) => {
      const info = inkInfo(`branch-${index}`);
      const branch = new Image();
      branch.alt = '';
      branch.className = 'scenery-branch';
      branch.decoding = 'async';
      branch.loading = 'lazy';
      branch.src = inkUrl(`branch-${index}`, zoom * Math.min(window.devicePixelRatio || 1, 2));
      Object.assign(branch.style, { left: `${at * layout.frontWidth + info.x}px`, top: `${info.y - 6}px`, width: `${info.width}px`, height: `${info.height}px` });
      this.layers.front.append(branch);
    });
  }

  /** Called every frame the camera moved: `camera` is the left edge of the view, in world units. */
  update(camera: number) {
    const { layout, span } = this.view;
    const progress = Math.min(1, Math.max(0, camera / Math.max(1, layout.width - span)));
    this.layers.roll.style.transform = `translate3d(${(-progress * this.rollTravel).toFixed(2)}px, 0, 0)`;
    this.floor!.show(camera, camera + span, span);
    const front = camera * FRONT_PARALLAX;
    this.front!.show(front, front + span, span);
  }
}

const densityChanged = (a: View, b: View) => Math.abs(a.zoom - b.zoom) > 0.25;
