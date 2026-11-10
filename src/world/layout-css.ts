// Each map's placement of the stations as CSS, written into the page at build time. Base.astro picks the map and the
// zoom before the first paint (html[data-layout] and --zoom), so the cards are already where they belong when the
// page appears: no jump when the script arrives.
import type { WorldLayout } from './layout';

const px = (value: number) => `${Math.round(value * 100) / 100}px`;

function boxRule(selector: string, box: { x: number; y: number; width: number; height?: number }, extra = '') {
  const height = box.height ? `height:${px(box.height)};` : '';
  return `${selector}{left:${px(box.x)};top:${px(box.y)};width:${px(box.width)};${height}${extra}}`;
}

export function layoutCss(layout: WorldLayout) {
  const at = `:root[data-layout='${layout.name}']`;
  const { boxes } = layout;
  const rules = [
    boxRule(`${at} .station-hero-sheet`, boxes.heroSheet),
    boxRule(`${at} .station-hero-text`, boxes.heroText),
    ...Object.entries(boxes.signs).map(([name, box]) => boxRule(`${at} [data-sign='${name}']`, box, `scale:${layout.signScale.toFixed(4)};`)),
    boxRule(`${at} .station-line`, boxes.line, `--paper-width:${px(layout.paperWidth)};--paper-gap:${px(layout.paperGap)};`),
    boxRule(`${at} .station-house`, boxes.house),
    `${at} .station-board{width:${px(boxes.board.width)};height:${px(boxes.board.height!)}}`,
    boxRule(`${at} .station-lectern`, boxes.lectern),
    boxRule(`${at} .station-repos`, boxes.repos, `--repo-columns:${layout.reposColumns};`),
    boxRule(`${at} .station-mail`, boxes.mail, `--note-width:${px(layout.noteWidth)};`),
    boxRule(`${at} .station-end`, boxes.end),
    boxRule(`${at} .station-desk`, boxes.desk),
  ];
  return rules.join('\n');
}

/** What the head script needs to pick a map and a zoom for a window, before anything else loads. */
export const layoutSizes = (layouts: WorldLayout[]) =>
  Object.fromEntries(layouts.map(({ name, width, height, frontWidth }) => [name, { width, height, frontWidth }]));
