# Placas do mundo e "O caminho de um projeto": direção de arte

> Só proposta. Nenhum arquivo do projeto foi editado. As posições usam o `buildWorld` atual de `src/lib/world.ts`.

---

## 0. Referências verificadas

| Obra / fonte | Link | O que ensina aqui |
|---|---|---|
| *Noren*, algodão tingido em índigo com reserva de pasta (tsutsugaki), fim do séc. XIX ao início do XX (V&A) | https://collections.vam.ac.uk/item/O23319/noren-unknown/ | O noren pendurado na entrada **avisava que a loja estava aberta**. É feito de duas larguras de tecido costuradas só em cima, e a parte de baixo fica aberta para passar. Tem uma imagem grande e simples (um polvo indicava casa de frutos do mar). Lições para as placas: cada estação é uma "loja aberta", com faixa superior inteira para o texto, duas abas soltas que o vento mexe e um ícone que diz o que tem ali. |
| Tanzaku de Tanabata (Japan Society, Londres) | https://www.japansociety.org.uk/tanzaku | Tira estreita de papel escrita e pendurada no bambu. É a base da direção C. |
| Emaki, rolo horizontal (JAANUS, dicionário de termos de arte japonesa) | https://aisf.or.jp/~jaanus/deta/e/emaki.htm | O emaki é desenrolado **uma seção por vez**: a mão esquerda abre, a direita enrola, cerca de 30 cm ou um palmo confortável de cada vez. A leitura é uma progressão no tempo. Esse é o motor da seção do processo: o rolo abre conforme a rolagem do mundo. |
| Atribuído a Tenshō Shūbun (1414–1463), *Ten Oxherding Pictures*, Museu do templo Shōkoku-ji (Wikimedia Commons) | https://commons.wikimedia.org/wiki/File:Oxherding_pictures,_No._6.jpg | **Dez pinturas circulares, de 14 cm de diâmetro, montadas num rolo** (32 × 181.5 cm). Uma parábola contada em etapas, cada uma num círculo. É a base direta das 4 janelas circulares do processo, e o círculo conversa com o ensō que fecha o mundo. |
| Maruyama Ōkyo, *Five Puppies*, LACMA | https://collections.lacma.org/object/29742 | A página registra o **selo do artista e a inscrição à direita**. O selo (hanko) é assinatura e marca de "pronto". Ele aparece nas placas (ícone da estação) e na 4ª etapa do processo (Entrega). |

**Não confirmado:** o Hiroshige do British Museum (*Seki*, com um marco de distância na estrada) apareceu na busca, mas o WebFetch deu 403. Não uso como referência. O ensaio do Met sobre handscrolls deu 429.

---

## 1. Placas do mundo

### Diagnóstico do que existe
- **Tábua em forma de seta:** é linguagem de placa de faroeste, não de sumi-e.
- **Fundo `#f7f7f5`:** fica fora da paleta e briga com o `--paper`.
- **Sombra em wash a 35%:** dá volume de "objeto 3D", mas o resto do mundo é chapado.
- **Resultado:** a placa vira um retângulo claro sobre a aguada clara, com pouco contraste de massa.

**A regra nova:** a placa tem que ser **uma mancha escura com texto em papel** (contraste invertido), ou papel com moldura de nanquim forte. Mancha média sobre montanha média é o que não funciona.

### Direção A: noren de estação (recomendada)
**Ideia:** cada estação é uma loja aberta do ateliê. Um noren curto pendurado numa vara de bambu, com o texto em branco de papel na faixa de cima e duas abas que o vento mexe.

- **Legibilidade:**
  - Texto `--paper` sobre `soft #3b3c3a` dá cerca de **9.6 : 1** (estimado pelas luminâncias). É a melhor leitura das três direções, e funciona sobre qualquer montanha porque a mancha é mais escura que toda a aguada do fundo.
  - O ícone fica num selo de papel com glifo em tinta, um por estação (ver glifos abaixo).
