export const GITHUB_USER = 'andreluaan';

export interface Repo {
  name: string;
  description: string | null;
  language: string | null;
  url: string;
  pushedAt: string;
}

export interface GithubData {
  repos: Repo[];
  live: boolean;
}

const HIDDEN_REPOS = new Set(['andreluaan', 'Portifolio']);

/** Snapshot used when GitHub can't be reached during the build. */
const FALLBACK_REPOS: Repo[] = [
  { name: 'Nanquim-System', description: 'Meu design system: uma base, várias marcas. Tokens em OKLCH, CSS puro + Web Components e documentação interativa.', language: 'CSS', url: 'https://github.com/andreluaan/Nanquim-System', pushedAt: '2026-10-23' },
  { name: 'adeylma-vieira', description: 'Identidade visual da revendedora Adeylma Vieira: cartão de visita, perfil do Instagram e textos de WhatsApp.', language: 'CSS', url: 'https://github.com/andreluaan/adeylma-vieira', pushedAt: '2026-10-21' },
  { name: 'Jokenpo-da-saideira', description: null, language: 'TypeScript', url: 'https://github.com/andreluaan/Jokenpo-da-saideira', pushedAt: '2026-10-19' },
  { name: 'site-si-advocacia', description: 'Landing page do escritório SI Advocacia (Patos-PB).', language: 'CSS', url: 'https://github.com/andreluaan/site-si-advocacia', pushedAt: '2026-10-16' },
  { name: 'Curso-JS-e-TP-Web', description: 'Estudos e exercícios do curso de JavaScript e TypeScript.', language: 'HTML', url: 'https://github.com/andreluaan/Curso-JS-e-TP-Web', pushedAt: '2026-10-15' },
  { name: 'Filmes-React', description: null, language: 'TypeScript', url: 'https://github.com/andreluaan/Filmes-React', pushedAt: '2026-08-25' },
  { name: 'ToDoList-PW-React', description: null, language: 'JavaScript', url: 'https://github.com/andreluaan/ToDoList-PW-React', pushedAt: '2026-08-22' },
  { name: 'ToDoList-PW', description: 'API REST CRUD de tarefas em Node.js + Express, aplicando POO e princípios SOLID.', language: 'JavaScript', url: 'https://github.com/andreluaan/ToDoList-PW', pushedAt: '2026-08-12' },
  { name: 'DrinkTest', description: 'Carrossel básico de refris com temas diferentes.', language: 'CSS', url: 'https://github.com/andreluaan/DrinkTest', pushedAt: '2026-08-06' },
  { name: 'Pizzaria-landingpage', description: 'Primeiro projeto de landing page.', language: 'HTML', url: 'https://github.com/andreluaan/Pizzaria-landingpage', pushedAt: '2026-08-03' },
  { name: 'MovieTrack', description: 'Aplicação para gerenciar filmes assistidos.', language: 'JavaScript', url: 'https://github.com/andreluaan/MovieTrack', pushedAt: '2026-06-05' },
];

async function fetchText(url: string, accept = 'text/html') {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 8000);
  try {
    const response = await fetch(url, { headers: { Accept: accept, 'User-Agent': 'andreluaan-portfolio' }, signal: controller.signal });
    if (!response.ok) throw new Error(`${response.status} ${url}`);
    return await response.text();
  } finally {
    clearTimeout(timer);
  }
}

async function loadRepos(): Promise<Repo[]> {
  const raw = JSON.parse(await fetchText(`https://api.github.com/users/${GITHUB_USER}/repos?per_page=100&sort=pushed`, 'application/vnd.github+json'));
  return raw
    .filter((repo: { fork: boolean; name: string }) => !repo.fork && !HIDDEN_REPOS.has(repo.name))
    .map((repo: { name: string; description: string | null; language: string | null; html_url: string; pushed_at: string }) => ({
      name: repo.name,
      description: repo.description,
      language: repo.language,
      url: repo.html_url,
      pushedAt: repo.pushed_at.slice(0, 10),
    }));
}

export async function loadGithub(): Promise<GithubData> {
  const repos = await loadRepos().catch(() => []);
  return { repos: repos.length ? repos : FALLBACK_REPOS, live: repos.length > 0 };
}
