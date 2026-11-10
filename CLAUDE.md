# Portfólio do André Luan — regras para o Claude

Portfólio pessoal para atrair clientes e mostrar personalidade. Identidade: arte desenhada em nanquim (pincel seco, aguada), fundo claro de papel, só tons neutros, ilustrações do próprio André. Bilíngue PT/EN.

Referência principal: https://www.samuelrizzon.dev/ — cada recurso dela é traduzido para tinta (intro, criaturinha de tinta, revelações, ficha de RPG, grade de contribuições, caderno de recados, segredos).

## Postura
- **Nada simples.** Animações ricas, detalhes minuciosos, easter eggs. Proponha a versão ambiciosa por padrão.
- **Sempre perguntar e sugerir.** Decisões de identidade são tomadas junto com o André; a cada rodada, traga sugestões de melhoria.
- Nanquim System (`C:\PROJETOS DE PROGRAMAÇÃO\Design-system`) é fonte opcional: reaproveitar só o que servir. Peças criadas aqui podem voltar para ele depois.
- Para pesquisar referências, use o agente `cacador-de-referencias`.

## Stack
Astro + GSAP (ScrollTrigger) + Lenis. Canvas/WebGL quando o efeito pedir. Servidor de desenvolvimento em modo background (`astro dev --background`, ver AGENTS.md).

## Código
- Legibilidade primeiro: nomes que se explicam, código padronizado, comentários só para um *porquê* não óbvio, **em inglês**. Textos de interface em português (e inglês na versão EN).
- Respeitar `prefers-reduced-motion` em toda animação; foco visível; contraste legível.
- Commits sem `Co-Authored-By` ou qualquer assinatura do Claude.

## Pastas
- `src/lib/brush.ts` — motor de pincel (traços em SVG, máscaras de desenho, molduras à mão). `scenes.ts` guarda os desenhos.
- `src/lib/floor.ts` — o chão jogável: faixa com profundidade (estilo beat 'em up), caminho de pedras, cercas e lanternas desenhados no motor de pincel; `world.ts` move a Mel nele (W A S D e toque no chão).
- `src/lib/mascot.ts` — Borrão, a criaturinha de tinta (estados, física de mola, arrastar e soltar). O André prefere esta versão.
- `src/lib/mascot-dog.ts` + `src/styles/mascot-dog.css` — versão cachorrinho guardada para uso futuro (não importada). Ele não gostou dela como personagem principal.
- `src/lib/world.ts` — o mundo de papel (estações, camadas, rolagem lateral, clima manhã/névoa/entardecer). O fundo é um rolo emaki único e pré-pintado: a pintura do André em `prototipo/rolo/original.webp`, só redimensionada por `adapt.py` para `public/images/rolo/`; nunca repintar.
- `prototipo/mel-recorte/` — recorte da Mel: `cut.py` gera o atlas a partir do desenho; `fur.py` aplica pelagem, esconde cortes e limpa as patas sobre `mel-atlas-base.*`. `book.ts` (estante), `character.ts` (ficha), `notebook.ts` (recados), `painting.ts` (mesinha).
- `src/data/github.ts` — repositórios e contribuições do GitHub lidos no build, com fallback.
- `src/lib/secrets.ts`, `sound.ts` (sons sintetizados, mudos por padrão), `i18n.ts` + `src/data/content.ts` (textos PT/EN).
- `docs/ideias.md` — banco de ideias vivo: registrar ideias novas e atualizar o status ao entregar uma peça.
- `prototipo/` — protótipos em HTML único (v2 = motor de pincel em SVG) e o retrato original.
- `public/images/andre-perfil.webp` e `andre-frente.webp` — retratos tratados (fundo branco puro, para mesclar com `multiply`).