- **Tamanho:**
  - Desktop: 220 × 190 (o viewBox atual), faixa de texto de 154 × 34 px.
  - Celular 375 px: `scale(0.8)` → 176 × 152, texto 1.4rem. O `fitSignLabels` continua valendo, com mínimo prático de cerca de 15 px.
  - Toda a placa é área de toque (> 44 px).
- **Estrutura e desempenho:** cada placa vira **3 elementos HTML**, cada um com seu `<svg>`:
  - `.sign-frame`: poste, vara, faixa e selo (estático, pode ter filtro);
  - `.sign-panel.left`;
  - `.sign-panel.right`.

  Como as abas são elementos HTML, o vento e a brisa animam `transform` no compositor, sem repintar SVG. Cada aba tem uma camada externa, que recebe o GSAP de entrada e hover, e uma interna (`.sign-cloth`), que recebe a brisa CSS e o `--wind`. Separar as duas evita a briga entre a animação CSS e o GSAP no mesmo `transform`.

```css
.station-sign { rotate: none; }                       /* the post no longer leans with the wind */
.sign-panel { position: absolute; transform-origin: 50% 0; }
.sign-cloth {
  transform-origin: 50% 0;
  rotate: calc(var(--wind, 0) * -0.9deg);
  animation: noren-breeze 3.4s ease-in-out infinite alternate;
  animation-play-state: var(--breeze, paused);       /* world.ts sets --breeze: running only for signs on screen */
}
.sign-panel.right .sign-cloth { animation-delay: -1.1s; }
@keyframes noren-breeze { from { transform: skewX(-1.2deg); } to { transform: skewX(1.8deg); } }
.station-sign:hover .sign-panel.left { translate: -4px 0; }   /* parting the curtain to walk in */
.station-sign:hover .sign-panel.right { translate: 4px 0; }
.station-sign .hand { color: var(--paper); left: 40px; top: 36px; width: 154px; height: 34px; }
@media (prefers-reduced-motion: reduce) { .sign-cloth { animation: none; rotate: none; } .sign-panel { translate: none !important; } }
```

- **Entrada** (no `reveals[name]`, uma vez):
  1. `renderScene(frameSvg, worldProps.norenFrame(seed), { animate: true, pace: 1.4 })`: o poste e a vara se desenham em cerca de 0.5 s.
  2. As abas "caem" da vara: `gsap.fromTo(panels, { scaleY: 0 }, { scaleY: 1, transformOrigin: '50% 0%', duration: 0.55, stagger: 0.08, ease: 'power3.out', delay: 0.25 })`.
  3. Acompanhamento: `gsap.fromTo(panels, { rotation: -10 }, { rotation: 0, duration: 1.4, ease: 'elastic.out(1, 0.35)', delay: 0.3, clearProps: 'transform' })`.
  4. O texto aparece como escrito a pincel: `gsap.fromTo(label, { clipPath: 'inset(0 100% 0 0)' }, { clipPath: 'inset(0 0% 0 0)', duration: 0.6, ease: 'power2.inOut', delay: 0.5 })`.
  5. O selo é "carimbado": `gsap.fromTo(seal, { scale: 1.5, autoAlpha: 0 }, { scale: 1, autoAlpha: 1, duration: 0.2, ease: 'power4.in', delay: 0.95 })`.
- **Vento:**
  - `--wind` gira as abas (×0.9°) e a brisa CSS faz um skew de ±1.5° em 3.4 s.
  - Quando o Borrão ou a Mel passam por baixo (o x da placa cruza `mascotX`), as abas levam um peteleco: `gsap.fromTo(panel, { rotation: 6 * dir }, { rotation: 0, duration: 0.9, ease: 'elastic.out(1, 0.4)' })`. É o mesmo cruzamento que já é usado para as pedras.
- **Movimento reduzido:** desenho estático, sem brisa nem vento, abas paradas. O texto e o selo aparecem direto.

