export type Lang = 'pt' | 'en';
export type Localized<T = string> = Record<Lang, T>;

export interface Project {
  id: string;
  year: string;
  featured: boolean;
  title: Localized;
  summary: Localized;
  stat: Localized;
  status: Localized;
  tags: Localized<string[]>;
}

export const projects: Project[] = [
  {
    id: 'nanquim',
    year: '2026',
    featured: true,
    title: { pt: 'Nanquim System', en: 'Nanquim System' },
    summary: {
      pt: 'Meu design system: tokens em CSS e Web Components. Cada marca nasce do mesmo nanquim, diluído em outro pigmento.',
      en: 'My own design system: CSS tokens and Web Components. Every brand grows from the same ink, diluted into another pigment.',
    },
    stat: { pt: 'Nanquim, Carvão, Vitrine, Verde-água', en: 'Nanquim, Carvão, Vitrine, Verde-água' },
    status: { pt: 'v0.5', en: 'v0.5' },
    tags: { pt: ['design system', 'css', 'web components'], en: ['design system', 'css', 'web components'] },
  },
  {
    id: 'aer',
    year: '2026',
    featured: true,
    title: { pt: 'AeR Corretores', en: 'AeR Corretores' },
    summary: {
      pt: 'Identidade visual completa para uma imobiliária de Patos-PB: logotipo, manual da marca, paleta, tokens e kit para redes sociais.',
      en: 'Full visual identity for a real estate agency in Patos, Brazil: logo, brand manual, palette, design tokens and a social media kit.',
    },
    stat: { pt: 'logo, manual, tokens, kit social', en: 'logo, manual, tokens, social kit' },
    status: { pt: 'concluído', en: 'done' },
    tags: { pt: ['identidade visual', 'branding'], en: ['visual identity', 'branding'] },
  },
  {
    id: 'loquei',
    year: '2026',
    featured: true,
    title: { pt: 'Loquei · landing AeR', en: 'Loquei · AeR landing' },
    summary: {
      pt: 'Landing pública da AeR dentro do Loquei, um SaaS multi-imobiliária. Tema por cliente sem quebrar as outras contas.',
      en: 'AeR’s public landing page inside Loquei, a multi-tenant real estate SaaS. Per-client theming without breaking other accounts.',
    },
    stat: { pt: '120 imóveis no catálogo', en: '120 listings in the catalog' },
    status: { pt: 'em andamento', en: 'in progress' },
    tags: { pt: ['angular', 'nestjs', 'saas'], en: ['angular', 'nestjs', 'saas'] },
  },
  {
    id: 'rag',
    year: '2026',
    featured: true,
    title: { pt: 'Assistente com RAG', en: 'RAG assistant' },
    summary: {
      pt: 'Meu TCC: um assistente conversacional que consulta documentos das áreas jurídica e contábil, configurável por perfil de área.',
      en: 'My thesis: a conversational assistant that searches legal and accounting documents, configurable per field of work.',
    },
    stat: { pt: 'jurídico + contábil', en: 'legal + accounting' },
    status: { pt: 'em andamento', en: 'in progress' },
    tags: { pt: ['ia', 'rag', 'pesquisa'], en: ['ai', 'rag', 'research'] },
  },
  {
    id: 'advocacia',
    year: '2026',
    featured: false,
    title: { pt: 'SI Advocacia', en: 'SI Advocacia' },
    summary: {
      pt: 'Site para um escritório de advocacia: sóbrio, claro e pensado para gerar confiança desde o primeiro contato.',
      en: 'Website for a law firm: sober, clear and built to earn trust from the first visit.',
    },
    stat: { pt: 'site institucional', en: 'institutional website' },
    status: { pt: 'no ar', en: 'live' },
    tags: { pt: ['site', 'front-end'], en: ['website', 'front-end'] },
  },
  {
    id: 'saideira',
    year: '2026',
    featured: false,
    title: { pt: 'PPT da Saideira', en: 'PPT da Saideira' },
    summary: {
      pt: 'Um jogo casual para testar mecânicas e animação no navegador.',
      en: 'A casual game to try out mechanics and animation in the browser.',
    },
    stat: { pt: 'feito por diversão', en: 'made for fun' },
    status: { pt: 'experimento', en: 'experiment' },
    tags: { pt: ['jogo', 'javascript'], en: ['game', 'javascript'] },
  },
];

