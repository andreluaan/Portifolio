import { renderScene } from './brush';
import { attributeBar } from './scenes';

export { portraits } from './portraits';

/** Draws the dry-brush bars into the attribute rows the page already rendered; `animate` redraws them stroke by stroke. */
export function attributeBars(list: ParentNode) {
  const bars = [...list.querySelectorAll<HTMLLIElement>('li[data-value]')].map((item, index) => {
    const svg = item.querySelector('svg')!;
    const strokes = attributeBar(Number(item.dataset.value), 400 + index * 3);
    renderScene(svg, strokes);
    return { svg, strokes };
  });
  const animate = (delay = 0) => bars.forEach((bar, index) => renderScene(bar.svg, bar.strokes, { animate: true, delay: delay + index * 0.12 }));
  return { animate };
}
