import { projects } from '../data/content';
import { frameAll, prefersReducedMotion, renderScene, stroke, svgElement, type Point } from './brush';
import { getLang, pick, t } from './i18n';
import { foundSecrets, secrets, unlock } from './secrets';
import { sounds } from './sound';

const EMAIL = 'andre.luanbq@gmail.com';

const replies = {
  welcome: { pt: ['oi. este é o caderno de recados do André.', 'escreva um comando e aperte enter,', 'ou use os botões aqui embaixo.'], en: ['hi. this is André’s guestbook.', 'type a command and press enter,', 'or use the buttons below.'] },
  help: { pt: ['comandos: sobre, projetos, contato, github,', 'desenhar, segredos, recado <texto>, limpar.'], en: ['commands: about, projects, contact, github,', 'draw, secrets, note <text>, clear.'] },
  about: { pt: ['dev front-end e designer na Paraíba.', 'desenha nas horas vagas, e nas ocupadas também.'], en: ['front-end dev and designer in Paraíba, Brazil.', 'draws in his spare time, and his busy time too.'] },
  contact: { pt: [`${EMAIL} · github.com/andreluaan`], en: [`${EMAIL} · github.com/andreluaan`] },
  github: { pt: ['abrindo github.com/andreluaan…'], en: ['opening github.com/andreluaan…'] },
  noteEmpty: { pt: ['escreva depois do comando: recado olá, André!'], en: ['write after the command: note hi, André!'] },
  noteSent: { pt: ['recado dobrado e posto no correio.', 'seu e-mail vai abrir com ele pronto para enviar.'], en: ['note folded and dropped in the mailbox.', 'your e-mail app will open with it ready to send.'] },
  magic: { pt: ['a tinta reconheceu a palavra.'], en: ['the ink recognized the word.'] },
  ls: { pt: ['projetos/  rascunhos/  .borrao/  segredos.txt'], en: ['projects/  drafts/  .smudge/  secrets.txt'] },
  cat: { pt: ['boa tentativa.'], en: ['nice try.'] },
  rm: { pt: ['você não pode apagar nanquim.'], en: ['you can’t erase ink.'] },
  unknown: { pt: ['não conheço "{c}". tente "ajuda".'], en: ['I don’t know "{c}". try "help".'] },
};

const aliases: Record<string, string> = {
  ajuda: 'help', help: 'help',
  sobre: 'about', about: 'about', whoami: 'about',
  projetos: 'projects', projects: 'projects',
  contato: 'contact', contact: 'contact',
  github: 'github',
  desenhar: 'draw', draw: 'draw',
  segredos: 'secrets', secrets: 'secrets',
  recado: 'note', note: 'note',
  limpar: 'clear', clear: 'clear',
  nanquim: 'magic', ink: 'magic',
  ls: 'ls', cat: 'cat', rm: 'rm',
};

