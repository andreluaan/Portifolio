# Portfólio do André Luan — regras para o Claude

Portfólio pessoal para atrair clientes e mostrar personalidade. Identidade: arte desenhada em nanquim (pincel seco, aguada), fundo claro de papel, só tons neutros, ilustrações do próprio André. Bilíngue PT/EN.

Referência principal: https://www.samuelrizzon.dev/ — cada recurso dela é traduzido para tinta (intro, criaturinha de tinta, revelações, ficha de RPG, grade de contribuições, caderno de recados, segredos).

## Postura
- **Nada simples.** Animações ricas, detalhes minuciosos, easter eggs. Proponha a versão ambiciosa por padrão.
- **Sempre perguntar e sugerir.** Decisões de identidade são tomadas junto com o André; a cada rodada, traga sugestões de melhoria.
- Nanquim System (`C:\PROJETOS DE PROGRAMAÇÃO\Design-system`) é fonte opcional: reaproveitar só o que servir. Peças criadas aqui podem voltar para ele depois.
- Para pesquisar referências, use o agente `cacador-de-referencias`.

## Stack
Astro + GSAP (só tweens de interface) + PixiJS (a Mel). O mundo anda sobre a rolagem nativa da página, sem ScrollTrigger nem Lenis. Servidor de desenvolvimento em modo background (`astro dev --background`, ver AGENTS.md).
- **Pinceladas são gravadas no build, nunca no navegador.** Mudou um desenho, o mapa (`src/world/layout.ts`) ou `content.ts`? Rode `npm run ink` e commite `public/ink/` + `src/data/world.json`; o `npm run build` recusa imagens desatualizadas.
- **Orçamento de desempenho:** `npm run perf -- <rótulo>` (CPU 4×, Fast 4G) grava em `docs/perf/`. Referência (2026-11-10): LCP 1,15 s, tempo bloqueado 0,24 s, CLS 0,006, p95 de quadro 16,8 ms. Nada novo entra piorando esses números sem conversar.
- `npx astro check` tem de passar sem erros.

## Código
- Legibilidade primeiro: nomes que se explicam, código padronizado, comentários só para um *porquê* não óbvio, **em inglês**. Textos de interface em português (e inglês na versão EN).
- Respeitar `prefers-reduced-motion` em toda animação; foco visível; contraste legível.
- Commits sem `Co-Authored-By` ou qualquer assinatura do Claude.

## Pastas
- `src/lib/brush.ts` — motor de pincel (traços em SVG, máscaras de desenho, molduras à mão). `scenes.ts` guarda os desenhos. No mundo, só roda no build (`scripts/ink-bake/`); ao vivo, apenas nos diálogos e na mancha de tinta da mesinha.
- `src/lib/floor.ts` — o chão jogável: faixa com profundidade (estilo beat 'em up), caminho de pedras, cercas e lanternas desenhados no motor de pincel e gravados em ladrilhos.
- `src/lib/mascot.ts` — Borrão, a criaturinha de tinta (estados, física de mola, arrastar e soltar). O André prefere esta versão.
- `src/lib/mascot-dog.ts` + `src/styles/mascot-dog.css` — versão cachorrinho guardada para uso futuro (não importada). Ele não gostou dela como personagem principal.
- `src/world/` — o mundo de papel em modo jogo. `layout.ts`: o mapa em unidades fixas (largo e estreito), usado pelo build. `index.ts`: câmera, Mel guiada (A D / ← →, W S, espaço pula, E usa a estação, toque no chão), rolagem nativa como atalho, revelações. `scenery.ts`: rolo, chão e grama em ladrilhos perto da câmera. `props.ts`: peças do chão e lanternas. `layout-css.ts`: posições das estações em CSS. O fundo é um rolo emaki único e pré-pintado: a pintura do André em `prototipo/rolo/original.webp`, só redimensionada por `adapt.py` para `public/images/rolo/`; nunca repintar.
- `src/components/WorldPage.astro` — a página (PT em `/`, EN em `/en/`), com todo o conteúdo no HTML; sem JavaScript, ou com "ler como página", vira um documento legível (`src/styles/reading.css`). `Ink.astro` coloca as pinturas gravadas.
- `prototipo/mel-recorte/` — recorte da Mel: `cut.py` gera o atlas a partir do desenho; `fur.py` aplica pelagem, esconde cortes e limpa as patas sobre `mel-atlas-base.*`. `book.ts` (estante), `character.ts` (ficha), `notebook.ts` (recados), `painting.ts` (mesinha).
- `src/data/github.ts` — repositórios e contribuições do GitHub lidos no build, com fallback.
- `src/lib/secrets.ts`, `sound.ts` (sons sintetizados, mudos por padrão), `i18n.ts` + `src/data/content.ts` (textos PT/EN; o idioma vem da rota). `dialogs.ts` carrega livro, ficha e caderno só ao abrir.
- `docs/ideias.md` — banco de ideias vivo: registrar ideias novas e atualizar o status ao entregar uma peça.
- `prototipo/` — protótipos em HTML único (v2 = motor de pincel em SVG) e o retrato original.
- `public/images/andre-perfil.webp` e `andre-frente.webp` — retratos tratados (fundo branco puro, para mesclar com `multiply`).
