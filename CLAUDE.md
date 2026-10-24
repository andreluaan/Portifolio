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
- `src/lib/mascot.ts` — Borrão, o cachorrinho de tinta: rig procedural (IK nas pernas, marcha passo/trote, rabo e orelha com molas) e estados. Para ajustar poses, crie uma página de teste temporária que instancie `Mascot` em escala grande e use `preview(estado)`.
- `src/lib/world.ts` — o mundo de papel (estações, camadas, rolagem lateral). `book.ts` (estante), `character.ts` (ficha), `notebook.ts` (recados), `painting.ts` (mesinha).
- `src/data/github.ts` — repositórios e contribuições do GitHub lidos no build, com fallback.
- `src/lib/secrets.ts`, `sound.ts` (sons sintetizados, mudos por padrão), `i18n.ts` + `src/data/content.ts` (textos PT/EN).
- `prototipo/` — protótipos em HTML único (v2 = motor de pincel em SVG) e o retrato original.
- `public/images/andre-perfil.webp` e `andre-frente.webp` — retratos tratados (fundo branco puro, para mesclar com `multiply`).