export const attributes = [
  { label: { pt: 'traço', en: 'linework' }, value: 0.9 },
  { label: { pt: 'front-end', en: 'front-end' }, value: 0.85 },
  { label: { pt: 'design', en: 'design' }, value: 0.8 },
  { label: { pt: 'paciência', en: 'patience' }, value: 0.7 },
  { label: { pt: 'café', en: 'coffee' }, value: 1 },
];

export const skillGroups: Array<{ title: Localized; skills: Array<{ name: string; level: number }> }> = [
  {
    title: { pt: 'Front-end', en: 'Front-end' },
    skills: [
      { name: 'HTML & CSS', level: 5 },
      { name: 'JavaScript / TypeScript', level: 4 },
      { name: 'Web Components', level: 4 },
      { name: 'Angular', level: 3 },
      { name: 'Astro + GSAP', level: 3 },
    ],
  },
  {
    title: { pt: 'Design', en: 'Design' },
    skills: [
      { name: 'Design systems', level: 4 },
      { name: 'Identidade visual', level: 4 },
      { name: 'Figma', level: 3 },
      { name: 'Ilustração em nanquim', level: 4 },
    ],
  },
  {
    title: { pt: 'Back-end & IA', en: 'Back-end & AI' },
    skills: [
      { name: 'NestJS', level: 2 },
      { name: 'Prisma + Postgres', level: 2 },
      { name: 'RAG / IA aplicada', level: 2 },
    ],
  },
];

export const journey: Array<{ title: Localized; detail: Localized; status: 'done' | 'active' | 'here' }> = [
  {
    title: { pt: 'Este portfólio', en: 'This portfolio' },
    detail: { pt: 'desenhado traço a traço, com um mundo de papel e uma criaturinha de tinta', en: 'drawn stroke by stroke, with a paper world and a little ink creature' },
    status: 'here',
  },
  {
    title: { pt: 'Nanquim System v0.5', en: 'Nanquim System v0.5' },
    detail: { pt: 'design system próprio, base de todos os sites de cliente', en: 'my own design system, the base for every client site' },
    status: 'active',
  },
  {
    title: { pt: 'Landing da AeR no Loquei', en: 'AeR landing inside Loquei' },
    detail: { pt: 'tema por cliente num SaaS multi-imobiliária', en: 'per-client theming in a multi-tenant real estate SaaS' },
    status: 'active',
  },
  {
    title: { pt: 'Identidade da AeR Corretores', en: 'AeR Corretores identity' },
    detail: { pt: 'manual, paleta, tokens, logos e kit social', en: 'manual, palette, tokens, logos and social kit' },
    status: 'done',
  },
  {
    title: { pt: 'SI Advocacia', en: 'SI Advocacia' },
    detail: { pt: 'site institucional no ar', en: 'institutional website, live' },
    status: 'done',
  },
  {
    title: { pt: 'Ciência da Computação', en: 'Computer Science' },
    detail: { pt: 'graduação em curso; TCC sobre assistentes com RAG', en: 'degree in progress; thesis on RAG assistants' },
    status: 'active',
  },
];

export const interests: Localized<string[]> = {
  pt: ['desenho & nanquim', 'jogos', 'design de interfaces', 'IA aplicada', 'café passado'],
  en: ['drawing & ink', 'games', 'interface design', 'applied AI', 'brewed coffee'],
};

