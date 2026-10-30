# Banco de ideias

Lista viva do que o portfólio pode ganhar. Ideia nova entra aqui, e o status muda quando a peça muda.

**Status:** ✅ feito · 🟡 parcial · ⬜ pendente · 💭 proposta nova, ainda não aprovada
**Esforço:** P, M, G · **Impacto:** baixo, médio, alto
**Última conferência no código:** 2026-10-30

As ideias #1 a #20 vêm do relatório em [referencias.md](referencias.md). Toda ideia pesada precisa respeitar a prioridade de desempenho: entra em etapas e medindo.

## Próximas (pendentes e parciais)

| # | Ideia | Status | Esforço | Impacto | Técnica | Situação atual |
|---|---|---|---|---|---|---|
| 6 | Autorretrato que olha para o cursor e muda de expressão | ⬜ | M | alto | SVG em camadas + GSAP quickTo, ou Rive | Retratos são imagens; só têm revelação por pincelada |
| 9 | Contribuições em pinceladas + compare | ⬜ | M | alto | GitHub GraphQL com cache | Nada no código; o CLAUDE.md descreve contribuições, mas `github.ts` não as lê |
| 5 | Reveal dos projetos por tinta se espalhando | 🟡 | M | alto | Máscara SVG ou shader WebGL com ruído | Há revelação por máscara de pincel; a mancha que se espalha nos projetos não foi confirmada |
| 10 | Caderno de recados com comandos e e-mail real | 🟡 | M | alto | Endpoint + Resend + rate limit | Comandos prontos; o recado abre o `mailto:`, sem envio real |
| 12 | Jogo da velha com ensō | ⬜ | M | médio | Canvas/SVG + minimax | — |
| 13 | Mapa de visitantes em aguada ao vivo | ⬜ | G | médio | Supabase/Upstash + mapa SVG | Exige backend; o site é uma página estática |
| 14 | Transições de página por pincelada | ⬜ | M | médio | View Transitions + máscara SVG | Só existe uma página; depende de novas rotas |
| 15 | Navegação em doodles que balançam | 🟡 | P | médio | SVG + keyframes | `world-nav` existe; doodles e balanço não confirmados |
| 17 | Cards de papel arrastáveis com física | ⬜ | M | médio | GSAP Draggable + Inertia ou Matter.js | Só Borrão e Mel são interativos assim |
| 18 | 404 "ainda está a lápis" + honeypot /admin | ⬜ | P | médio | Rota + ilustração | Não existe a página 404 |
| 19 | Mensagem no console em ASCII de pincel | 🟡 | P | baixo | console.log com %c | Mensagem estilizada pronta, sem arte ASCII |
| 20 | Cadernos anuais com arquivo | ⬜ | G | médio | Rotas versionadas | — |

## Propostas novas

| # | Ideia | Status | Esforço | Impacto | Técnica | Origem |
|---|---|---|---|---|---|---|
| 21 | Segredo escondido no código-fonte da página | 💭 | P | médio | Comentário HTML + comando no caderno | Gatilho do samuelrizzon.dev ainda sem versão aqui |
| 22 | Segredo para quem abandonar ou vencer um minijogo | 💭 | P | baixo | `unlock()` no fim da partida; depende da #12 | Gatilho do samuelrizzon.dev |
| 23 | Recado de volta do Borrão quando o visitante retorna | 💭 | P | médio | localStorage com a última visita | Proposta do Claude |
| 24 | Fundo como rolo emaki único em sumi-e: pintura contínua, sem divisão por cenas, só neutros, com áreas calmas atrás do conteúdo | ⬜ | G | alto | WebP pré-pintado em blocos + overlay leve | Feito com a pintura enviada pelo André, usada sem alteração |

## Feitas

| # | Ideia | Onde está | Observação |
|---|---|---|---|
| 1 | Intro "a página se desenha"; Esc pula | `intro.ts` | Pular dá o segredo "impaciente" |
| 2 | Mascote de tinta com estados | `mascot.ts` | Borrão; a Mel veio depois em `mel.ts` |
| 3 | Segredos como carimbos num passaporte | `secrets.ts`, `app.ts` | 13 segredos |
| 4 | Papel e tinta vivos em toda a página | `Base.astro`, `global.css` | Filtros gravados em imagem por `bake.ts` |
| 7 | Ficha de personagem | `character.ts`, `sections.ts` | Atributos vêm de `content.ts` |
| 8 | Smooth scroll e seções coreografadas | `app.ts`, `world.ts` | Lenis + ScrollTrigger |
| 11 | Sons de papel e pincel com mudo | `sound.ts` | Sintetizados, sem Howler |
| 16 | Boiling lines | `effects.ts`, `bake.ts`, `mel.ts` | Três quadros gravados |

## Perguntas em aberto

- **Público principal:** clientes ou devs e recrutadores? Isso define a ordem das próximas.
- **Backend:** o site continua estático ou ganha dados ao vivo? Isso decide #10 e #13.

**Já decididas:** o protagonista é o mascote de tinta, e a metáfora é o mundo de papel.
