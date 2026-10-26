export type Lang = 'pt' | 'en';
export type Localized<T = string> = Record<Lang, T>;

export interface Project {
  id: string;
  year: string;
  repo?: string;
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
    repo: 'https://github.com/andreluaan/Nanquim-System',
    featured: true,
    title: { pt: 'Nanquim System', en: 'Nanquim System' },
    summary: {
      pt: 'Meu design system: uma base, várias marcas. Tokens em OKLCH, CSS puro + Web Components e documentação interativa. Cada marca nasce do mesmo nanquim, diluído em outro pigmento.',
      en: 'My design system: one base, many brands. OKLCH tokens, plain CSS + Web Components and interactive docs. Every brand grows from the same ink, diluted into another pigment.',
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
    repo: 'https://github.com/andreluaan/site-si-advocacia',
    featured: false,
    title: { pt: 'SI Advocacia', en: 'SI Advocacia' },
    summary: {
      pt: 'Landing page do escritório SI Advocacia, em Patos-PB: sóbria, clara e pensada para gerar confiança desde o primeiro contato.',
      en: 'Landing page for the SI Advocacia law firm in Patos, Brazil: sober, clear and built to earn trust from the first visit.',
    },
    stat: { pt: 'landing page institucional', en: 'institutional landing page' },
    status: { pt: 'no ar', en: 'live' },
    tags: { pt: ['landing page', 'css', 'front-end'], en: ['landing page', 'css', 'front-end'] },
  },
  {
    id: 'adeylma',
    year: '2026',
    repo: 'https://github.com/andreluaan/adeylma-vieira',
    featured: false,
    title: { pt: 'Adeylma Vieira', en: 'Adeylma Vieira' },
    summary: {
      pt: 'Identidade visual de uma revendedora: cartão de visita, perfil do Instagram e textos de WhatsApp, em versão preta e bege.',
      en: 'Visual identity for an independent reseller: business card, Instagram profile and WhatsApp copy, in black and beige versions.',
    },
    stat: { pt: 'cartão, Instagram, WhatsApp', en: 'card, Instagram, WhatsApp' },
    status: { pt: 'concluído', en: 'done' },
    tags: { pt: ['identidade visual', 'social'], en: ['visual identity', 'social'] },
  },
  {
    id: 'saideira',
    year: '2026',
    repo: 'https://github.com/andreluaan/Jokenpo-da-saideira',
    featured: false,
    title: { pt: 'Jokenpô da Saideira', en: 'Jokenpô da Saideira' },
    summary: {
      pt: 'Pedra, papel e tesoura para decidir quem paga a saideira. Um jogo casual em TypeScript para testar mecânicas e animação no navegador.',
      en: 'Rock, paper, scissors to decide who pays the last round. A casual TypeScript game to try out mechanics and animation in the browser.',
    },
    stat: { pt: 'feito por diversão', en: 'made for fun' },
    status: { pt: 'experimento', en: 'experiment' },
    tags: { pt: ['jogo', 'typescript'], en: ['game', 'typescript'] },
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
    title: { pt: 'Primeiros projetos web', en: 'First web projects' },
    detail: { pt: 'landing de pizzaria, API de tarefas em Node com POO e SOLID, MovieTrack, apps em React', en: 'pizzeria landing page, Node to-do API with OOP and SOLID, MovieTrack, React apps' },
    status: 'done',
  },
  {
    title: { pt: 'Curso de JavaScript e TypeScript', en: 'JavaScript & TypeScript course' },
    detail: { pt: 'conceitos, exercícios e projetos ao longo do aprendizado', en: 'concepts, exercises and projects along the way' },
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
  'nav.atelie': { pt: 'github', en: 'github' },
  'nav.contato': { pt: 'contato', en: 'contact' },
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

  'about.player': { pt: 'Jogador 1', en: 'Player 1' },
  'about.level': { pt: 'nível: em evolução', en: 'level: leveling up' },
  'about.class': { pt: 'classe: artesão do front-end', en: 'class: front-end craftsman' },
  'about.bio': {
    pt: 'Estudante de Ciência da Computação na Paraíba. Construo sites em que a parte visual pesa tanto quanto a técnica. Fora do código, desenho: figura, nanquim e muito caderno rabiscado.',
    en: 'Computer Science student in Paraíba, Brazil. I build websites where the visual side weighs as much as the technical one. Away from code, I draw: figures, ink and plenty of scribbled sketchbooks.',
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
  'mundo.sign.processo': { pt: 'como eu trabalho →', en: 'how I work →' },
  'mundo.sign.atelie': { pt: 'ateliê →', en: 'workshop →' },
  'process.title': { pt: 'O caminho de um projeto', en: 'The path of a project' },
  'process.s1.title': { pt: 'Conversa', en: 'Conversation' },
  'process.s1.text': { pt: 'Entendo o negócio, o público e o que o site precisa resolver.', en: 'I learn the business, the audience and what the site must solve.' },
  'process.s2.title': { pt: 'Esboço', en: 'Sketch' },
  'process.s2.text': { pt: 'Desenho estrutura e visual antes do código. Você aprova o rumo cedo.', en: 'I draw structure and look before code. You approve the direction early.' },
  'process.s3.title': { pt: 'Construção', en: 'Build' },
  'process.s3.text': { pt: 'Código limpo sobre um design system próprio: rápido e acessível.', en: 'Clean code on my own design system: fast and accessible.' },
  'process.s4.title': { pt: 'Entrega', en: 'Launch' },
  'process.s4.text': { pt: 'Publicação, domínio, ajustes finos e acompanhamento.', en: 'Publishing, domain, fine-tuning and follow-up.' },
  'repos.title': { pt: 'Ateliê · direto do GitHub', en: 'Workshop · straight from GitHub' },
  'repos.lede': { pt: 'tudo que está na bancada, do estudo ao projeto de cliente', en: 'everything on the workbench, from study to client work' },
  'repos.updated': { pt: 'mexido em', en: 'touched on' },
  'repos.all': { pt: 'ver tudo no GitHub ↗', en: 'see everything on GitHub ↗' },
  'mail.title': { pt: 'Correio', en: 'Mailbox' },
  'mail.lede': { pt: 'tem um projeto em mente? deixa um recado', en: 'got a project in mind? leave a note' },
  'mail.open': { pt: 'abrir o caderno de recados', en: 'open the guestbook' },
  'mail.copy': { pt: 'copiar e-mail', en: 'copy e-mail' },
  'mail.copied': { pt: 'copiado!', en: 'copied!' },
  'notebook.title': { pt: 'caderno de recados', en: 'guestbook' },
  'notebook.prompt': { pt: 'visitante ~ ✒', en: 'guest ~ ✒' },
  'notebook.note': { pt: 'deixar um recado', en: 'leave a note' },
  'notebook.draw': { pt: 'desenhar', en: 'draw' },
  'notebook.help': { pt: 'ajuda', en: 'help' },
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
  'mel.name': { pt: 'Mel, a cachorrinha do André. Passe o mouse para fazer carinho', en: 'Mel, André’s little dog. Hover to pet her' },
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
  paw: { pt: 'toma a pata', en: 'here’s my paw' },
} satisfies Record<string, Localized>;
