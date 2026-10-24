import { strings, type Lang, type Localized, type StringKey } from '../data/content';

const STORAGE_KEY = 'portfolio-lang';
const listeners = new Set<(lang: Lang) => void>();

function readStoredLang(): Lang {
  try {
    return localStorage.getItem(STORAGE_KEY) === 'en' ? 'en' : 'pt';
  } catch {
    return 'pt';
  }
}

let current: Lang = readStoredLang();

export const getLang = () => current;
export const t = (key: StringKey) => strings[key][current];
export const pick = <T>(value: Localized<T>) => value[current];

export function applyStrings(root: ParentNode = document) {
  root.querySelectorAll<HTMLElement>('[data-i18n]').forEach((node) => {
    const key = node.dataset.i18n as StringKey;
    if (strings[key]) node.textContent = strings[key][current];
  });
  root.querySelectorAll<HTMLElement>('[data-i18n-label]').forEach((node) => {
    const key = node.dataset.i18nLabel as StringKey;
    if (strings[key]) node.setAttribute('aria-label', strings[key][current]);
  });
}

export function setLang(lang: Lang) {
  if (lang === current) return;
  current = lang;
  document.documentElement.lang = lang === 'pt' ? 'pt-BR' : 'en';
  try {
    localStorage.setItem(STORAGE_KEY, lang);
  } catch {}
  applyStrings();
  listeners.forEach((listener) => listener(lang));
}

export function onLangChange(listener: (lang: Lang) => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function initLang() {
  document.documentElement.lang = current === 'pt' ? 'pt-BR' : 'en';
  if (current !== 'pt') applyStrings();
}
