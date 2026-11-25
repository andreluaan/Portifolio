// Performance budget check: cold loads and a scripted walk through the world on a slowed-down machine.
// Usage: npm run build && npm run preview -- --port 4322, then `node scripts/perf.mjs [label] [url] [--mobile]`.
// `--mobile` loads and walks as a phone (390x844, 3x pixels, touch), the narrow map's hardest case.
// Uses the installed Google Chrome through playwright-core, so no browser download is needed.
import { chromium } from 'playwright-core';
import { mkdir, writeFile } from 'node:fs/promises';

const positional = process.argv.slice(2).filter((arg) => !arg.startsWith('--'));
const mobile = process.argv.includes('--mobile');
const label = positional[0] ?? 'run';
const url = positional[1] ?? 'http://localhost:4322/';
const DEVICE = mobile
  ? { viewport: { width: 390, height: 844 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true }
  : { viewport: { width: 1440, height: 900 } };
const RUNS = 3;
const CPU_SLOWDOWN = 4;
// Chrome DevTools' "Fast 4G" preset
const NETWORK = { offline: false, latency: 150, downloadThroughput: (9 * 1024 * 1024) / 8, uploadThroughput: (1.5 * 1024 * 1024) / 8 };

// Collected inside the page from the first byte on
const OBSERVERS = () => {
  const store = (window.__perf = { lcp: 0, longTasks: [], cls: 0 });
  new PerformanceObserver((list) => list.getEntries().forEach((entry) => (store.lcp = entry.startTime))).observe({ type: 'largest-contentful-paint', buffered: true });
  new PerformanceObserver((list) => list.getEntries().forEach((entry) => store.longTasks.push([entry.startTime, entry.duration]))).observe({ type: 'longtask', buffered: true });
  new PerformanceObserver((list) => list.getEntries().forEach((entry) => !entry.hadRecentInput && (store.cls += entry.value))).observe({ type: 'layout-shift', buffered: true });
  // The intro is a deliberate 2.6s show; it is measured apart from the page itself
  try { sessionStorage.setItem('portfolio-intro-seen', '1'); } catch {}
};

const median = (values) => [...values].sort((a, b) => a - b)[Math.floor(values.length / 2)];
const percentile = (values, p) => [...values].sort((a, b) => a - b)[Math.min(values.length - 1, Math.floor(values.length * p))];

async function throttled(context, page) {
  const cdp = await context.newCDPSession(page);
  await cdp.send('Network.enable');
  await cdp.send('Network.setCacheDisabled', { cacheDisabled: true });
  await cdp.send('Network.emulateNetworkConditions', NETWORK);
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: CPU_SLOWDOWN });
  return cdp;
}

async function coldLoad(browser) {
  const context = await browser.newContext(DEVICE);
  const page = await context.newPage();
  await page.addInitScript(OBSERVERS);
  const cdp = await throttled(context, page);
  const bytes = { script: 0, image: 0, font: 0, stylesheet: 0, document: 0, other: 0 };
  const types = new Map();
  cdp.on('Network.responseReceived', ({ requestId, type }) => types.set(requestId, type.toLowerCase()));
  cdp.on('Network.loadingFinished', ({ requestId, encodedDataLength }) => {
    const type = types.get(requestId);
    bytes[type in bytes ? type : 'other'] += encodedDataLength;
  });
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('console', (message) => message.type() === 'error' && errors.push(message.text()));

  await page.goto(url, { waitUntil: 'load', timeout: 60_000 });
  await page.waitForTimeout(6000);
  const result = await page.evaluate(() => {
    const { lcp, longTasks, cls } = window.__perf;
    const before = (limit) => longTasks.filter(([start]) => start < limit);
    return {
      lcp,
      cls,
      tbt: longTasks.reduce((sum, [, duration]) => sum + Math.max(0, duration - 50), 0),
      longestTask: Math.max(0, ...longTasks.map(([, duration]) => duration)),
      longTasksBeforeLcp: before(lcp).length,
    };
  });
  await context.close();
  return { ...result, bytes, errors };
}

async function walk(browser) {
  const context = await browser.newContext(DEVICE);
  const page = await context.newPage();
  await page.addInitScript(OBSERVERS);
  await page.goto(url, { waitUntil: 'load' });
  await page.waitForTimeout(2500);
  const cdp = await context.newCDPSession(page);
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: CPU_SLOWDOWN });
  const frames = await page.evaluate(async () => {
    const times = [];
    let last = performance.now();
    let running = true;
    const loop = (now) => { times.push(now - last); last = now; if (running) requestAnimationFrame(loop); };
    requestAnimationFrame(loop);
    const max = document.documentElement.scrollHeight - innerHeight;
    const start = performance.now();
    await new Promise((done) => {
      const step = () => {
        const progress = Math.min(1, (performance.now() - start) / 6000);
        scrollTo(0, max * progress);
        progress < 1 ? setTimeout(step, 16) : done();
      };
      step();
    });
    running = false;
    return times.slice(2);
  });
  await context.close();
  return { frames: frames.length, p50: percentile(frames, 0.5), p95: percentile(frames, 0.95), over33: frames.filter((t) => t > 33.4).length };
}

const browser = await chromium.launch({ channel: 'chrome', headless: true });
const loads = [];
for (let i = 0; i < RUNS; i++) loads.push(await coldLoad(browser));
const scroll = await walk(browser);
await browser.close();

const kb = (value) => Math.round(value / 1024);
const report = {
  label,
  url,
  date: new Date().toISOString(),
  conditions: `CPU ${CPU_SLOWDOWN}x, Fast 4G, ${DEVICE.viewport.width}x${DEVICE.viewport.height}${mobile ? ' @3x touch' : ''}, median of ${RUNS}`,
  lcpMs: Math.round(median(loads.map((l) => l.lcp))),
  tbtMs: Math.round(median(loads.map((l) => l.tbt))),
  longestTaskMs: Math.round(median(loads.map((l) => l.longestTask))),
  longTasksBeforeLcp: median(loads.map((l) => l.longTasksBeforeLcp)),
  cls: Number(median(loads.map((l) => l.cls)).toFixed(3)),
  transferKb: Object.fromEntries(Object.entries(loads[0].bytes).map(([type, value]) => [type, kb(value)])),
  walk: { frames: scroll.frames, p50Ms: Number(scroll.p50.toFixed(1)), p95Ms: Number(scroll.p95.toFixed(1)), framesOver33ms: scroll.over33 },
  errors: [...new Set(loads.flatMap((l) => l.errors))],
};

await mkdir('docs/perf', { recursive: true });
await writeFile(`docs/perf/${label}.json`, `${JSON.stringify(report, null, 2)}\n`);
console.log(JSON.stringify(report, null, 2));
