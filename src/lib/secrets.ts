import type { Localized } from '../data/content';
import { pick, t } from './i18n';
import { sounds } from './sound';

export interface Secret {
  id: string;
  name: Localized;
  hint: Localized;
  glyph: string;
}

export const secrets: Secret[] = [
  { id: 'skip', glyph: '急', name: { pt: 'impaciente', en: 'impatient' }, hint: { pt: 'pulou a intro com Esc', en: 'skipped the intro with Esc' } },
  { id: 'tickle', glyph: '笑', name: { pt: 'cócegas', en: 'tickles' }, hint: { pt: 'cutucou o Borrão', en: 'poked Smudge' } },
  { id: 'splat', glyph: '落', name: { pt: 'queda livre', en: 'free fall' }, hint: { pt: 'derrubou o Borrão lá de cima', en: 'dropped Smudge from up high' } },
  { id: 'reader', glyph: '読', name: { pt: 'leitor', en: 'reader' }, hint: { pt: 'leu o caderno da estante até o fim', en: 'read the bookstand sketchbook to the end' } },
  { id: 'spill', glyph: '墨', name: { pt: 'tinta derramada', en: 'spilled ink' }, hint: { pt: 'derrubou o tinteiro da mesinha escondida', en: 'knocked over the hidden ink bottle' } },
  { id: 'painter', glyph: '画', name: { pt: 'pintor', en: 'painter' }, hint: { pt: 'pintou o céu do mundo de papel', en: 'painted the paper world’s sky' } },
  { id: 'walker', glyph: '道', name: { pt: 'andarilho', en: 'wanderer' }, hint: { pt: 'chegou ao fim do mundo de papel', en: 'reached the end of the paper world' } },
  { id: 'magic', glyph: '術', name: { pt: 'palavra mágica', en: 'magic word' }, hint: { pt: 'escreveu “nanquim” no caderno de recados', en: 'typed “nanquim” in the guestbook' } },
  { id: 'mail', glyph: '信', name: { pt: 'carteiro', en: 'mail carrier' }, hint: { pt: 'deixou um recado no correio', en: 'left a note in the mailbox' } },
  { id: 'konami', glyph: '古', name: { pt: 'código antigo', en: 'ancient code' }, hint: { pt: '↑ ↑ ↓ ↓ ← → ← → b a', en: '↑ ↑ ↓ ↓ ← → ← → b a' } },
  { id: 'owl', glyph: '夜', name: { pt: 'coruja', en: 'night owl' }, hint: { pt: 'visitou entre meia-noite e 5h', en: 'visited between midnight and 5am' } },
];

const STORAGE_KEY = 'portfolio-secrets';
const listeners = new Set<(found: Set<string>) => void>();

function readFound() {
  try {
    return new Set<string>(JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]'));
  } catch {
    return new Set<string>();
  }
}

const found = readFound();

export const foundSecrets = () => found;
export const onSecretsChange = (listener: (found: Set<string>) => void) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};

let toastTimer: number | undefined;

function showToast(secret: Secret) {
  document.querySelector('.secret-toast')?.remove();
  const toast = document.createElement('div');
  toast.className = 'secret-toast';
  toast.setAttribute('role', 'status');
  toast.innerHTML = `<span class="secret-toast-seal" aria-hidden="true"></span><span class="secret-toast-text"><span></span><strong></strong></span>`;
  toast.querySelector('.secret-toast-seal')!.textContent = secret.glyph;
  toast.querySelector('.secret-toast-text span')!.textContent = `${t('secrets.found')} · ${found.size}/${secrets.length}`;
  toast.querySelector('strong')!.textContent = pick(secret.name);
  document.body.append(toast);
  window.clearTimeout(toastTimer);
  toastTimer = window.setTimeout(() => toast.classList.add('is-leaving'), 3200);
  toast.addEventListener('animationend', (event) => {
    if (event.animationName === 'toast-out') toast.remove();
  });
}

export function unlock(id: string) {
  if (found.has(id)) return;
  const secret = secrets.find((item) => item.id === id);
  if (!secret) return;
  found.add(id);
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify([...found]));
  } catch {}
  sounds.stamp();
  showToast(secret);
  listeners.forEach((listener) => listener(found));
}

export function watchGlobalSecrets() {
  const hour = new Date().getHours();
  if (hour < 5) window.setTimeout(() => unlock('owl'), 4000);

  const sequence = ['ArrowUp', 'ArrowUp', 'ArrowDown', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'ArrowLeft', 'ArrowRight', 'b', 'a'];
  let position = 0;
  window.addEventListener('keydown', (event) => {
    const key = event.key.length === 1 ? event.key.toLowerCase() : event.key;
    position = key === sequence[position] ? position + 1 : key === sequence[0] ? 1 : 0;
    if (position === sequence.length) {
      position = 0;
      unlock('konami');
      document.documentElement.classList.add('konami-ink');
      window.setTimeout(() => document.documentElement.classList.remove('konami-ink'), 2600);
    }
  });

  console.log(
    '%c  ~ nanquim ~  %c\nOlá, dev curioso. Este site foi desenhado traço a traço.\nDica: o Borrão não gosta de altura.',
    'background:#151515;color:#eeeeec;font:600 14px serif;padding:6px 10px',
    'color:#3b3c3a;font:13px sans-serif'
  );
}
