// Screenshot of the built site for visual checks: `node scripts/shot.mjs <out.jpg> [width] [height] [--no-js] [--full] [--path=en/]`.
import { chromium } from 'playwright-core';

const args = process.argv.slice(2);
const flags = new Set(args.filter((arg) => arg.startsWith('--')));
const [out, width = '1280', height = '900'] = args.filter((arg) => !arg.startsWith('--'));
// A bare path (en/) avoids Git Bash rewriting a leading slash into a Windows path
const path = `/${([...flags].find((flag) => flag.startsWith('--path='))?.slice(7) ?? '').replace(/^\/+/, '')}`;

const browser = await chromium.launch({ channel: 'chrome' });
const page = await browser.newPage({ javaScriptEnabled: !flags.has('--no-js'), viewport: { width: Number(width), height: Number(height) } });
await page.goto(`http://localhost:4322${path}`, { waitUntil: 'networkidle' });
await page.waitForTimeout(flags.has('--no-js') ? 0 : 2500);
await page.screenshot({ path: out, fullPage: flags.has('--full'), type: 'jpeg', quality: 55 });
console.log(`saved ${out} (page height ${await page.evaluate(() => document.documentElement.scrollHeight)}px)`);
await browser.close();
