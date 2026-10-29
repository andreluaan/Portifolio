import { paintPlane, type PlaneJob } from './landscape';

/** Moves the landscape painting (landscape.ts) off the page: the per-pixel washes took over a second of main thread
 * on a slow phone, right when the page is trying to show itself. Kept apart from landscape.ts so the worker bundle
 * never contains the code that starts it. */

export interface PlaneRequest {
  generation: number;
  jobs: PlaneJob[];
}

/** A painted tile, or (without `tile`) the end of a plane. */
export interface TileMessage {
  generation: number;
  job: number;
  tile?: { x0: number; width: number; height: number; bitmap: ImageBitmap };
}

let worker: Worker | null = null;
let generation = 0;

function tileElement(x0: number, width: number, height: number, source: ImageBitmap | HTMLCanvasElement) {
  let canvas: HTMLCanvasElement;
  if (source instanceof HTMLCanvasElement) canvas = source;
  else {
    canvas = Object.assign(document.createElement('canvas'), { width: source.width, height: source.height });
    canvas.getContext('bitmaprenderer')!.transferFromImageBitmap(source);
  }
  canvas.className = 'mundo-baked';
  Object.assign(canvas.style, { left: `${x0}px`, width: `${width}px`, height: `${height}px` });
  return canvas;
}

/** Paints the planes into their hosts in order, each swapped in whole once all its tiles are ready. A new call drops
 * whatever an older one had left, so a resize never lands stale tiles. */
export function paintPlanes(jobs: (PlaneJob & { host: HTMLElement })[]) {
  const current = ++generation;
  worker?.terminate();
  worker = null;
  const tiles = jobs.map(() => [] as HTMLCanvasElement[]);
  const finish = (index: number) => jobs[index].host.replaceChildren(...tiles[index]);

  // Without workers (or if one fails) the tiles are painted here, one per frame, as before
  const onMainThread = async (from: number) => {
    for (let index = from; index < jobs.length; index++) {
      tiles[index] = [];
      for (const { x0, width, height, canvas } of paintPlane(jobs[index])) {
        if (current !== generation) return;
        const source = canvas instanceof HTMLCanvasElement ? canvas : canvas.transferToImageBitmap();
        tiles[index].push(tileElement(x0, width, height, source));
        await new Promise((resolve) => requestAnimationFrame(resolve));
      }
      finish(index);
    }
  };

  if (typeof OffscreenCanvas === 'undefined' || typeof Worker === 'undefined') return void onMainThread(0);
  let own: Worker;
  try {
    own = new Worker(new URL('./landscape.worker.ts', import.meta.url), { type: 'module' });
  } catch {
    return void onMainThread(0);
  }
  worker = own;
  let unfinished = 0;
  const stop = () => {
    own.terminate();
    if (worker === own) worker = null;
  };
  own.onmessage = ({ data }: MessageEvent<TileMessage>) => {
    if (data.generation !== current) return;
    if (data.tile) {
      const { x0, width, height, bitmap } = data.tile;
      tiles[data.job].push(tileElement(x0, width, height, bitmap));
      return;
    }
    finish(data.job);
    unfinished = data.job + 1;
    if (unfinished === jobs.length) stop();
  };
  own.onerror = () => {
    stop();
    if (current === generation) void onMainThread(unfinished);
  };
  const request: PlaneRequest = { generation: current, jobs: jobs.map(({ name, spec, scale }) => ({ name, spec, scale })) };
  own.postMessage(request);
}
