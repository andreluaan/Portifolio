# Restyle: botões de tinta e parallax de paisagem

Proposta de direção de arte. Nada aqui foi aplicado no código ainda. Quando algo for inferência minha (e não um fato da fonte), está marcado com **[inferência]**.

---

## 0. O que encontrei no código (o ponto de partida)

- `frameElement` (`src/lib/brush.ts`) desenha uma moldura de 4 traços com `roughRect`. Esses traços não definem `filter`, então `filterFor` cai no padrão `bleed`, e cada botão ganha um grupo filtrado. O blot é um `<path filter="url(#bleed)">` dentro de `g.blot`, e esse grupo anima `transform: scale()` por transição CSS.
  - **Problema de custo [inferência, comportamento conhecido do Chromium/WebKit]:** um elemento SVG filtrado que muda de escala dentro do próprio SVG não vira camada de compositor. O filtro (turbulência + deslocamento) roda de novo a cada quadro da transição. Com dois ou três botões na tela, isso explica parte do engasgo no hover em celular.
  - Em escala, o blot é só uma elipse que cresce. A borda não "anda" como tinta que se espalha.
- Na `.world-nav`, o sublinhado é um `::after` com `filter: url(#bleed)` animando `scaleX`. É o mesmo custo, e o `scaleX` ainda achata as pontas afinadas do traço.
- `.secrets-toggle` usa uma borda CSS sólida de 1,5px. É o único elemento "de régua" na barra do topo.
- No parallax (`drawLayers`, em `world.ts`) há 4 planos: `far` com `ridge` mais aguada `mist`, `mid` com `ridge` mais aguada `wash`, `ground` e `front`. Os fatores são 0.22, 0.5, 1 e 1.35. Os dois cumes têm o mesmo vocabulário (linha mais faixa de aguada) e só mudam de tom. Faltam três coisas: (1) o **branco do papel** separando os planos (as faixas de névoa), (2) um plano realmente dissolvido no fundo e (3) objetos que deem escala (pinheiros, árvores, rochas médias).
- O `--wind` só é recalculado dentro de `onUpdate`. Quando a rolagem para, ele não volta a zero de forma suave, porque depende do último update do scrub.

---

## 1. Referências (verificadas)

