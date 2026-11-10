import { strings, type Lang, type Localized, type StringKey } from '../data/content';

/** Each language is its own prebuilt page (/ and /en/), so the language is read once from the document. */
const current: Lang = typeof document !== 'undefined' && document.documentElement.lang.startsWith('en') ? 'en' : 'pt';

export const getLang = () => current;
export const t = (key: StringKey) => strings[key][current];
export const pick = <T>(value: Localized<T>) => value[current];

/** The same helpers for a page rendered at build time, where the language comes from the route. */
export function translator(lang: Lang) {
  return {
    lang,
    t: (key: StringKey) => strings[key][lang],
    pick: <T>(value: Localized<T>) => value[lang],
    locale: lang === 'pt' ? 'pt-BR' : 'en-US',
  };
}

/** Where the same page lives in the other language. */
export const pathFor = (lang: Lang) => (lang === 'pt' ? '/' : '/en/');