export function openNotebook(onNoteSent?: () => void) {
  const dialog = document.getElementById('sheet-dialog') as HTMLDialogElement;
  const body = dialog.querySelector<HTMLElement>('.sheet-body')!;
  dialog.classList.add('is-notebook');
  body.replaceChildren();

  const notebook = document.createElement('div');
  notebook.className = 'notebook';
  notebook.innerHTML = `
    <div class="notebook-head"><svg class="ink" viewBox="0 0 40 12" aria-hidden="true"></svg><span></span></div>
    <div class="notebook-log" aria-live="polite"></div>
    <form class="notebook-form" autocomplete="off">
      <label for="notebook-input"></label>
      <input id="notebook-input" name="command" type="text" spellcheck="false">
    </form>
    <div class="notebook-actions">
      <button class="ink-button small" type="button" data-command="note" data-frame><span></span></button>
      <button class="ink-button small" type="button" data-command="draw" data-frame><span></span></button>
      <button class="ink-button small" type="button" data-command="help" data-frame><span></span></button>
    </div>`;
  notebook.querySelector('.notebook-head span')!.textContent = t('notebook.title');
  notebook.querySelector('label')!.textContent = t('notebook.prompt');
  const buttons = notebook.querySelectorAll('.notebook-actions span');
  buttons[0].textContent = t('notebook.note');
  buttons[1].textContent = t('notebook.draw');
  buttons[2].textContent = t('notebook.help');
  renderScene(notebook.querySelector('.notebook-head svg')!, [
    stroke([[3, 6], [9, 6]], 6, { seed: 1, start: 0.3, end: 0.3 }),
    stroke([[17, 6], [23, 6]], 6, { seed: 2, start: 0.3, end: 0.3, tone: 'wash' }),
    stroke([[31, 6], [37, 6]], 6, { seed: 3, start: 0.3, end: 0.3, tone: 'mist' }),
  ]);
  body.append(notebook);

  const log = notebook.querySelector<HTMLElement>('.notebook-log')!;
  const input = notebook.querySelector<HTMLInputElement>('input')!;
  const write = (lines: string[], className?: string) => {
    lines.forEach((line) => {
      const row = document.createElement('div');
      row.textContent = line;
      if (className) row.className = className;
      log.append(row);
    });
    log.scrollTop = log.scrollHeight;
  };
  const doodle = () => {
    const row = document.createElement('div');
    const svg = svgElement('svg', { class: 'ink', viewBox: '0 0 200 34', 'aria-hidden': 'true' });
    row.append(svg);
    log.append(row);
    const points = Array.from({ length: 4 + Math.floor(Math.random() * 3) }, (_, i) => [8 + i * 34, 6 + Math.random() * 22] as Point);
    renderScene(svg, [stroke(points, 3 + Math.random() * 6, { seed: Math.floor(Math.random() * 999), dry: Math.random() > 0.5 })], { animate: !prefersReducedMotion() });
    log.scrollTop = log.scrollHeight;
    sounds.brush();
  };

  const run = (raw: string) => {
    const text = raw.trim();
    if (!text) return;
    write([`${t('notebook.prompt')} ${text}`], 'is-you');
    const [word, ...rest] = text.split(/\s+/);
    const command = aliases[word.toLowerCase()];
    const message = rest.join(' ');
    switch (command) {
      case 'help':
      case 'about':
      case 'contact':
      case 'ls':
      case 'cat':
      case 'rm':
        write(pick(replies[command]));
        break;
      case 'projects':
        write([projects.map((project) => pick(project.title)).join(', ')]);
        break;
      case 'github':
        write(pick(replies.github));
        window.open('https://github.com/andreluaan', '_blank', 'noopener');
        break;
      case 'draw':
        doodle();
        break;
      case 'secrets':
        write([`${foundSecrets().size}/${secrets.length}`]);
        break;
      case 'clear':
        log.replaceChildren();
        break;
      case 'magic':
        write(pick(replies.magic));
        doodle();
        unlock('magic');
        break;
      case 'note':
        if (!message) {
          write(pick(replies.noteEmpty));
          break;
        }
        write(pick(replies.noteSent));
        unlock('mail');
        onNoteSent?.();
        window.location.href = `mailto:${EMAIL}?subject=${encodeURIComponent(getLang() === 'pt' ? 'Recado do portfólio' : 'Note from the portfolio')}&body=${encodeURIComponent(message)}`;
        break;
      default:
        write([pick(replies.unknown)[0].replace('{c}', word)]);
    }
  };

  notebook.querySelector('form')!.addEventListener('submit', (event) => {
    event.preventDefault();
    run(input.value);
    input.value = '';
  });
  notebook.querySelectorAll<HTMLButtonElement>('[data-command]').forEach((button) =>
    button.addEventListener('click', () => {
      if (button.dataset.command === 'note') {
        input.value = getLang() === 'pt' ? 'recado ' : 'note ';
        input.focus();
        return;
      }
      run(getLang() === 'pt' ? { draw: 'desenhar', help: 'ajuda' }[button.dataset.command as 'draw' | 'help'] : button.dataset.command!);
    })
  );

  write(pick(replies.welcome));
  dialog.showModal();
  sounds.paper();
  requestAnimationFrame(() => {
    frameAll(notebook);
    input.focus();
  });
  dialog.addEventListener('close', () => dialog.classList.remove('is-notebook'), { once: true });
}