export const inventory = [
  { label: { pt: 'Nanquim System', en: 'Nanquim System' }, value: { pt: 'v0.5', en: 'v0.5' } },
  { label: { pt: 'AeR Corretores', en: 'AeR Corretores' }, value: { pt: 'marca', en: 'brand' } },
  { label: { pt: 'Loquei', en: 'Loquei' }, value: { pt: '120 imóveis', en: '120 listings' } },
  { label: { pt: 'TCC com RAG', en: 'RAG thesis' }, value: { pt: 'em curso', en: 'ongoing' } },
  { label: { pt: 'Pincel', en: 'Brush' }, value: { pt: 'sempre à mão', en: 'always at hand' } },
  { label: { pt: 'Este site', en: 'This site' }, value: { pt: 'traço a traço', en: 'stroke by stroke' } },
];

export const strings = {
  'meta.description': {
    pt: 'Portfólio de André Luan, desenvolvedor front-end e designer que desenha em nanquim.',
    en: 'Portfolio of André Luan, a front-end developer and designer who draws in ink.',
  },
  'nav.label': { pt: 'Ir para', en: 'Go to' },
  'nav.inicio': { pt: 'início', en: 'start' },
  'nav.varal': { pt: 'destaques', en: 'highlights' },
  'nav.estante': { pt: 'estante', en: 'bookstand' },
  'nav.sobre': { pt: 'sobre', en: 'about' },
  'topbar.sound.on': { pt: 'som ligado', en: 'sound on' },
  'topbar.sound.off': { pt: 'som desligado', en: 'sound off' },
  'topbar.secrets': { pt: 'segredos', en: 'secrets' },

  'intro.label': { pt: 'molhando o pincel', en: 'wetting the brush' },
  'intro.hint': { pt: 'desenhando a página, traço a traço', en: 'drawing the page, stroke by stroke' },
  'intro.skip': { pt: 'pular intro', en: 'skip intro' },

  'hero.eyebrow': { pt: 'caderno de um desenvolvedor que desenha', en: 'sketchbook of a developer who draws' },
  'hero.role': { pt: 'Desenvolvedor front-end & designer', en: 'Front-end developer & designer' },
  'hero.lede': {
    pt: 'Crio sites, identidades e sistemas que as pessoas lembram. Tudo começa como esboço no papel e termina em código limpo, rápido e cheio de detalhe.',
    en: 'I build websites, identities and systems people remember. Everything starts as a sketch on paper and ends as clean, fast, detail-rich code.',
  },

  'work.eyebrow': { pt: 'folhas soltas', en: 'loose pages' },
  'work.title': { pt: 'Projetos', en: 'Projects' },

  'about.eyebrow': { pt: 'ficha do personagem', en: 'character sheet' },
  'about.title': { pt: 'Sobre mim', en: 'About me' },
  'about.player': { pt: 'Jogador 1', en: 'Player 1' },
  'about.level': { pt: 'nível: em evolução', en: 'level: leveling up' },
  'about.class': { pt: 'classe: artesão do front-end', en: 'class: front-end craftsman' },
  'about.bio': {
    pt: 'Estudante de Ciência da Computação. Construo sites em que a parte visual pesa tanto quanto a técnica. Fora do código, desenho: figura, nanquim e muito caderno rabiscado.',
    en: 'Computer Science student. I build websites where the visual side weighs as much as the technical one. Away from code, I draw: figures, ink and plenty of scribbled sketchbooks.',
  },
  'about.attributes': { pt: 'Atributos', en: 'Attributes' },
  'about.skills': { pt: 'Árvore de habilidades', en: 'Skill tree' },
  'about.journey': { pt: 'Diário de missões', en: 'Quest log' },
  'about.interests': { pt: 'Interesses', en: 'Interests' },
  'about.inventory': { pt: 'Inventário', en: 'Inventory' },
  'about.special': { pt: 'Golpe especial', en: 'Special move' },
  'about.achievements': { pt: 'Conquistas (seus segredos)', en: 'Achievements (your secrets)' },
  'about.contact': { pt: 'Chamar para uma aventura', en: 'Invite to an adventure' },
  'about.move': {
    pt: 'Me dê um esboço num guardanapo. Eu devolvo um site no ar.',
    en: 'Give me a sketch on a napkin. I’ll hand back a live website.',
  },
  'about.readFull': { pt: 'ler a ficha completa', en: 'read the full sheet' },
  'quest.done': { pt: 'concluída', en: 'done' },
  'quest.active': { pt: 'em andamento', en: 'in progress' },
  'quest.here': { pt: 'você está aqui', en: 'you are here' },

  'mundo.hint': { pt: 'role para caminhar', en: 'scroll to walk' },
  'mundo.sign.varal': { pt: 'destaques →', en: 'highlights →' },
  'mundo.sign.estante': { pt: 'estante →', en: 'bookstand →' },
  'mundo.sign.sobre': { pt: 'sobre →', en: 'about →' },
  'mundo.end': { pt: 'o caminho continua em breve', en: 'the path continues soon' },
  'mundo.lectern': { pt: 'todos os projetos · clique para ler', en: 'every project · click to read' },
  'mundo.desk': { pt: 'alguém esqueceu a mesa aqui…', en: 'someone left a desk here…' },
  'mundo.brush': { pt: 'pegue o pincel', en: 'grab the brush' },
  'mundo.painting': { pt: 'pintando o céu · Esc para soltar', en: 'painting the sky · Esc to put down' },
  'mundo.clear': { pt: 'apagar o céu', en: 'wipe the sky' },
  'mundo.ink': { pt: 'cuidado, tinta', en: 'careful, ink' },

  'book.title': { pt: 'Caderno de projetos', en: 'Project sketchbook' },
  'book.subtitle': { pt: 'todos os projetos, do primeiro rabisco ao ar', en: 'every project, from first scribble to launch' },
  'book.index': { pt: 'Índice', en: 'Contents' },
  'book.what': { pt: 'O que é', en: 'What it is' },
  'book.numbers': { pt: 'Em números', en: 'By the numbers' },
  'book.tools': { pt: 'Ferramentas', en: 'Tools' },
  'book.notes': { pt: 'notas de bastidor em breve', en: 'behind-the-scenes notes soon' },
  'book.end': { pt: 'fim (por enquanto)', en: 'the end (for now)' },
  'book.prev': { pt: 'página anterior', en: 'previous page' },
  'book.next': { pt: 'próxima página', en: 'next page' },
  'book.hint': { pt: 'arraste o canto, clique ou use ← →', en: 'drag the corner, click or use ← →' },

  'dialog.close': { pt: 'fechar', en: 'close' },

  'secrets.title': { pt: 'Passaporte de segredos', en: 'Secrets passport' },
  'secrets.found': { pt: 'segredo encontrado', en: 'secret found' },
  'secrets.locked': { pt: 'ainda em branco', en: 'still blank' },

  'mascot.name': { pt: 'Borrão, a criaturinha de tinta', en: 'Smudge, the little ink creature' },
} satisfies Record<string, Localized>;

export type StringKey = keyof typeof strings;

export const mascotLines: Localized<string[]> = {
  pt: ['oi!', 'cuidado, eu mancho', 'sou feito de nanquim', 'já viu a estante?', 'já achou os segredos?', 'ei, isso faz cócegas', 'o André me desenhou num guardanapo'],
  en: ['hi!', 'careful, I smudge', 'I’m made of ink', 'seen the bookstand yet?', 'found the secrets yet?', 'hey, that tickles', 'André drew me on a napkin'],
};

export const mascotReactions = {
  dropped: { pt: 'ai!', en: 'ouch!' },
  carried: { pt: 'uiii', en: 'wheee' },
  sleep: { pt: 'z', en: 'z' },
} satisfies Record<string, Localized>;
