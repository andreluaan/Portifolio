// The andreluaan.dev memory mark: a sumi circle cut by the shu wire, its right half slid down like the L of the
// symbol. Built from the brand manual's construction (page 20), in units of D = the circle's outer diameter = 100:
// stroke 0.08 D, cut 0.07 D, right half offset 0.05 D, the wire running 0.18 D past the circle at both ends.
// One source for the intro loader, the world's sign-off, the book's last page and the favicon (scripts/brand).

const D = 100;
const STROKE = 0.08 * D;
const CUT = 0.07 * D;
export const MEMORY_OFFSET = 0.05 * D;
const OVERRUN = 0.18 * D;

const center = D / 2;
const radius = (D - STROKE) / 2;
const edge = CUT / 2;
// Where the cut meets the stroke's centreline
const reach = Math.sqrt(radius * radius - edge * edge);
const fixed = (value: number) => Number(value.toFixed(2));

export const memoryMark = {
  /** Fits the mark, its overrun and the slid half, with a little room for the round dot of the loader. */
  viewBox: `${-STROKE} ${-OVERRUN - 2} ${D + STROKE * 2} ${D + OVERRUN * 2 + MEMORY_OFFSET + 4}`,
  stroke: STROKE,
  /** Each half as an open arc, so it can be drawn on with stroke-dashoffset. */
  left: `M${fixed(center - edge)} ${fixed(center - reach)} A${radius} ${radius} 0 0 0 ${fixed(center - edge)} ${fixed(center + reach)}`,
  right: `M${fixed(center + edge)} ${fixed(center - reach)} A${radius} ${radius} 0 0 1 ${fixed(center + edge)} ${fixed(center + reach)}`,
  /** A half's length, for the dash animation. */
  halfLength: fixed(radius * (Math.PI - 2 * Math.asin(edge / radius))),
  /** The wire is a blade: hair-thin at both tips, widest where it crosses the circle. */
  wire: wirePath(1.3),
};

/** `half` is the blade's half-width at the centre; icons use a heavier one so the cut survives at 16 px. */
function wirePath(half: number) {
  return `M${center} ${-OVERRUN} L${center + half} ${center} L${center} ${D + OVERRUN} L${center - half} ${center} Z`;
}

export const BRAND = {
  paper: '#F3F0E8',
  sumi: '#151515',
  shu: '#B5392C',
  /** The dark-surface versions (manual p. 04): ink turns to paper tone and the shu lifts a little. */
  inkOnDark: '#ECE8DF',
  shuOnDark: '#C8503E',
} as const;

/** The mark inside the page, coloured and animated by brand.css (.memory-mark); `--half` is a half's length. */
export function memoryMarkMarkup(className = '') {
  return (
    `<svg class="memory-mark ${className}" viewBox="${memoryMark.viewBox}" aria-hidden="true" focusable="false" style="--half:${memoryMark.halfLength}">` +
    `<path class="memory-half" d="${memoryMark.left}"/>` +
    `<g class="memory-slide"><path class="memory-half" d="${memoryMark.right}"/></g>` +
    `<path class="memory-wire" d="${memoryMark.wire}"/></svg>`
  );
}

/** The mark as a standalone SVG document (favicons, images). */
export function memoryMarkSvg({ ink = BRAND.sumi, shu = BRAND.shu, darkInk = '', darkShu = '', wire = 1.3 } = {}) {
  const dark = darkInk
    ? `<style>@media (prefers-color-scheme: dark){.i{stroke:${darkInk}}.s{fill:${darkShu || shu}}}</style>`
    : '';
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${memoryMark.viewBox}">${dark}` +
    `<g fill="none" stroke-width="${STROKE}"><path class="i" stroke="${ink}" d="${memoryMark.left}"/>` +
    `<path class="i" stroke="${ink}" d="${memoryMark.right}" transform="translate(0 ${MEMORY_OFFSET})"/></g>` +
    `<path class="s" fill="${shu}" d="${wirePath(wire)}"/></svg>`
  );
}