| # | Obra / fonte | Link | O que ensina para este caso |
|---|---|---|---|
| 1 | **Guo Xi, *Old Trees, Level Distance*** (c. 1080, Met 1981.276) | [Wikipedia](https://en.wikipedia.org/wiki/Old_Trees,_Level_Distance) (a página do Met devolveu 429 e não consegui abrir; a ficha existe em metmuseum.org/art/collection/search/39668, não verificada por mim) | É um rolo horizontal de 8,5 m que se lê andando, como o nosso mundo de papel. Árvores altas no primeiro plano, vale largo atrás, montanhas "borradas para representar névoa". **Lição:** o primeiro plano é escuro e detalhado, o fundo é desfocado e claro, e a névoa engrossa conforme a cena avança. Isso dá para usar como dramaturgia de rolagem: a névoa fica mais densa perto da casa e do fim. |
| 2 | **As três distâncias de Guo Xi** (*Linquan Gaozhi*) | [JAANUS / Columbia, verbete *sanen*](https://projects.mcah.columbia.edu/jaanus/record/sanen) | Alta distância: olhar a montanha de baixo. Profunda: da frente de uma montanha ver as outras atrás. Plana: de uma montanha ver colinas baixas ao lado. **Lição:** cada plano do parallax ganha um "modo". Os picos distantes são altos e verticais (alta distância). O meio é uma sequência de cristas sobrepostas (profunda). O chão é horizontal e calmo (plana). Hoje os dois cumes têm o mesmo desenho. |
| 3 | **Hasegawa Tōhaku, *Pinheiros* (Shōrin-zu byōbu)**, Tokyo National Museum, Tesouro Nacional | [Canon Tsuzuri (fac-símile feito para o TNM)](https://global.canon/en/tsuzuri/works/shorinzu/) e [Wikipedia](https://en.wikipedia.org/wiki/Sh%C5%8Drin-zu_by%C5%8Dbu) | Os pinheiros "surgem na névoa". Os de perto são traços curtos, fortes e secos; os de trás são longos, pálidos e molhados. **Lição:** a perspectiva atmosférica se faz trocando **o pincel** (seco e curto perto, molhado e longo longe), não só o tom. Vira regra de geração: `dry: true` e largura pequena no primeiro plano; filtro `wash`, traço longo e tom `mist` no fundo. |
| 4 | **Sesshū Tōyō, *Haboku sansui*** (1495), Tokyo National Museum | [Wikipedia](https://en.wikipedia.org/wiki/Haboku_sansui) | Tinta "partida": sem contornos fortes, a forma sai de aguadas mais claras e mais escuras. **Lição para os botões:** o blot do hover não é um retângulo cheio. É uma aguada escura sobre uma aguada clara ainda molhada. Para o parallax: os picos do fundo ficam sem contorno, só mancha. |
| 5 | **Cartoon Saloon, *Wolfwalkers*** | [Frame.io: Made in Frame](https://blog.frame.io/2021/05/03/made-in-frame-wolfwalkers/) | A construção a lápis e carvão fica visível no filme final. O mundo selvagem tem linhas "rudes, ousadas, amplas" e a cidade, linhas mais retas. **Lição:** dois vocabulários de traço com significado. Interface (botões, nav) com traço firme e quase reto; paisagem com traço solto. E a linha de construção pode aparecer de propósito (o foco é um traço de lápis em `--wash`). |
| 6 | ***Ori and the Blind Forest*** (Moon Studios / Airborn) | [Airborn Studios](https://airborn-studios.com/projects/ori) | "Um visual pictórico em camadas, com profundidade, que não parece chato como os jogos 2D costumam parecer", sem perder legibilidade para o jogo. **Lição:** muitos planos, mas o plano de ação (o nosso chão, com as estações) continua o mais contrastado. A paisagem nunca disputa com placas e botões. |
| 7 | **Raymond Schlitter, *Pixelblog 23: Parallax Scrolling*** | [slynyrd.com](https://www.slynyrd.com/blog/2019/11/12/pixelblog-23-parallax-scrolling) | O parallax só convence se a cena já tem profundidade parada. Camadas "equilibradas, sem ponto de interesse dominante" escondem repetições. Velocidades lentas demais tremem. **Lição:** nenhum pico ou árvore de fundo pode ser "o" foco, porque o foco é a estação. E o fator mínimo deve ficar perto de 0,08, não 0,02, para não tremer com o scrub. |
| 8 | **CodyHouse, *Ink Transition Effect*** | [codyhouse.co](https://codyhouse.co/gem/ink-transition-effect) | Uma mancha de tinta orgânica feita com sprite de 25 quadros PNG e `steps(24)` em `translateX`, sem vídeo, canvas nem filtro. **Lição:** é a técnica certa para o blot crescer com borda viva gastando quase nada. Aqui o sprite sai do próprio motor de pincel (gerado em runtime) e entra como `mask-image`. |
| 9 | **GSAP `quickTo`** | [gsap.com docs](https://gsap.com/docs/v3/GSAP/gsap.quickTo()) | Reaproveita um único tween e pula o parsing. **Lição:** é o que usar para a pincelada da nav que segue o item ativo e para o vento da grama. |
| 10 | **MDN: `will-change`** e **`mask-image`** | [will-change](https://developer.mozilla.org/en-US/docs/Web/CSS/will-change), [mask-image](https://developer.mozilla.org/en-US/docs/Web/CSS/mask-image) | `will-change` é "último recurso", e o uso excessivo gasta memória: ligar só nos planos que se movem. `mask-image` é Baseline desde dez/2023 e aceita SVG; a máscara precisa vir por http(s) ou data URL. **Lição:** dá para usar máscara de tinta pré-gerada em todos os botões sem prefixo. |

Fora da tabela: busquei estudos de caso de botões em sumi-e na Awwwards/FWA e não achei nenhum que pudesse confirmar. As páginas de botões do Codrops (2013 e 2015) existem, mas devolveram 403 no WebFetch, então não cito o conteúdo delas. Sobre *Hollow Knight*, *Gris* e *Okami*, só achei resenhas, sem fonte de desenvolvedor sobre as camadas. Não uso como base.

---

## 2. Direção de arte em uma linha

**"A interface é escrita com pincel firme; a paisagem é pintada com água."** Botões e nav usam tinta cheia, traço curto e seco e carimbo (hanko). A paisagem usa aguada, névoa e o branco do papel. Quanto mais longe, mais água e menos pincel.

Hierarquia de manchas (vale para a página inteira):

1. **Tinta cheia (`--ink`)**: só o que se clica ou se lê (botão primário, chão, Borrão, estações).
2. **Meio-tom (`--ink-soft` / `--wash`)**: colinas médias, árvores do meio, botão secundário em hover.
3. **Aguada clara (`--mist`)**: picos distantes, névoa, estado desabilitado.
4. **Papel (`--paper`)**: a faixa de névoa é papel pintado por cima. É o "vazio" que separa os planos e o que faz a paisagem respirar. Meta: **no mínimo 45% da altura acima do chão é papel limpo** em qualquer quadro.

---

## 3. Botões

### 3.1 Base técnica comum (substitui o blot filtrado)

**a) Formas com a irregularidade já na geometria.** O ruído entra no contorno em JS, uma vez só, e o filtro sai. Assim a forma fica estática e barata, e o movimento vem de `transform`, `opacity` ou da troca de quadro da máscara.

**b) Sprite de máscara gerado pelo motor (técnica CodyHouse adaptada).** N quadros (6 no celular, 8 no desktop) de um blot que cresce **de forma não uniforme**: começa como gota perto do ponto de entrada do cursor, ganha "dedos" de capilaridade e termina transbordando 2 a 3px da moldura. Tudo vai num SVG horizontal, convertido em data URL e usado como `mask-image` de um `<span class="ink-fill">` com fundo `--ink`. A animação troca `mask-position` com `steps(N-1)`.
- Custo: repinta só a área do botão, durante cerca de 0,4s, sem turbulência. **[inferência]** Bem mais barato que o `bleed` atual, que reprocessa ruído fractal a cada quadro.
- Como a máscara pertence ao botão (não ao documento), uma data URL por tamanho de botão resolve. Vale guardar em cache por `w×h`, que é o mesmo que o `frameSizes` já faz.

```ts
// brush.ts — organic blot outline with the bleed baked into the geometry (no SVG filter at runtime)
export function blotOutline(cx: number, cy: number, rx: number, ry: number, growth: number, seed: number): string {
  const random = seededRandom(seed);
  const lobes = Array.from({ length: 4 }, () => ({ k: 2 + Math.floor(random() * 5), phase: random() * Math.PI * 2, amp: 0.04 + random() * 0.07 }));
  // A few capillary "fingers" only appear late in the growth, like ink running along paper fibres.
  const fingers = Array.from({ length: 3 + Math.floor(random() * 3) }, () => ({ angle: random() * Math.PI * 2, reach: 0.12 + random() * 0.22 }));
  const steps = 72;
  const points: Point[] = [];
  for (let i = 0; i < steps; i++) {
    const angle = (i / steps) * Math.PI * 2;
    let r = 1;
    for (const lobe of lobes) r += Math.sin(angle * lobe.k + lobe.phase) * lobe.amp;
    for (const finger of fingers) {
      const distance = Math.abs(Math.atan2(Math.sin(angle - finger.angle), Math.cos(angle - finger.angle)));
      r += Math.max(0, 1 - distance / 0.18) * finger.reach * Math.max(0, growth - 0.6) * 2.5;
    }
    r += (random() - 0.5) * 0.03; // paper tooth
    points.push([cx + Math.cos(angle) * rx * r * growth, cy + Math.sin(angle) * ry * r * growth]);
  }
  return `M${points.map(([x, y]) => `${x.toFixed(1)} ${y.toFixed(1)}`).join('L')}Z`;
}

/** Builds a horizontal sprite of blot frames as an SVG data URL, used as a CSS mask stepped with steps(). */
export function blotSprite(w: number, h: number, frames: number, seed: number, origin: Point = [w * 0.3, h * 0.6]) {
  const paths: string[] = [];
  for (let f = 0; f < frames; f++) {
    const t = (f + 1) / frames;
    const growth = 0.15 + 1.05 * (1 - Math.pow(1 - t, 2.2)); // fast spread, slow soak (ease-out)
    // The blot centre walks from the entry point toward the middle so the flood feels poured, not scaled.
    const cx = origin[0] + (w / 2 - origin[0]) * t;
    const cy = origin[1] + (h / 2 - origin[1]) * t;
    const shape = blotOutline(cx, cy, w * 0.62, h * 0.9, growth, seed); // same seed every frame: edges evolve instead of jumping
    paths.push(`<g transform="translate(${f * w} 0)"><path d="${shape}"/></g>`);
  }
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${w * frames}" height="${h}" viewBox="0 0 ${w * frames} ${h}">${paths.join('')}</svg>`;
  return `url("data:image/svg+xml,${encodeURIComponent(svg)}")`;
}
```

Observação: usar a **mesma seed** em todos os quadros faz os lobos se manterem e só crescerem. Isso dá continuidade ("acompanhamento"). Com uma seed diferente por quadro, a borda ferve, o que serve para um estado de "erro".

**c) Moldura com dois traços, não quatro.** `roughRect` vira `inkFrame`. São dois traços longos, em L e em L invertido, que se cruzam e passam um pouco das quinas, com **uma abertura** pequena num canto (a "respiração" do ensō). Filtro `none`; a secura entra por geometria, com `dry: true` substituído por um "pente" de linhas `paper` finas sobre o terço final de cada traço:

```ts
// brush.ts — two-stroke hand frame; dry-brush tail baked as thin paper-tone streaks (no 'dry' filter)
export function inkFrame(x: number, y: number, w: number, h: number, width = 2, seed = 1): Stroke[] {
  const random = seededRandom(seed);
  const j = () => (random() - 0.5) * 2.4;
  const gap = 10 + random() * 14; // the breathing gap, always near the top-right corner
  const strokes: Stroke[] = [
    stroke([[x + w - gap, y + j()], [x + w * 0.5, y - 1 + j()], [x - 3, y + j()], [x + j(), y + h * 0.5], [x - 1 + j(), y + h + 3]], width, { seed: seed + 1, start: 0.04, end: 0.22, filter: 'none' }),
    stroke([[x - 4, y + h + j()], [x + w * 0.5, y + h + 1 + j()], [x + w + 2, y + h + j()], [x + w + j(), y + h * 0.5], [x + w + 1 + j(), y + gap * 0.4]], width * 1.15, { seed: seed + 2, start: 0.03, end: 0.3, filter: 'none' }),
  ];
  // Dry tail: 3 hairline paper streaks along the last third of the heavier stroke.
  for (let i = 0; i < 3; i++) {
    const offset = (i - 1) * width * 0.35;
    strokes.push(stroke([[x + w + offset, y + h * (0.55 - i * 0.05)], [x + w + offset + j() * 0.2, y + gap * 0.6]], 0.6, { tone: 'paper', seed: seed + 10 + i, start: 0.2, end: 0.6, filter: 'none' }));
  }
  return strokes;
}
```

**d) Carimbo (press) com GSAP só em `transform`.** É um tween curto, compartilhado por todos os botões e disparado no `pointerdown`. Também tem a "marca" do carimbo: um `::before` com o mesmo `mask-image` do último quadro, em `--wash` e com opacidade 0.35, que fica 1px deslocado e some.

### 3.2 Variante A: Primário, o "selo de tinta cheia" (`.ink-button.solid`)

Uso: CTA principal ("ver o varal", "abrir o caderno").

| Estado | Visual | Técnica |
|---|---|---|
| **Repouso** | Mancha de tinta cheia (último quadro do sprite, parada), texto `--paper`, ponta seca à direita (três riscos de papel) | `mask-position` no último quadro, sem animação |
| **Hover** | A tinta "bebe" o papel: a mancha recua para o quadro 70% e volta a 100% numa respiração. A seta `→` vira um **flick de pincel** (traço curto desenhado por dash) e anda 4px | `steps()` em `mask-position` (6 quadros, 0,32s); seta: `stroke-dashoffset` num `<path>` de 1 traço, sem filtro |
| **Foco (teclado)** | Um traço de "lápis de construção" em `--ink-soft` a 4px da mancha, desenhado em 0,35s, com a ponta passando da quina (como o Wolfwalkers deixa a construção à mostra) | `inkFrame` com `width: 1.2`, `tone: 'soft'`, revelado por `stroke-dashoffset` na máscara; mantém `outline: 2px solid transparent` para o modo de alto contraste do Windows |
| **Press** | Carimbo: afunda e "imprime" | `scale 0.94, y 1.5` em 0.07s `power3.in`, volta com `back.out(3)` em 0.38s; "marca" `::before` com opacidade 0.35 a 0 em 0.6s |
| **Desabilitado** | Vira aguada: a mancha em `--mist`, texto `--ink-soft`, sem seta, moldura em traço pontilhado seco | Troca a cor do `ink-fill` para `--mist`; `cursor: not-allowed`; `aria-disabled="true"` |

### 3.3 Variante B: Secundário, o "contorno com aguada" (`.ink-button`)

Uso: ações de apoio ("contato", "copiar e-mail", "limpar o céu").

| Estado | Visual | Técnica |
|---|---|---|
| **Repouso** | `inkFrame` (2 traços, abertura no canto), texto `--ink`, papel por dentro | SVG estático, **sem filtro** |
| **Hover** | Uma **pincelada horizontal de aguada** (`--mist`) entra da esquerda por baixo do texto, com a borda de saída afinando; o texto **continua `--ink`** (contraste: #151515 sobre #c6c8c4 dá cerca de 11:1). A moldura dá um "tremor" de 1px | Aguada pré-desenhada (um `brushPath` largo, `start: 0.02, end: 0.4`) revelada por `clip-path: inset(0 100% 0 0)` → `inset(0 0 0 0)` em 0,42s `cubic-bezier(.45,.05,.3,1)` (o mesmo easing do `ink-draw`). Tremor: `x: ±0.6` com yoyo, 2 ciclos, só na moldura |
| **Foco** | Igual ao primário (traço de construção) | idem |
| **Press** | Carimbo; a aguada escurece para `--wash` por 120ms (a tinta que o carimbo empurra para o papel) | GSAP `scale`/`y` + `opacity` de uma segunda aguada `--wash` empilhada |
| **Desabilitado** | Só a moldura em `--mist`, sem hover | |

### 3.4 Variante C: Ícone e navegação

**C1. Nav do topo (`.world-nav`)**, a "pincelada que segue"

- Sai o `::after` filtrado de cada botão. Entra **uma única pincelada** `.nav-brush` (SVG pré-gerado, um `brushPath` com `start: 0.04, end: 0.35`, ponta seca por geometria) posicionada absoluta na `nav`.
- **Hover**: a pincelada do item sob o cursor se desenha da esquerda para a direita com `clip-path: inset(0 100% 0 0 round 0)`, que preserva o afinamento das pontas (o `scaleX` atual achata).
- **Item ativo (`aria-current`)**: quando a estação muda, a pincelada **viaja** até o novo item com `quickTo` em `x` e `scaleX`:
  - Antecipação: recua 6px na direção oposta (0,08s, `power2.in`).
  - Estica no trajeto (`scaleX` 1,35, squash & stretch), chega com `elastic.out(1, 0.55)` em 0,6s e deixa um **pingo** de 4px no ponto de partida, que some em 0,5s (acompanhamento).
- Mobile: a nav rola na horizontal; a pincelada mora dentro da faixa que rola, então acompanha sem cálculo extra.

**C2. Botões-ícone redondos (som, idioma, segredos)**, o "hanko"

- Repouso: um anel de pincel (`ellipsePoints` com `sweep` 5,9, a abertura de ensō) com o ícone dentro. Para `秘` (segredos), o anel vira **carimbo quadrado** de cantos gastos, coerente com um passaporte. Sai a borda CSS de 1,5px.
- Hover: `rotate(-6deg) scale(1.06)` em 0,3s `back.out(2)`.
- Ligado (`aria-pressed="true"` / `aria-expanded="true"`): o carimbo **inverte** (preenchido `--ink`, ícone `--paper`), usando o mesmo sprite de blot com 4 quadros.
- Press: carimbo com a marca deslocada (3.1 d).
- Idioma `pt | en`: as duas sílabas ficam lado a lado e uma **gota** de tinta pula de uma para a outra (arco em `y` com `power1.out`/`power1.in`, 0,35s), em vez de sublinhado.

**C3. Objetos-botão do mundo (púlpito, livro, caixa de correio, mesinha)**

- Foco e hover desenham uma **sombra de aguada** sob o objeto: uma elipse `--mist` pré-desenhada que cresce de `scaleX 0.6, opacity 0` para `1, 0.8`. É só `transform`/`opacity`.
- Foco de teclado: um **ensō de lápis** (`ellipsePoints`, `tone: 'soft'`, `width: 1.4`) ao redor do objeto, desenhado em 0,5s. Hoje o objeto não tem foco visível próprio.
- Os "nudges" atuais continuam e ganham antecipação: 2px para o lado oposto antes do empurrão.

### 3.5 Movimento reduzido (todos os botões)

```css
@media (prefers-reduced-motion: reduce) {
  .ink-fill { animation: none !important; mask-position: var(--blot-last) !important; }
  .ink-button .wash-sweep { clip-path: none !important; transition: opacity 0.01s; }
  .nav-brush { transition: none !important; }
}
```

- No JS: `if (prefersReducedMotion())`, o carimbo vira só uma troca de `opacity` (0.85 → 1) e a pincelada da nav **salta** para o item ativo, sem viagem e sem pingo.
- Os estados continuam distintos por **cor e forma**, nunca só por movimento.

### 3.6 Coreografia do hover no primário (tempos)

```ts
// pointerenter: the ink is drunk by the paper, then soaks back (one breath)
gsap.timeline()
  .set(fill, { '--frame': 7 })
  .to(fill, { '--frame': 4, duration: 0.14, ease: 'steps(3)' })      // anticipation: recede
  .to(fill, { '--frame': 7, duration: 0.26, ease: 'steps(3)' })      // overshoot handled by last frame bleeding 2px out
  .fromTo(arrow, { strokeDashoffset: 1 }, { strokeDashoffset: 0, x: 4, duration: 0.3, ease: 'power3.out' }, 0.08);
// --frame drives mask-position via calc(var(--frame) * -100%) in CSS
```

---

## 4. Parallax: a paisagem em sete planos

### 4.1 Plano de camadas

| Plano | Fator | Conteúdo | Tom e pincel (perspectiva atmosférica) | Modo de Guo Xi |
|---|---|---|---|---|
| **P0 céu** | 0.04 | Papel, uma **lua de aguada** enorme (disco `mist` com opacidade 0.35, sem contorno), nuvens existentes | `mist` diluído, sem borda | — |
| **P1 picos distantes** | 0.10 | 3 a 5 picos **altos e verticais** dissolvidos na base, sem contorno, com 2 ou 3 "veios" verticais de aguada (cun simplificado) | `mist` 60% · filtro `wash` **baked** · traço longo e molhado | Alta distância |
| **P2 névoa A** | 0.14 + deriva | 2 faixas de **papel** pintadas sobre a base dos picos, mais 1 faixa `mist` fina | `paper` (o vazio pintado) | — |
| **P3 cordilheira e pinheiros distantes** | 0.28 | Crista média, mais **fileiras de pinheiros minúsculos** (5 a 7 toques de pincel cada) nas cristas | `wash` 70%, contorno 1px `mist`, toques curtos | Profunda |
| **P4 névoa B** | 0.40 + deriva | 1 faixa de papel larga e irregular cobrindo o pé da cordilheira | `paper` | — |
| **P5 colinas e árvores** | 0.62 | Colinas baixas, **árvores de tinta** a cada 600 a 900px (tronco seco, copa de toques), **rochas médias** | colina `wash` + contorno `soft` seco 2px · árvores `soft`/`ink` | Plana |
| **P6 chão** | 1.00 | O existente (estações, rochas, tufos) | `ink` cheio, contraste máximo | Plana |
| **P7 primeiro plano** | 1.45 | Capim alto e **um galho de pinheiro** que entra pela borda de cima em 2 ou 3 pontos da jornada (estilo Tōhaku: traço curto, forte, seco) | `ink`, **desfocado** (pré-renderizado), opacidade 0.9 | — |

Regras gerais:
- **O tom sobe com a distância** (mais longe = mais claro e mais água). Larguras: P1 com traços de 60 a 120px; P3 de 6 a 30px; P5 de 2 a 14px; P6 de 2 a 6px; P7 de 7 a 18px.
- **O contorno some com a distância**: P1 sem contorno, P3 contorno `mist`, P5 contorno `soft`, P6 contorno `ink`.
- **A névoa separa os planos com papel**, não com cinza. É o que falta hoje: entre `far` e `mid` não há branco, e por isso os planos grudam.
- **Densidade dramatúrgica** (Guo Xi, rolo 1): a névoa P2/P4 fica 30% mais alta perto de `house` e `end`. O mundo vai "outonando" para o fim. Isso dá para fazer com a altura da faixa variando com `x`.
- **Sem ponto dominante** (Schlitter): nenhum pico mais alto que 1,3 vez a média, e nenhuma árvore de P5 exatamente atrás de uma placa de estação (deslocar se `|x·fator - estaçãoX·fator| < 120`).

### 4.2 Geradores no formato do `scenes.ts`

```ts
// scenes.ts — landscape generators. All return plain Stroke[] so they bake into one bitmap per plane.

/** Tall "high distance" peaks: steep sides, no outline, washed base that dissolves into mist. */
export function farPeaks(width: number, height: number, seed = 1): Stroke[] {
  const random = seededRandom(seed);
  const strokes: Stroke[] = [];
  const count = Math.max(3, Math.round(width / 520));
  for (let i = 0; i < count; i++) {
    const cx = ((i + 0.3 + random() * 0.4) / count) * width;
    const top = height * (0.18 + random() * 0.14);
    const base = height * 0.62;
    const half = 120 + random() * 160;
    // Body: one wide wet stroke climbing the peak, so the mass reads as wash, not line.
    strokes.push(stroke([[cx - half, base], [cx - half * 0.35, top + 60], [cx, top], [cx + half * 0.3, top + 50], [cx + half, base]], 70 + random() * 50, { tone: 'mist', filter: 'wash', seed: seed + i * 10, start: 0.02, end: 0.02, wobble: 0.5 }));
    // Two or three vertical "texture" veins in a darker wash, short and wet.
    for (let v = 0; v < 2 + Math.floor(random() * 2); v++) {
      const vx = cx + (random() - 0.5) * half * 0.8;
      strokes.push(stroke([[vx, top + 40 + random() * 40], [vx + (random() - 0.5) * 20, base - 40]], 6 + random() * 8, { tone: 'wash', filter: 'wash', seed: seed + i * 10 + v + 1, start: 0.1, end: 0.6 }));
    }
  }
  return strokes;
}

/** A band of mist painted in paper tone over the plane behind: the "empty" that separates distances. */
export function mistBand(width: number, y: number, thickness: number, seed = 1): Stroke[] {
  const random = seededRandom(seed);
  const points: Point[] = [];
  for (let x = -80; x <= width + 80; x += 220) points.push([x, y + (random() - 0.5) * thickness * 0.5]);
  return [
    stroke(points, thickness, { tone: 'paper', filter: 'wash', seed, start: 0.01, end: 0.01, wobble: 0.6 }),
    stroke(points.map(([x, py]) => [x + 40, py - thickness * 0.45] as Point), thickness * 0.18, { tone: 'mist', filter: 'wash', seed: seed + 1, start: 0.05, end: 0.05 }),
  ];
}

/** Distant pine: 5–7 short dabs stacked on a hairline trunk (Tōhaku's far pines: pale, few touches). */
export function distantPine(x: number, baseY: number, size: number, seed = 1, tone: Stroke['tone'] = 'wash'): Stroke[] {
  const random = seededRandom(seed);
  const strokes: Stroke[] = [stroke([[x, baseY], [x + (random() - 0.5) * 2, baseY - size]], Math.max(1, size * 0.05), { tone, filter: 'none', seed, start: 0.05, end: 0.3 })];
  const tiers = 5 + Math.floor(random() * 3);
  for (let t = 0; t < tiers; t++) {
    const ty = baseY - size * (0.25 + (t / tiers) * 0.75);
    const span = size * 0.32 * (1 - t / tiers) + size * 0.06;
    strokes.push(stroke([[x - span, ty + span * 0.25], [x, ty - span * 0.1], [x + span, ty + span * 0.2]], size * 0.11, { tone, filter: 'none', seed: seed + t + 1, start: 0.1, end: 0.5 }));
  }
  return strokes;
}

/** Row of pines along a ridge polyline, thinned so they never form a fence. */
export function pinesOnRidge(ridgePoints: Point[], every: number, seed = 1): Stroke[] {
  const random = seededRandom(seed);
  const strokes: Stroke[] = [];
  const line = densify(ridgePoints, every);
  line.forEach(([x, y], i) => {
    if (random() < 0.45) return; // gaps let the mist through
    strokes.push(...distantPine(x + (random() - 0.5) * every * 0.6, y + 4, 14 + random() * 18, seed + i * 9));
  });
  return strokes;
}

/** Mid-ground ink tree: dry leaning trunk, two branches, clustered leaf dabs (wet, soft). */
export function inkTree(seed = 1, height = 160): Stroke[] {
  const random = seededRandom(seed);
  const lean = (random() - 0.5) * 30;
  const trunk: Point[] = [[0, 0], [lean * 0.3, -height * 0.4], [lean, -height * 0.85]];
  const strokes: Stroke[] = [stroke(trunk, 7, { tone: 'soft', dry: true, seed, start: 0.02, end: 0.5 })];
  const branches: Point[][] = [
    [[lean * 0.3, -height * 0.45], [lean * 0.3 - 40, -height * 0.6], [lean * 0.3 - 62, -height * 0.58]],
    [[lean * 0.7, -height * 0.7], [lean + 34, -height * 0.82], [lean + 58, -height * 0.78]],
  ];
  branches.forEach((points, b) => strokes.push(stroke(points, 3, { tone: 'soft', dry: true, seed: seed + 10 + b, start: 0.05, end: 0.7 })));
  // Leaf clusters: horizontal dabs, darker at the centre of each cluster.
  const clusters: Point[] = [[lean, -height * 0.9], branches[0][2], branches[1][2]];
  clusters.forEach(([cx, cy], c) => {
    for (let d = 0; d < 7; d++) {
      const dx = cx + (random() - 0.5) * 50;
      const dy = cy + (random() - 0.5) * 22;
      const tone = d < 2 ? 'ink' : 'soft';
      strokes.push(stroke([[dx - 9, dy + 2], [dx, dy - 1], [dx + 10, dy + 1]], 6 + random() * 5, { tone, filter: 'bleed', seed: seed + 30 + c * 10 + d, start: 0.2, end: 0.4 }));
    }
  });
  return strokes;
}

/** Foreground pine branch hanging from the top edge (blurred at bake time). */
export function foregroundBranch(seed = 1, length = 420): Stroke[] {
  const random = seededRandom(seed);
  const spine: Point[] = [[-20, -10], [length * 0.35, 40], [length * 0.7, 70], [length, 64]];
  const strokes: Stroke[] = [stroke(spine, 16, { tone: 'ink', filter: 'none', seed, start: 0.01, end: 0.6 })];
  densify(spine, 34).forEach(([x, y], i) => {
    if (i < 2) return;
    // Needle bursts: short, hard, dry strokes fanning down — the near pines of Shōrin-zu.
    for (let n = 0; n < 5; n++) {
      const angle = Math.PI * (0.25 + random() * 0.5);
      const reach = 26 + random() * 22;
      strokes.push(stroke([[x, y], [x + Math.cos(angle) * reach, y + Math.sin(angle) * reach]], 2.6, { tone: 'ink', filter: 'none', seed: seed + i * 7 + n, start: 0.05, end: 0.8 }));
    }
  });
  return strokes;
}
```

As rochas médias de P5 reaproveitam `worldProps.rock` com escala 1,6 e tom `soft`.

Exemplo de `drawLayers` com os planos novos (resumo):

```ts
const PARALLAX = { sky: 0.04, peaks: 0.10, mistA: 0.14, ridge: 0.28, mistB: 0.40, hills: 0.62, ground: 1, front: 1.45 };

// P1 + P2 bake into one bitmap: peaks, then paper mist over their feet.
bakePlane(layers.peaks, farWidth, height, [
  ...farPeaks(farWidth, height, 3),
  ...mistBand(farWidth, height * 0.6, 90, 301),
  ...mistBand(farWidth, height * 0.66, 50, 311),
], { scale: 0.5 });
```

### 4.3 Movimento sutil (coreografia)

- **Deriva da névoa**: as faixas P2 e P4 são **elementos próprios** (uma tira de bitmap de 1,5 viewport de largura, repetida duas vezes lado a lado) com animação CSS `translateX(0 → -50%)` linear, 90s (P2) e 60s (P4), dentro do plano que já faz parallax. A névoa anda mesmo com a página parada. Para a borda da faixa "respirar", um `scaleY` de 0.94 a 1.06 em 14s `ease-in-out` alternado.
- **Grama e galho com o vento**: o `skewX` vai no **plano P7 inteiro**, com `transform-origin: 50% 100%`, junto com o `x` do parallax num único setter. Enquanto a rolagem acontece, o topo das hastes fica para trás (arrasto). Quando a rolagem para, volta com mola (acompanhamento):
  ```ts
  const frontSkew = gsap.quickTo(layers.front, 'skewX', { duration: 0.9, ease: 'elastic.out(1, 0.35)' });
  // in onUpdate:
  frontSkew(gsap.utils.clamp(-6, 6, -velocity / 400));
  // decay when scrolling stops (onUpdate stops firing):
  ScrollTrigger.addEventListener('scrollEnd', () => frontSkew(0));
  ```
  O galho de cima usa `transform-origin: 0 0` (pendura) e recebe metade do skew, com sinal invertido. É um elemento separado dentro de P7.
  O mesmo `scrollEnd` resolve o `--wind` que hoje não volta a zero.
- **Pássaros**: um bando de 3 a 5 a cada 25 a 40s (aleatório), não em loop constante. Cada pássaro tem **2 quadros** (asa alta e asa baixa) alternados por `steps(1)` em `opacity`, 0,28s por ciclo e com fase diferente por pássaro. A trajetória é um arco leve (`y` com `sine.inOut`). Ficam no P0/P1 (pequenos, `wash`), nunca no P5, para não competir com as estações.
- **Lua**: só parallax (0.04). Sem movimento próprio. É o ponto de silêncio.
- **Revelação ao chegar** (opcional e ambicioso): as árvores de P5 perto de cada estação são desenhadas com `renderScene(animate: true)` na primeira vez que a estação é revelada, ligadas ao `reveals[name]` que já existe. Só essas, porque desenhar planos inteiros sairia caro.

**Movimento reduzido**: sem deriva (névoa parada), sem skew, pássaros parados como desenho no céu (2 ou 3, posições fixas), parallax mantido com `scrub: true` como hoje (é deslocamento ligado à ação do usuário). Para ir além, colapsar os fatores para 2 valores (0.3 e 1) e reduzir a sensação de profundidade.

### 4.4 Desempenho no celular

1. **Pré-renderizar P0 a P5 em bitmap uma vez** (no `setup()`, e de novo só no resize de largura):
   ```ts
   /** Rasterises a stroke list once; filters run a single time here instead of on every paint. */
   async function bakePlane(host: HTMLElement, width: number, height: number, strokes: Stroke[], { scale = 1 } = {}) {
     const svg = svgElement('svg', { xmlns: SVG_NS, width, height, viewBox: `0 0 ${width} ${height}` });
     svg.append(document.querySelector('#bleed')!.parentElement!.cloneNode(true)); // the filter defs travel with it
     renderScene(svg, strokes);
     const blob = new Blob([new XMLSerializer().serializeToString(svg)], { type: 'image/svg+xml' });
     const bitmap = await createImageBitmap(await loadImage(URL.createObjectURL(blob)), { resizeWidth: Math.round(width * scale), resizeHeight: Math.round(height * scale) });
     const canvas = host.querySelector('canvas') ?? host.appendChild(document.createElement('canvas'));
     canvas.width = bitmap.width; canvas.height = bitmap.height;
     canvas.getContext('2d')!.drawImage(bitmap, 0, 0);
     canvas.style.width = `${width}px`; canvas.style.height = `${height}px`;
   }
   ```
   - **Planos de aguada em meia resolução** (`scale: 0.5`, ignorando o DPR): o conteúdo já é difuso, a perda não aparece e a memória cai 4x **[inferência]**. P5 em `scale: 1` (DPR 1); P6 continua SVG vivo (tem estações, rochas e hover).
   - **Largura máxima do canvas**: o mundo pode passar de 10 000px. Se `width * scale > 8192`, dividir em **tiles de 4096px** (vários canvases lado a lado no mesmo plano). Isso fica dentro dos limites de textura dos celulares.
   - P7 desfocado: na hora de assar, `ctx.filter = 'blur(2.5px)'` antes do `drawImage`, uma vez só. Sem `filter` CSS em tempo real.
   - Fallback: se `createImageBitmap` falhar (Safari antigo), o plano fica no SVG atual.
2. **Agrupar planos que andam quase juntos.** No celular (`viewport < 700`) são 5 planos compostos: céu+picos+névoa A (0.10, um bitmap só), cordilheira+névoa B (0.30), colinas (0.62), chão (1), frente (1.45). A deriva da névoa continua como elemento filho do plano.
3. **`will-change: transform` só nos planos** (5 a 7 elementos), como já está em `.mundo-layer`. Nunca nos filhos. As tiras de névoa animadas por CSS são promovidas sozinhas durante a animação, conforme o MDN.
4. **Altura dos planos**: P1 a P4 só ocupam do topo até `ground` (o chão cobre o resto). Assim os canvases ficam 30% a 40% menores.
5. **Contagem de nós**: depois de assados, P0 a P5 viram um canvas cada (zero nós SVG). Hoje o `far` e o `mid` mantêm grupos filtrados vivos.
6. **Orçamento**: no celular, até 7 camadas compostas visíveis (5 planos + 2 tiras de névoa) e 0 filtros SVG avaliados por quadro na rolagem.

---

## 5. Sugestões extras

1. **Easter egg "tinta derramada"**: clicar 7 vezes rápido no botão primário faz o blot passar do botão (o último quadro do sprite vai até 3x) e pingar no chão do mundo. A gota fica lá como mancha permanente da sessão e entra para o passaporte de segredos.
2. **O Borrão e a névoa**: quando o Borrão atravessa uma faixa de névoa no mundo (P4 cruza a altura dele perto da mesinha), ele "some" pela metade por 0,5s (uma máscara de gradiente nele mesmo, sem filtro). É personalidade sem mexer na física.
3. **Hora do dia pela lua**: a posição da lua (P0) segue a hora local do visitante (manhã à esquerda, noite à direita). À noite, as faixas de névoa ficam 10% mais escuras (`--mist` no lugar de `--paper`). Continua só em neutros.
4. **Selo de assinatura no fim**: o ensō do `end` ganha, no foco, o mesmo "carimbo" dos botões. Fecha o vocabulário.

## 6. Perguntas para o André

1. **Galho de pinheiro no primeiro plano**: pode entrar pela borda de cima e cobrir um pouco do céu, ou você prefere o céu sempre limpo?
2. **Lua de aguada**: entra? É o maior "vazio cheio" da composição e mudaria bastante a cara do hero.
3. **Botões com a abertura de ensō** (moldura que não fecha num canto): combina com você, ou prefere moldura fechada?
4. **Carimbo do segredo (`秘`)**: quadrado (hanko de passaporte) ou redondo?
5. **Névoa mais densa perto do fim**: topa a ideia de o mundo ir ficando mais enevoado (mais "outono") conforme a pessoa avança?
6. **Ilustrações suas**: quer desenhar à mão os picos do P1 e o galho do P7 (eu vetorizo e entram como bitmap no mesmo pipeline) ou deixo procedural?
