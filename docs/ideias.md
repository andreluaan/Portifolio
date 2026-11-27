# Banco de ideias

Lista viva do que o portfólio pode ganhar. Ideia nova entra aqui, e o status muda quando a peça muda.

**Quadro visual:** https://claude.ai/artifact/XYsnoADderm8nbh6ZZ6f5o

**Status:** ✅ feito · 🟡 parcial · ⬜ pendente · 💭 proposta nova, ainda não aprovada
**Esforço:** P, M, G · **Impacto:** baixo, médio, alto
**Última conferência no código:** 2026-11-24 (identidade andreluaan.dev aplicada, ver [identidade.md](identidade.md))

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
| 14 | Transições de página por pincelada | ⬜ | M | médio | View Transitions + máscara SVG | Já existem duas rotas (`/` e `/en/`): a troca de idioma é a primeira candidata |
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
| 28 | Imagem de compartilhamento (og:image) com o logo oficial sobre o papel | 💭 | P | médio | PNG gerado por script a partir de `andreluaan-logo-oficial.svg` | Precisa de `site` no `astro.config.mjs` (link absoluto) |
| 29 | Modo escuro "papel sumi" com os tons escuros do manual | ⬜ aprovado, para 25/11 | M | alto | Tokens já preparados: a capa do caderno troca `--ink`, `--paper` e `--shu` num só lugar | Proposta do Claude na troca de identidade |
| 30 | Selo circular da marca como prêmio dos 15 segredos | 💭 | P | médio | O círculo da marca de memória em shu com o AL dentro, carimbado no passaporte | Ideia do banco da marca ("easter egg quando acha todos os segredos") |
| 31 | Circuito do símbolo AL bem fraco atrás do ateliê do GitHub | 💭 | P | baixo | Camada `circuito` de `al-completo.svg` em `--circuit`, revelada por pincelada | O lado "tecnologia" da marca junto aos repositórios |
| 24 | Fundo como rolo emaki único em sumi-e: pintura contínua, sem divisão por cenas, só neutros, com áreas calmas atrás do conteúdo | ⬜ | G | alto | WebP pré-pintado em blocos + overlay leve | Feito com a pintura enviada pelo André, usada sem alteração |

## Pedidos do André

| # | Ideia | Status | Esforço | Impacto | Técnica | Observação |
|---|---|---|---|---|---|---|
| 25 | Chão novo: mais grama e clima de cidadezinha japonesa, com ruas, cercas, lanternas e casinhas | 🟡 | G | alto | Faixa contínua pedida ao ChatGPT, em bloco repetível, no lugar da linha e da mancha atuais | Feito em `floor.ts` (2026-11-09): caminho de pedras ishidatami em projeção oblíqua, cercas de bambu, lanternas, poças, pedras de passo e grama nas bordas. Faltam as casinhas |
| 26 | Minigame com a Mel: ela pula e sobe nas coisas do mundo em busca de algo | 🟡 | G | alto | `src/world/index.ts` + `props.ts`: a Mel já é controlada (andar, profundidade, pulo com espaço) e as peças têm colisão (desvia das altas, pula as baixas) | Base pronta em 2026-11-10 (modo jogo). Falta definir o que ela procura, subir em cima das peças e o placar |
| 27 | Mel com movimento em profundidade, como nos beat 'em ups antigos das Tartarugas Ninja: frente, trás, cima e baixo no chão | 🟡 | G | alto | Faixa de chão com eixo Y próprio, Mel maior quando está mais perto e ordem de camadas pela posição | Feito em `floor.ts` + `world.ts` (2026-11-09): faixa de ~27% da tela, W A S D, toque no chão, escala sutil, pegadas e segredo "profundidade". Objetos no meio do chão (lanterna, bacia, balde, pedras) ordenados pela profundidade: ela pula os baixos e desvia dos altos. Todos ficam na linha central de uma fileira de pedras, e há uma lanterna só no site todo (borda de trás e meio do chão), que acende com clique e dá o segredo "acendedor". A versão pintada pelo ChatGPT está no prompt 11 |

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
| — | Identidade andreluaan.dev (cores, Geist, ponto redondo, AL, hanko, marca de memória, favicons) | `brand.css`, `global.css`, `memory-mark.ts`, `public/brand/` | 2026-11-24; decisões a conferir em [identidade.md](identidade.md) §3 |
| — | Loader com a marca de memória (círculo, fio, corte) | `intro.ts`, `MemoryMark.astro` | Ideia do banco da marca; segue o tempo do manual |
| — | Fim do caminho: o ensō pincelado é cortado pelo fio e vira a marca de memória | `world/index.ts`, `.cut-mark` | "Assinatura curta no lugar de um fim", do banco da marca |

## Perguntas em aberto

- **Público principal:** clientes ou devs e recrutadores? Isso define a ordem das próximas.
- **Backend:** o site continua estático ou ganha dados ao vivo? Isso decide #10 e #13.
- **Domínio:** com o endereço definido (`andreluaan.dev`?), preencher `site` em `astro.config.mjs` para os links canônicos e hreflang ficarem absolutos. Isso também libera a og:image (#28).
- **E-mail de contato:** o site usa o e-mail pessoal; a marca prevê `contato@andreluaan.dev`, que ainda não existe.

**Já decididas:** o protagonista é o mascote de tinta, e a metáfora é o mundo de papel.
