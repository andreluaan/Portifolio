import { attributes } from '../data/content';
import { renderScene } from './brush';
import { pick, t } from './i18n';
import { attributeBar } from './scenes';

export const portraits = {
  profile: { href: '/images/andre-perfil.webp', width: 900, height: 1600 },
  front: { href: '/images/andre-frente.webp', width: 1254, height: 1254 },
};

export function characterIdentity() {
  const block = document.createElement('div');
  block.className = 'character-identity';
  block.innerHTML = `
    <img class="character-face" src="${portraits.front.href}" alt="" width="600" height="600" loading="lazy">
    <div class="character-tag"><span class="label"></span><span class="hand"></span></div>
    <div><h3>André Luan</h3><p class="hand character-class"></p></div>
    <p class="character-bio"></p>`;
  block.querySelector('img')!.alt = pick({ pt: 'Retrato de André em nanquim, de frente', en: 'Ink portrait of André, facing forward' });
  block.querySelector('.character-tag .label')!.textContent = t('about.player');
  block.querySelector('.character-tag .hand')!.textContent = t('about.level');
  block.querySelector('.character-class')!.textContent = t('about.class');
  block.querySelector('.character-bio')!.textContent = t('about.bio');
  return block;
}

/** Attribute rows drawn as dry-brush bars; `animate` redraws them stroke by stroke. */
export function attributeList() {
  const list = document.createElement('ul');
  list.className = 'character-attributes';
  const bars = attributes.map((attribute, index) => {
    const item = document.createElement('li');
    item.innerHTML = `<span class="hand"></span><svg class="ink" viewBox="0 0 300 16" preserveAspectRatio="none" aria-hidden="true"></svg>`;
    item.querySelector('span')!.textContent = pick(attribute.label);
    const svg = item.querySelector('svg')!;
    const strokes = attributeBar(attribute.value, 400 + index * 3);
    renderScene(svg, strokes);
    list.append(item);
    return { svg, strokes };
  });
  const animate = (delay = 0) => bars.forEach((bar, index) => renderScene(bar.svg, bar.strokes, { animate: true, delay: delay + index * 0.12 }));
  return { list, animate };
}