**Desenho** (viewBox `0 0 220 190`, coerente com `worldProps`):
```ts
/** Noren sign, split into a static frame and two cloth panels so the panels can sway as HTML layers. */
norenFrame: (seed: number): Stroke[] => [
  stroke([[4, 184], [48, 186]], 10, { tone: 'mist', filter: 'wash', seed: seed + 1 }),
  stroke([[22, 36], [24, 184]], 5.5, { seed, start: 0.02, end: 0.05 }),               // bamboo post
  ...[80, 122, 162].map((y, i) => stroke([[18.5, y], [28, y - 0.6]], 1.6, { seed: seed + 2 + i })), // bamboo nodes
  stroke([[12, 30], [110, 27.5], [208, 30.5]], 4.2, { seed: seed + 6, start: 0.02, end: 0.05 }),     // rod
  // Top band (uncut part of the noren) where the label sits
  stroke([[36, 52], [118, 51], [198, 53]], 40, { tone: 'soft', filter: 'none', seed: seed + 7, start: 0.02, end: 0.03, wobble: 0.25 }),
  ...[46, 84, 152, 190].map((x, i) => stroke([[x, 25], [x + 0.5, 36]], 5, { tone: 'soft', filter: 'none', seed: seed + 8 + i })), // loops on the rod
  stroke([[42, 39], [104, 38]], 1, { tone: 'paper', filter: 'none', seed: seed + 12, start: 0.3, end: 0.5 }),            // dry-brush gaps
  stroke([[128, 66], [192, 67]], 0.9, { tone: 'paper', filter: 'none', seed: seed + 13, start: 0.4, end: 0.4 }),
],
/** One cloth flap; `side` 0 is the left flap (x 35–115), 1 the right flap (x 120–200). Drawn in the 220×190 box. */
norenPanel: (seed: number, side: 0 | 1): Stroke[] => {
  const cx = side ? 159 : 75;
  const hem = side ? 125 : 128;
  return [
    stroke([[cx, 60], [cx, 95], [cx + (side ? -1 : 1), hem - 1]], 78, { tone: 'soft', filter: 'none', seed, start: 0.02, end: 0.04, wobble: 0.25 }),
    stroke([[cx - 36, hem], [cx + 38, hem + 1]], 2, { filter: 'none', seed: seed + 1, start: 0.05, end: 0.1 }),
    stroke([[cx - 30, 110], [cx + 26, 109]], 1.1, { tone: 'paper', filter: 'none', seed: seed + 2, start: 0.3, end: 0.5 }),
    stroke([[cx + 12, 80], [cx + 14, 118]], 0.9, { tone: 'paper', filter: 'none', seed: seed + 3, start: 0.4, end: 0.4 }),
  ];
},
/** Station seal: a paper square with an ink glyph, stamped on the right flap at (170, 96). */
signSeal: (seed: number, glyph: Stroke[]): Stroke[] => [
  stroke([[171, 106], [189, 106]], 19, { tone: 'paper', filter: 'none', seed, start: 0.02, end: 0.02 }),
  ...roughRect(170, 96, 20, 20, 1.4, seed + 1).map((item) => ({ ...item, filter: 'none' as const })),
  ...glyph.map((item) => ({ ...item, filter: 'none' as const, points: item.points.map(([x, y]) => [x + 170, y + 96] as Point) })),
],
```
`signSeal` é estático, mas fica na aba direita, que balança. Por isso o `filter: 'none'`.

