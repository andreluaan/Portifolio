# Referências — relatório do caçador de referências (2026-10-23)

Legenda: **[V]** verificado · **[I]** inferido, conferir no navegador.

## samuelrizzon.dev por dentro
- **Stack [V]:** Next.js (App Router, Turbopack), CSS Modules, Vercel, Supabase (provável). **Sem GSAP, Lenis, Three.js ou áudio**: tudo à mão com canvas 2D, requestAnimationFrame e IntersectionObserver. Sem repositório público.
- **Loader "Building the page" [V]:** Esc pula e dá o secret "Impatient". Uma "crew" de agentes monta as partes num ritmo que dá para acompanhar.
- **Hero de blocos [V]:** variantes Swarm e Print; texto desenhado a partir dos pixels da fonte.
- **Criaturas [V]:** máquina de estados (home, flying, carried, falling, waiting, knocked); física de mola `vx += ((alvo−x)·260 − 28·vx)·dt`, dt ≤ 1/30; uma criatura segue o mouse e entra em "greve" se parada.
- **Projetos [V/I]:** lista com preview no hover.
- **Ficha "Player 1" [V]**, **contribuições** via `/api/contributions/{user}` com Compare [V], **mapa de visitantes** `/api/visitors/live|you` [V].
- **Terminal [V]:** help, note, socials, email, game, secrets, clear, send, cancel, matrix, whoami, ls, exit; extras `ls -a`, `cat secrets.txt`, `rm -rf`; recado por e-mail via `/api/contact`.
- **Minijogos [V]:** jogo da velha contra o agente; breakout escondido com placar global.
- **Secrets 0/20 [V]:** `localStorage["secrets-found"]` + `CustomEvent("secret")` + analytics. Gatilhos: pular intro, Konami, palavra no código-fonte, 404, honeypot `/admin`, console do DevTools, visita entre 0h e 5h, derrubar a página cutucando o pedreiro, 4 dígitos de 4 personagens, ganhar ou abandonar jogos, enviar nota, `matrix`/`rm -rf`, segredo no making-of.
- **Cuidado técnico [V]:** reduced-motion em tudo, dt limitado, storage em try/catch, view transitions [I].
- **Tom:** frases curtas, humor seco, metáforas de jogo; terminal em minúsculas.

## Outros sites
| Site | Por que olhar |
|---|---|
| shelbykho.com [V] | Mesa desenhada à mão para explorar; objetos arrastáveis, diário que vira página (Framer) |
| mr-pandas-psychologically-safe-portfolio.com [V] | Papercraft desenhado; GSAP + Three.js; tem tutorial no Codrops |
| celinelkw.com [V] | Navegação inteira em doodles a nanquim |
| niccolomiranda.com [V] | "Paper portfolio", dicas manuscritas, voz de artesão |
| daveholloway.uk [V] | **Astro + GSAP + Three + Lenis**; ilustração segue o mouse, cards com física, guitarra com som, 404 animada |
| seanhalpin.xyz [I] | Avatar ilustrado que muda de expressão |
| joshwcomeau.com [V] | Sons sutis com mudo, molas, whimsy com cuidado |
| lynnandtonic.com [V] | Redesign anual com arquivo de versões |
| robbowen.digital [V] | Humor e detalhes locais no texto |
| adhamdannaway.com [I] | Rosto metade designer, metade código |
| imdaryl.com [V] | Folha de desenho técnico (referência do próprio Samuel) |
| bruno-simon.com [V] | Mundo 3D dirigível (Three + Howler) |
| areebali.com [V] | Portfólio dentro de um portátil retrô |
| henryheffernan.com [I] | Computador 3D com SO navegável |
| messenger.abeto.co [V] | Mundinho coeso e encantador |

## Backlog (ideias em nanquim)
| # | Ideia | Esforço | Impacto | Técnica |
|---|---|---|---|---|
| 1 | Intro "a página se desenha"; Esc = blot de tinta | M | alto | SVG dashoffset + GSAP timeline + feTurbulence |
| 2 | Mascote de tinta com estados (anda, segue o mouse, cai, greve) | G | alto | Rive ou spritesheet em canvas + física de mola |
| 3 | Secrets como carimbos hanko num passaporte | M | alto | localStorage + CustomEvent + modal |
| 4 | Papel e tinta vivos em toda a página | P | alto | feTurbulence/feDisplacementMap, ruído, multiply |
| 5 | Reveal dos projetos por tinta se espalhando | M | alto | Máscara SVG ou shader WebGL com ruído |
| 6 | Autorretrato que olha para o cursor e muda de expressão | M | alto | SVG em camadas + GSAP quickTo, ou Rive |
| 7 | Ficha de personagem com métricas reais | P | médio | HTML/CSS + contadores GSAP |
| 8 | Smooth scroll e seções coreografadas | P | médio | Lenis + ScrollTrigger |
| 9 | Contribuições em pinceladas + compare | M | alto | GitHub GraphQL via API com cache |
| 10 | Caderno de recados com comandos e e-mail real | M | alto | Endpoint + Resend + rate limit |
| 11 | Sons de papel e pincel com mudo | P | médio | Howler.js |
| 12 | Jogo da velha com ensō | M | médio | Canvas/SVG + minimax |
| 13 | Mapa de visitantes em aguada ao vivo | G | médio | Supabase/Upstash + mapa SVG |
| 14 | Transições de página por pincelada | M | médio | View Transitions + máscara SVG |
| 15 | Navegação em doodles que balançam | P | médio | SVG + keyframes |
| 16 | Boiling lines (traço tremendo como animação à mão) | P | alto | 3 variações de SVG a 8–12 fps |
| 17 | Cards de papel arrastáveis com física | M | médio | GSAP Draggable + Inertia ou Matter.js |
| 18 | 404 "ainda está a lápis" + honeypot /admin | P | médio | Rota + ilustração |
| 19 | Mensagem no console em ASCII de pincel | P | baixo | console.log com %c |
| 20 | Cadernos anuais com arquivo | G | médio | Rotas versionadas |

## Perguntas em aberto
1. Protagonista: você (autorretrato animado) ou um mascote de tinta?
2. Metáfora central: caderno de esboços, mesa de trabalho ou mundo de papel?
3. Prazo: v1 com 1, 3, 4, 5, 8, 16 e o resto em versões?
4. Dados ao vivo com backend (mapa, recados, placar) ou estático com segredos no cliente?
5. Público principal: clientes (cases e CTA rápidos) ou devs/recrutadores (mais jogos e terminal)?
