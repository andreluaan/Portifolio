export { portraits } from './portraits';

/** Brushes the attribute bars on again, one after another (the bars are baked images, see scripts/ink-bake). */
export function attributeBars(list: ParentNode) {
  const bars = [...list.querySelectorAll<HTMLElement>('.attribute-bar')];
  const animate = (delay = 0) =>
    bars.forEach((bar, index) => {
      bar.style.animationDelay = `${delay + index * 0.12}s`;
      brushOn(bar);
    });
  return { animate };
}

/** Restarts the brushed-on reveal of a baked drawing (`.is-brushing` in global.css). */
export function brushOn(element: Element) {
  element.classList.remove('is-brushing');
  void (element as HTMLElement).offsetWidth;
  element.classList.add('is-brushing');
}