**Glifos dos selos** (caixa 20 × 20):
```ts
export const stationGlyphs: Record<'processo' | 'varal' | 'estante' | 'atelie' | 'sobre', Stroke[]> = {
  processo: [ // two paw prints: the path walked by Borrão and Mel
    stroke(ellipsePoints(6, 13, 2.4, 2, { seed: 1, count: 8 }), 2.4, { seed: 1, start: 0.02, end: 0.05 }),
    stroke(ellipsePoints(14, 7, 2.4, 2, { seed: 2, count: 8 }), 2.4, { seed: 2, start: 0.02, end: 0.05 }),
  ],
  varal: [stroke([[3, 5], [17, 5]], 1.2, { seed: 3 }), stroke([[10, 4], [10, 17]], 3.2, { seed: 4, start: 0.05, end: 0.2 }), stroke([[8, 10], [12, 10]], 1, { tone: 'paper', seed: 5 })],
  estante: [stroke([[2, 6], [10, 8], [18, 6]], 1.3, { seed: 6 }), stroke([[2, 6], [2, 16], [10, 18], [18, 16], [18, 6]], 1.3, { seed: 7, start: 0.02, end: 0.04 }), stroke([[10, 8], [10, 18]], 1.1, { seed: 8 })],
  atelie: [stroke([[4, 18], [13, 5]], 2, { seed: 9 }), stroke([[13, 5], [17, 1]], 3.6, { seed: 10, start: 0.05, end: 0.9 })],
  sobre: [stroke(ellipsePoints(10, 11, 4.4, 3.8, { seed: 11, count: 10 }), 6, { seed: 11, start: 0.02, end: 0.05 }), stroke([[8, 10], [8.3, 10.3]], 1.4, { tone: 'paper', seed: 12 }), stroke([[12, 10], [12.3, 10.3]], 1.4, { tone: 'paper', seed: 13 })],
};
```

### Direção B: pedra-marco com carimbo
**Ideia:** um marco de pedra baixo à beira do caminho, com o nome da estação pintado em tinta e um selo ao lado.

- **Legibilidade:** tinta sobre `mist` dá cerca de 10 : 1 (estimado). A pedra fica **no chão**, abaixo da linha das montanhas, sobre a faixa do chão. É uma leitura limpa, mas o Borrão e a Mel passam na frente e cobrem o texto por um instante.
- **Animação:** a pedra não tem vento (pedra não balança), só os tufos de capim aos pés com `--wind`. A entrada é a pedra desenhada a pincel (0.6 s) e depois o **carimbo**: escala 1.6 → 1 em 0.18 s com `power4.in`, tremidinha de 2 px no mundo e 4 gotículas de `inkSplat(…, 6)`. É o momento mais "jogo" das três.
- **Interação:** a Mel cheira a pedra e o Borrão pula por cima dela (as pedras já disparam `hop`).
- **Celular:** 170 × 120. O texto tem só cerca de 108 px de largura, então quebra em duas linhas. "como eu trabalho" fica em 2 linhas de 1.2rem.
- **Desenho** (viewBox `0 0 220 190`):
```ts
stoneMarker: (seed: number): Stroke[] => [
  stroke([[24, 184], [196, 186]], 12, { tone: 'mist', filter: 'wash', seed: seed + 1 }),
  stroke([[110, 92], [110, 138], [111, 176]], 132, { tone: 'mist', filter: 'none', seed, start: 0.08, end: 0.02, wobble: 0.3 }),
  stroke([[160, 96], [166, 140], [164, 180]], 14, { tone: 'wash', filter: 'none', seed: seed + 2, start: 0.1, end: 0.2 }),
  stroke([[46, 184], [42, 130], [52, 92], [84, 74], [134, 72], [168, 86], [178, 128], [174, 184]], 3, { seed: seed + 3, start: 0.02, end: 0.04 }),
  stroke([[62, 150], [96, 148]], 1, { tone: 'paper', filter: 'none', seed: seed + 4, start: 0.3, end: 0.5 }),
],
```
O texto vai em `left: 56px; top: 104px; width: 108px`, cor `--ink`. O selo usa `signSeal`, deslocado para (142, 80).

### Direção C: tira de papel amarrada no bambu (tanzaku deitado)
**Ideia:** uma estaca de bambu com uma tira horizontal de papel amarrada por um cordão, com duas fitas que voam.

