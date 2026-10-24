import gsap from 'gsap';
import { interests, inventory, journey, skillGroups } from '../data/content';
import { ellipsePoints, frameAll, prefersReducedMotion, renderScene, roughRect, stroke, svgElement } from './brush';
import { pick, t } from './i18n';
import { foundSecrets, secrets } from './secrets';
import { attributeList, portraits } from './sections';
import { sounds } from './sound';

function section(titleKey: Parameters<typeof t>[0], className: string) {
  const element = document.createElement('section');
  element.className = `cs-section ${className}`;
  element.innerHTML = `<h3 class="cs-title"><span></span><svg class="ink" viewBox="0 0 190 16" preserveAspectRatio="none" aria-hidden="true"></svg></h3>`;
  element.querySelector('span')!.textContent = t(titleKey);
  renderScene(element.querySelector('svg')!, [stroke([[2, 9], [90, 6], [186, 10]], 4, { seed: titleKey.length * 7, dry: true, tone: 'mist', start: 0.04, end: 0.3 })]);
  return element;
}

function skillDots(level: number, seed: number) {
  const svg = svgElement('svg', { class: 'ink cs-dots', viewBox: '0 0 100 18', role: 'img', 'aria-label': `${level}/5` });
  const strokes = Array.from({ length: 5 }, (_, index) =>
    stroke(ellipsePoints(10 + index * 20, 9, 4.2, 4.2, { seed: seed + index, count: 8 }), index < level ? 8.5 : 1.4, {
      seed: seed + index,
      tone: index < level ? 'ink' : 'wash',
      start: 0.02,
      end: 0.05,
    })
  );
  renderScene(svg, strokes);
  return { svg, strokes };
}