- **Legibilidade:** tinta sobre papel é ótima no texto, mas a tira de papel sobre a aguada clara repete o problema de hoje. Precisa das bordas de cima e de baixo em nanquim (1.4) para destacar. É a mais leve e aérea, e a mais fraca em contraste de massa.
- **Animação:** a entrada é a tira desdobrando com `scaleX` de 0 a 1 a partir do nó, em 0.5 s `power3.out`. O vento gira a tira 0.4° por unidade de vento a partir do nó, e as fitas giram 2.5° por unidade (com alternativa de skew em CSS). Bom acompanhamento, porque as fitas atrasam em relação à tira.
- **Celular:** 176 × 150, texto 1.4rem.
- **Desenho** (viewBox `0 0 220 190`):
```ts
paperStrip: (seed: number): Stroke[] => [
  stroke([[8, 184], [50, 186]], 10, { tone: 'mist', filter: 'wash', seed: seed + 1 }),
  stroke([[28, 28], [30, 184]], 5, { seed, start: 0.02, end: 0.05 }),
  stroke([[40, 58], [120, 55], [200, 59]], 44, { tone: 'paper', filter: 'none', seed: seed + 2, start: 0.02, end: 0.02 }),
  stroke([[38, 36], [120, 34], [202, 37]], 1.4, { seed: seed + 3, start: 0.02, end: 0.1 }),
  stroke([[38, 80], [120, 78], [198, 82]], 1.4, { seed: seed + 4, start: 0.1, end: 0.02 }),
  stroke([[26, 52], [42, 50], [30, 64], [44, 66]], 1.2, { seed: seed + 5 }),              // tie
],
paperStripTails: (seed: number): Stroke[] => [                                             // own layer, pivot (30, 62)
  stroke([[30, 62], [22, 90], [30, 112]], 3, { tone: 'soft', filter: 'none', seed, start: 0.05, end: 0.7 }),
  stroke([[31, 62], [40, 92], [36, 118]], 2.4, { tone: 'soft', filter: 'none', seed: seed + 1, start: 0.05, end: 0.7 }),
],
```

### Recomendação: A (noren)
- Tem a melhor leitura das três (texto claro sobre mancha escura funciona sobre qualquer montanha).
- O significado é verdadeiro: noren é a "loja aberta" na entrada.
- O vento fica rico e barato (abas como camadas HTML no compositor).
- A interação é encantadora: as abas se abrem no hover e dão peteleco quando o Borrão ou a Mel passam por baixo.
- O selo da direção B entra no noren como ícone, então a ideia do carimbo continua.

---

## 2. "O caminho de um projeto"

### Onde entra
Hoje o processo vem logo depois do herói, antes de qualquer prova de trabalho. Proponho mover para **entre "sobre/casa" e "correio"**:

hero → varal/destaques → estante → ateliê/repos → ano → sobre/casa → **processo** → correio → fim → mesinha.

É o funil clássico: primeiro a prova (projetos, código, constância), depois quem eu sou, depois **como trabalharíamos juntos**, e aí o recado. O processo vira a ponte para o contato.

Em `buildWorld`, trocar o bloco atual (as linhas `stations.processo` e `stations.process`, que hoje vêm depois do herói) por este, logo depois de `stations.house`:
```ts
stations.processo = x;
place(signs.processo, x, { top: `${ground - 190}px` });
x += 240;

const stepWidth = mobile ? 230 : 280;
const scrollHeight = Math.min(ground - topbar - 70, mobile ? 330 : 380);
const scrollWidth = stepWidth * 4 + 120;
stations.process = x;
place(process, x, { top: `${ground - scrollHeight - 8}px`, width: `${scrollWidth}px`, height: `${scrollHeight}px` });
process.style.setProperty('--step-width', `${stepWidth}px`);
x += scrollWidth + viewport * 0.25;
// then stations.mail …
```
Na lista `rocks`, trocar `stations.processo - viewport * 0.1` por `stations.mail - 120` (já existe) e incluir `stations.processo - 90`. Assim o pulo do Borrão acontece antes do noren.

### Direção A: "Um desenho em quatro tempos", rolo emaki com 4 janelas circulares (recomendada)
**Ideia:**
- Um rolo horizontal de papel que **a Mel vai empurrando com o focinho** enquanto o visitante rola.
- Dentro, 4 círculos de ensō, como os círculos de Shūbun num mesmo rolo, mostram **o mesmo desenho em quatro tempos**.
- O tema é um site-paisagem: uma janela de navegador com montanha e sol em sumi-e.
- Ele junta os dois ofícios do André numa imagem só e fecha com o selo da assinatura.

| Passo | Etapa do desenho | O que aparece no círculo |
|---|---|---|
| 1. Conversa | papel em branco e a ideia | Só os cantos da janela em `mist` e dois balõezinhos de fala (um `wash`, um `soft`) com "…" |
| 2. Esboço | rascunho | Janela, montanha, sol e linhas de layout, tudo em `mist`, solto |
| 3. Construção | linha firme | O rascunho fica por baixo, e por cima vem a linha de nanquim firme: moldura, barra do navegador com 3 pontinhos, montanha, sol, `</>` |
| 4. Entrega | aguada + selo | A linha recebe aguada na montanha, céu em `mist` e o **selo** "AL" carimbado |

**Composição do rolo:**
- **Papel:** um `div` com fundo `--paper`, com linhas `wash` de 1.4 em cima e embaixo (como `scrollRods`) e uma sombra `mist` com `filter: wash` (estática).
- **Bastão de início (jiku):** à esquerda, fixo.
- **Rolo:** à direita, um cilindro vertical em `wash` com contorno de tinta e listras de papel que deslizam para simular o giro. Ele se move.
- **Passos:** cada um tem `--step-width`. O círculo tem 150 px de diâmetro (130 no celular), centrado. Embaixo vem o número em `--wash` e display, o título em display 1.1rem e o texto em 0.85rem. Os textos atuais de `process.*` cabem.
- **HTML semântico:** `<h2>` com `process.title` e um `<ol>` de 4 `<li>`. Os SVGs dos círculos levam `aria-hidden`.

**Coreografia (amarrada à rolagem do mundo):**
1. **Empurrar.** No `onUpdate` do `ScrollTrigger` em `world.ts`:
   ```ts
   const rollScreenX = world.viewport * 0.78;              // ahead of the characters, so the open part is readable
   const reach = offset + rollScreenX - world.stations.process - 60;
   unrolled = reduced ? paperWidth : Math.max(unrolled, Math.min(paperWidth, reach)); // never re-rolls
   setRollX(60 + unrolled);                                 // gsap.quickSetter(roll, 'x', 'px')
   paper.style.clipPath = `inset(0 ${(paperWidth - unrolled).toFixed(0)}px 0 0)`;
   rollStripes.style.transform = `translateX(${(-unrolled % 12).toFixed(1)}px)`; // fake spin
   ```
   O rolo fica a 78% da tela, então a parte aberta (de 0 a 78%) é lida com folga. Ele nunca volta a enrolar, e uma vez aberto fica aberto.
2. **A Mel empurra.** Enquanto o rolo anda, a Mel sai da formação: `mel.drive(rollScreenX - 18, speed)`, em estado "empurrar" (pescoço +20°, cabeça baixa, andando, rabo alto abanando). O Borrão segue atrás normalmente. Quando o rolo chega ao fim, ela dá um empurrão final com antecipação (recua 6 px e empurra em 0.25 s `power2.out`), senta e olha para o selo.
3. **Cada círculo nasce** quando o rolo passa do centro dele mais 40 px (uma vez só):
   - `renderScene(svg, processStages[i], { animate: true, pace: 1.3 })` desenha o ensō primeiro (cerca de 0.6 s) e depois o conteúdo;
   - texto: `gsap.fromTo(label, { autoAlpha: 0, y: 10 }, { autoAlpha: 1, y: 0, duration: 0.5, ease: 'power2.out', delay: 0.35 })`;
   - som `sounds.paper()`.