export function openCharacterSheet() {
  const dialog = document.getElementById('sheet-dialog') as HTMLDialogElement;
  const body = dialog.querySelector<HTMLElement>('.sheet-body')!;
  const reduced = prefersReducedMotion();
  dialog.classList.add('is-character');
  body.replaceChildren();

  const sheet = document.createElement('div');
  sheet.className = 'cs';

  // Header: portrait + identity + contact
  const head = document.createElement('header');
  head.className = 'cs-head';
  head.innerHTML = `
    <div class="cs-portrait"><img src="${portraits.front.href}" alt="" width="600" height="600"><svg class="ink cs-portrait-frame" viewBox="0 0 200 200" preserveAspectRatio="none" aria-hidden="true"></svg></div>
    <div class="cs-identity">
      <div class="cs-tags"><span class="label"></span><span class="hand cs-level"></span></div>
      <h2>André Luan</h2>
      <p class="hand cs-class"></p>
      <p class="cs-bio"></p>
      <div class="cs-contact">
        <a class="ink-button solid small" data-frame href="mailto:andre.luanbq@gmail.com"><span></span></a>
        <a class="brush-link" href="https://github.com/andreluaan" target="_blank" rel="noopener">github ↗</a>
      </div>
    </div>`;
  head.querySelector('img')!.alt = pick({ pt: 'Retrato de André em nanquim, de frente', en: 'Ink portrait of André, facing forward' });
  head.querySelector('.cs-tags .label')!.textContent = t('about.player');
  head.querySelector('.cs-level')!.textContent = t('about.level');
  head.querySelector('.cs-class')!.textContent = t('about.class');
  head.querySelector('.cs-bio')!.textContent = t('about.bio');
  head.querySelector('.cs-contact a span')!.textContent = t('about.contact');
  renderScene(head.querySelector('.cs-portrait-frame')!, roughRect(3, 3, 194, 194, 1.6, 2001));

  // Attributes
  const attributesSection = section('about.attributes', 'cs-attributes');
  const attributeBars = attributeList();
  attributesSection.append(attributeBars.list);

  // Skill tree
  const skillsSection = section('about.skills', 'cs-skills');
  const allDots: ReturnType<typeof skillDots>[] = [];
  skillGroups.forEach((group, groupIndex) => {
    const block = document.createElement('div');
    block.className = 'cs-skill-group';
    block.innerHTML = `<p class="label"></p><ul></ul>`;
    block.querySelector('.label')!.textContent = pick(group.title);
    group.skills.forEach((skill, skillIndex) => {
      const item = document.createElement('li');
      const name = document.createElement('span');
      name.textContent = skill.name;
      const dots = skillDots(skill.level, 2100 + groupIndex * 50 + skillIndex * 7);
      allDots.push(dots);
      item.append(name, dots.svg);
      block.querySelector('ul')!.append(item);
    });
    skillsSection.append(block);
  });

  // Quest log
  const journeySection = section('about.journey', 'cs-journey');
  const timeline = document.createElement('ol');
  timeline.className = 'cs-quests';
  journey.forEach((quest) => {
    const item = document.createElement('li');
    item.className = `cs-quest is-${quest.status}`;
    item.innerHTML = `<span class="cs-quest-node" aria-hidden="true"></span><div><p class="cs-quest-title"></p><p class="cs-quest-detail"></p></div><span class="hand cs-quest-status"></span>`;
    item.querySelector('.cs-quest-title')!.textContent = pick(quest.title);
    item.querySelector('.cs-quest-detail')!.textContent = pick(quest.detail);
    item.querySelector('.cs-quest-status')!.textContent = t(`quest.${quest.status}`);
    timeline.append(item);
  });
  const journeyLine = svgElement('svg', { class: 'ink cs-quest-line', viewBox: '0 0 10 400', preserveAspectRatio: 'none', 'aria-hidden': 'true' });
  journeySection.append(journeyLine, timeline);

  // Interests, inventory, special move
  const bagSection = section('about.inventory', 'cs-bag');
  bagSection.innerHTML += `
    <ul class="cs-inventory"></ul>
    <p class="label cs-subtitle"></p>
    <ul class="tags cs-interests"></ul>
    <p class="label cs-subtitle"></p>
    <p class="cs-move"></p>`;
  renderScene(bagSection.querySelector('.cs-title svg')!, [stroke([[2, 9], [90, 6], [186, 10]], 4, { seed: 77, dry: true, tone: 'mist', start: 0.04, end: 0.3 })]);
  bagSection.querySelector('.cs-inventory')!.append(
    ...inventory.map((entry) => {
      const item = document.createElement('li');
      item.innerHTML = `<span></span><span class="hand"></span>`;
      item.firstElementChild!.textContent = pick(entry.label);
      item.lastElementChild!.textContent = pick(entry.value);
      return item;
    })
  );
  const subtitles = bagSection.querySelectorAll('.cs-subtitle');
  subtitles[0].textContent = t('about.interests');
  subtitles[1].textContent = t('about.special');
  bagSection.querySelector('.cs-interests')!.append(...pick(interests).map((interest) => Object.assign(document.createElement('li'), { textContent: interest })));
  bagSection.querySelector('.cs-move')!.textContent = t('about.move');

  // Achievements = the visitor's own secrets
  const achievementsSection = section('about.achievements', 'cs-achievements');
  const stamps = document.createElement('ul');
  stamps.className = 'cs-stamps';
  const found = foundSecrets();
  secrets.forEach((secret) => {
    const item = document.createElement('li');
    const isFound = found.has(secret.id);
    item.className = isFound ? 'is-found' : '';
    item.textContent = isFound ? secret.glyph : '?';
    item.title = isFound ? pick(secret.name) : t('secrets.locked');
    stamps.append(item);
  });
  achievementsSection.append(stamps);

  const grid = document.createElement('div');
  grid.className = 'cs-grid';
  grid.append(attributesSection, skillsSection, journeySection, bagSection, achievementsSection);
  sheet.append(head, grid);
  body.append(sheet);
  dialog.showModal();
  sounds.paper();

  requestAnimationFrame(() => {
    const height = timeline.getBoundingClientRect().height || 400;
    journeyLine.setAttribute('viewBox', `0 0 10 ${height}`);
    journeyLine.style.height = `${height}px`;
    renderScene(journeyLine, [stroke([[5, 4], [6, height / 2], [5, height - 4]], 2.4, { seed: 2300, dry: true, start: 0.01, end: 0.05 })], { animate: true, delay: 0.4, pace: 0.5 });
    frameAll(head);
    window.setTimeout(() => frameAll(head), 400);
  });

  attributeBars.animate(0.3);
  allDots.forEach((dots, index) => renderScene(dots.svg, dots.strokes, { animate: true, delay: 0.4 + index * 0.05, pace: 3 }));
  if (!reduced) {
    gsap.fromTo(head.querySelector('.cs-portrait img'), { clipPath: 'inset(0 0 100% 0)' }, { clipPath: 'inset(0 0 0% 0)', duration: 1.2, ease: 'power3.out' });
    gsap.fromTo(grid.querySelectorAll('.cs-section'), { autoAlpha: 0, y: 24 }, { autoAlpha: 1, y: 0, stagger: 0.1, duration: 0.6, delay: 0.15, ease: 'power2.out', clearProps: 'all' });
    gsap.fromTo(timeline.children, { autoAlpha: 0, x: -12 }, { autoAlpha: 1, x: 0, stagger: 0.12, duration: 0.5, delay: 0.6, clearProps: 'all' });
    gsap.fromTo(stamps.querySelectorAll('.is-found'), { scale: 2.4, rotation: -20, autoAlpha: 0 }, { scale: 1, rotation: -5, autoAlpha: 1, stagger: 0.12, duration: 0.45, delay: 0.9, ease: 'back.out(2.5)' });
  }
  dialog.addEventListener('close', () => dialog.classList.remove('is-character'), { once: true });
}