4. **Selo (passo 4)**, quando termina o desenho:
   - `gsap.fromTo(seal, { scale: 1.6, autoAlpha: 0 }, { scale: 1, autoAlpha: 1, duration: 0.22, ease: 'power4.in' })`;
   - tremidinha do papel: `gsap.fromTo(paper, { y: 0 }, { y: 1.5, duration: 0.05, yoyo: true, repeat: 3, ease: 'none' })`;
   - `sounds.pop()`, e o Borrão fala `{ pt: 'pronto, assinado!', en: 'done, signed!' }`.
5. **Celular:** a mesma mecânica. A soma de 4 × 230 + 120 dá 1040 px de rolo, cerca de 3 telas. Cada passo cabe inteiro numa tela.
6. **Movimento reduzido:** o rolo já começa aberto (com o rolo no fim), os 4 círculos vêm desenhados de forma estática com o selo, a Mel fica sentada ao lado e não há empurrão, carimbo nem tremida.

**Desenho** (cada círculo em viewBox `0 0 160 160`, centro (80, 80); a janela vai de (34, 44) a (126, 114)):
```ts
const enso = (seed: number) =>
  stroke(ellipsePoints(80, 80, 66, 64, { from: -0.9, sweep: 5.7, count: 22, seed }), 6, { seed, dry: true, start: 0.05, end: 0.5 });
const mistOf = (items: Stroke[]) => items.map((item) => ({ ...item, tone: 'mist' as const, width: Math.min(item.width, 1.6) }));

const sketch: Stroke[] = [
  ...roughRect(34, 44, 92, 70, 1.4, 2911).map((item) => ({ ...item, tone: 'mist' as const })),
  stroke([[40, 104], [62, 78], [74, 90], [90, 70], [120, 104]], 1.6, { tone: 'mist', seed: 2912 }),
  stroke(ellipsePoints(104, 62, 7, 7, { seed: 2913, count: 10 }), 1.4, { tone: 'mist', seed: 2913 }),
  stroke([[44, 62], [70, 62]], 1.2, { tone: 'mist', seed: 2914 }),
  stroke([[44, 68], [62, 68]], 1.2, { tone: 'mist', seed: 2915 }),
];
const line: Stroke[] = [
  ...roughRect(34, 44, 92, 70, 1.9, 2921),
  stroke([[34, 54], [126, 53]], 1.4, { seed: 2922 }),
  ...[40, 45, 50].map((x, i) => stroke([[x, 49], [x + 0.6, 49.3]], 2, { seed: 2923 + i })),
  stroke([[40, 104], [62, 78], [74, 90], [90, 70], [120, 104]], 2.4, { seed: 2926, start: 0.03, end: 0.2 }),
  stroke(ellipsePoints(104, 62, 7, 7, { seed: 2927, count: 10 }), 1.6, { seed: 2927, start: 0.02, end: 0.05 }),
  stroke([[112, 100], [108, 104], [112, 108]], 1.2, { seed: 2928 }), // </>
  stroke([[118, 98], [115, 110]], 1.2, { seed: 2929 }),
  stroke([[121, 100], [125, 104], [121, 108]], 1.2, { seed: 2930 }),
];

export const processStages: Stroke[][] = [
  [ // 1 · Conversa
    enso(2901),
    ...[[[34, 52], [34, 44], [44, 44]], [[116, 44], [126, 44], [126, 52]], [[126, 106], [126, 114], [116, 114]], [[44, 114], [34, 114], [34, 106]]]
      .map((points, i) => stroke(points as Point[], 1.4, { tone: 'mist', seed: 2902 + i })),
    stroke(ellipsePoints(62, 80, 12, 9, { seed: 2906, count: 12 }), 2, { tone: 'wash', seed: 2906, start: 0.02, end: 0.05 }),
    stroke([[56, 88], [51, 96]], 2, { tone: 'wash', seed: 2907 }),
    stroke(ellipsePoints(97, 75, 14, 10, { seed: 2908, count: 12 }), 2, { tone: 'soft', seed: 2908, start: 0.02, end: 0.05 }),
    stroke([[103, 84], [109, 92]], 2, { tone: 'soft', seed: 2909 }),
    ...[57, 62, 67].map((x, i) => stroke([[x, 80], [x + 0.6, 80.3]], 2.2, { seed: 2910 + i * 0.1 })),
  ],
  [enso(2941), ...sketch],                                   // 2 · Esboço
  [enso(2951), ...mistOf(sketch), ...line],                  // 3 · Construção
  [ // 4 · Entrega
    enso(2961),
    stroke([[38, 66], [122, 64]], 18, { tone: 'mist', filter: 'wash', seed: 2962 }),
    stroke([[44, 104], [64, 84], [76, 94], [90, 78], [116, 104]], 14, { tone: 'wash', filter: 'wash', seed: 2963, start: 0.05, end: 0.1 }),
    ...line,
  ],
];
/** Stamped last, in its own <svg> so GSAP can scale it: reuse decorations.seal (44×44 box) at 0.5 scale, placed at (104, 104). */
```
Os filtros `wash` e `dry` aqui são aceitáveis, porque os círculos ficam estáticos depois de desenhados. São 4 cenas pequenas e o `renderScene` já agrupa os traços por filtro.

### Direção B: a travessia do rio
**Ideia:** um rio de aguada corta o caminho, e 4 pedras chatas são os 4 passos. O Borrão e a Mel atravessam pulando de pedra em pedra.

- **Desenho:**
  - Rio: `stroke` largo em `wash` com `filter: 'wash'`, estático.
  - Pedras: a `worldProps.rock` existente, só que mais chata.
  - Número de cada passo pintado na pedra.
  - Texto numa tira de papel fincada ao lado de cada pedra.
- **Coreografia:**
  - As 4 pedras entram em `world.rocks`, então o pulo existente dispara sozinho (`mascot.hop(380)`), e a Mel pula 120 ms depois.
  - Cada pouso solta 3 gotículas e uma onda (elipse `mist` que escala de 0.4 a 1.6 com opacidade de 0.6 a 0, em 0.8 s `power2.out`).
  - A tira do passo se desenrola quando eles pousam na pedra.
- **Vantagens:** é a mais "jogo", e a metáfora "atravessar com segurança, um passo de cada vez" é boa para cliente.
- **Limites:** o texto fica pequeno perto do chão, e o vínculo com o ofício (desenho e código) é mais fraco que na A.

### Recomendação: A
- É a que mais tem a cara do André: o próprio desenho mostra o processo, e o processo é desenhar.
- É memorável (a Mel empurrando o rolo).
- Usa a rolagem lateral como gesto físico de desenrolar o emaki.
- Termina no selo, que rima com o ensō do fim do mundo.
- Da B, dá para aproveitar uma pedrinha antes do rolo, para o Borrão pular ao chegar.

---

## 3. Perguntas para o André
1. Noren em cinza escuro (`soft`) ou em tinta cheia (`ink`)? O cinza é mais leve; a tinta tem mais impacto.
2. Os glifos dos selos (pegadas, pregador, livro, pincel, Borrão) estão bons, ou você quer desenhar os seus à mão?
3. Mover o processo para logo antes do correio, como ponte para o contato, faz sentido para você?
4. O desenho dos 4 tempos é o "site-paisagem", ou prefere outro tema (um retrato da Mel, a casa, o Borrão)?
5. Topa a Mel empurrar o rolo (e ir na frente do Borrão só nesse trecho)?
6. A placa "como eu trabalho" continua antes do rolo? E o processo ganha um marco na barra de progresso e na navegação?
7. O selo da Entrega leva "AL" (como `decorations.seal`) ou o seu carimbo de verdade, se você tiver um?
