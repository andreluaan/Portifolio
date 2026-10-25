# Mel, a cachorrinha do André: direção de arte, rig e animação

> Respostas do André já incorporadas: o nome dela é **Mel**. Ela **convive com o Borrão** no mundo de papel: andam juntos com a rolagem lateral e interagem (seção 7b). A escala foi calibrada ao lado da caixa de 64×64 dele (seção 4).

> Proposta do diretor de arte. Nenhum arquivo do projeto foi editado. Os números de pose são **valores iniciais** para ajustar no protótipo (há um gancho `preview(state)` sugerido para isso).

---

## 1. Referências verificadas

| # | Obra / fonte | Link | O que ensina para este caso |
|---|---|---|---|
| 1 | Maruyama Ōkyo, *Five Puppies*, séc. XVIII, rolo vertical, nanquim e cor leve sobre seda (LACMA, M.71.100.164) | https://collections.lacma.org/object/29742 | Filhote como **massa redonda de aguada** com pouquíssima linha de contorno. A forma vem da mancha, não do contorno. Na nossa cachorrinha: corpo e cabeça em `wash` com bordas de pincel, e contorno de nanquim só onde a forma precisa (dorso, orelha, nariz). |
| 2 | Maruyama Ōkyo, *Three Puppies*, 1790 (Philadelphia Museum of Art) | https://philamuseum.org/collection/object/85762 | O texto curatorial lembra que, no Japão, o cão é símbolo de boa saúde, e era costume dar cãezinhos de brinquedo a recém-nascidos como amuleto. Isso dá peso afetivo a uma homenagem e serve de ideia para o selo e o easter egg. |
| 3 | Nagasawa Rosetsu, *Puppies, Sparrows, and Chrysanthemums*, c. 1792–94, nanquim e cor leve sobre papel (Cleveland Museum of Art) | https://www.clevelandart.org/art/145423 | O texto do museu descreve um filhote curioso que **inclina a cabeça para o chamado de um pássaro**, e diz que Rosetsu usava animais para mostrar emoções humanas. Essa é a base da pose-chave "cabeça inclinada", a reação dela a clique e som. O texto também fala em linhas esparsas e delicadas, ou seja, economia de traço. |
| 4 | *Ōkami* (Clover Studio/Capcom, 2006), visual cel-shaded inspirado no sumi-e (Wikipedia, verbete com fontes) | https://en.wikipedia.org/wiki/%C5%8Ckami | Segundo o verbete, o designer Kenichiro Yoshimura desenhou a loba com pincel, e foi isso que levou o time ao sumi-e. O visual também resolveu um problema de desempenho do PS2. Numa das primeiras demos, a loba corria por uma floresta e **flores desabrochavam no seu rastro**. Lições: estilo de tinta e desempenho andam juntos, e o rastro afetivo das patinhas (seção 6) vem daqui. |
| 5 | *Wolfwalkers* (Cartoon Saloon, 2020), entrevista com Tomm Moore e Ross Stewart (TheWrap) | https://www.thewrap.com/wolfwalkers-directors-interview-tomm-moore-ross-stewart-cartoon-saloon/ | Stewart diz que os lobos deviam "se mover quase como um líquido" e que era preciso desenhá-los "como uma grande massa", sem perder a estrutura das pernas que aparecem. Lição: o tronco é uma mancha só (não um tubo articulado), e as patas finas saem dela. Foi o contrário disso que fez a versão antiga parecer genérica. |
| 6 | Eadweard Muybridge, *Animal Locomotion* (1887), pranchas de cão andando e trotando (mastiffs "Dread" e "Smith") | Busca indica NGA, ex.: https://www.nga.gov/collection/art-object-page.220467.html | **Não confirmado por WebFetch** (a NGA, a Wellcome e o Eastman Museum devolveram 403/405). A busca mostra a NGA descrevendo 12 quadros do ciclo com posições de pernas, cauda e cabeça. Use só como referência de observação. Os números de prancha divergem entre os acervos (704/705/706). |
| 7 | A. Abourachid (2003), "A new way of analysing symmetrical and asymmetrical gaits in quadrupeds", *Comptes Rendus Biologies* 326(7) | https://comptes-rendus.academie-sciences.fr/biologies/articles/10.1016/S1631-0691(03)00170-7/ | É a base numérica dos ciclos. No trote, as diagonais andam juntas (defasagem de 50%). No passo, defasagem acima de 50% dá passo lateral. A fração do ciclo com a pata no chão (*duty factor*) **diminui com a velocidade**. Isso vira os parâmetros `duty` de cada marcha. |
| 8 | David Rosen (Wolfire), "An Indie Approach to Procedural Animation", GDC 2014 (Game Developer) | https://gamedeveloper.com/design/video-an-indie-approach-to-procedural-animation | Técnicas procedurais simples com **pouquíssimos keyframes** dão animação interativa e fluida. Frase de Rosen: "We really need animation and code to work more closely together". É a justificativa do rig com poses-chave e molas em vez de timeline. |
| 9 | Callstack, "Lottie vs. Rive: Optimizing Mobile App Animation" | https://callstack.com/blog/lottie-vs-rive-optimizing-mobile-app-animation | No mesmo teste (Android, React Native), o Lottie rodou a cerca de 17 FPS e o Rive a cerca de 60 FPS. O Rive usou mais memória gráfica. A state machine do Rive é o ponto forte para personagem interativo. |
| 10 | Rive, Runtime Sizes (atualizado em jan/2026) e página de Inputs | https://rive.app/docs/runtimes/runtime-sizes.md · https://rive.app/docs/runtimes/web/inputs.md | O canvas-lite pesa 222 KB comprimido (707 KB sem compressão), e o canvas completo 567 KB. Os "Inputs" estão **DEPRECATED** em favor de Data Binding. O custo de bundle é real para um personagem só. |

**Não consegui verificar:**
- **Pinterest:** o WebFetch não retorna conteúdo, só a palavra "Pinterest". Por isso uso acervos de museu como equivalentes.
- **Richard Williams:** nenhuma fonte confirmou o conteúdo sobre quadrúpedes. Uma resenha diz que o livro quase não trata de animais. Uso dele só os princípios gerais (tempo, espaçamento, peso), sem citar páginas.
- **Hollow Knight:** não achei fonte primária sobre o pipeline de animação.
- **Met (Rosetsu, *Puppies in the Snow*):** devolveu 429.

---

## 2. Por que a versão cachorrinho antiga ficou genérica (e pesada)

Lendo `src/lib/mascot-dog.ts`:
1. **Silhueta de labrador:** cabeça minúscula (elipse 7×6.2) num tronco-salsicha de 48 unidades, uma orelha caída e só perfil. Não tinha nenhum traço de pinscher nem de chihuahua.
2. **Olho de pontinho** (r 1.7): sem olhar, sem brilho, sem branco. A expressão de um cão mora no olho e na orelha, e os dois estavam apagados.
3. **Cor chapada** (`--dog-fur #5e605c` no corpo inteiro): faltava a hierarquia de manchas (dorso em tinta cheia, corpo em aguada, focinho grisalho).
4. **Patas como macarrão:** cada perna era um `brushOutline` refeito a cada quadro. Parecia mangueira esticando, não osso.
5. **Desempenho:** a cada quadro eram geradas 8 malhas de pincel (pescoço, orelha, rabo, 4 pernas, coxa, todas com smoothing e densify), com cerca de 11 usos de filtro SVG (`boil`/`bleed`) em partes animadas. Cada filtro numa parte que se mexe é um passe fora da tela por quadro.

**A regra nova:** os traços são **gerados uma vez** e o rig só mexe em `transform` de grupos. Nenhum filtro SVG nas partes animadas. A "linha viva" vem de troca de variantes pré-geradas (seção 3).

---

## 3. Direção de arte

**Em uma linha:** uma mancha de aguada pequena e redonda, com duas orelhas de folha enormes e um par de olhos que brilham. Ela é quase toda orelha, olho e coração.

- **Hierarquia de manchas** (igual à lógica do Borrão):
  - **Tinta cheia (`ink`):** dorso (a "sela"), topo da cabeça, nuca, nariz, íris, ponta do rabo e o contorno da borda externa das orelhas.
  - **Aguada média (`wash`):** corpo, cara, peito, patas, preenchimento das orelhas. É o caramelo dela.
  - **Aguada clara (`mist`):** **focinho grisalho** e "sobrancelhas" (as manchinhas claras acima dos olhos). As patas do lado de lá também ficam em `mist`, dando profundidade.
  - **Papel (`paper`):** interior das orelhas (contraluz), brilho dos olhos, um filete de branco no canto do olho (o ar "assustadinho"), pontinhos grisalhos no focinho e falhas de pincel seco no dorso.
- **Vazio:** sem chão desenhado sob ela. Só uma sombra elíptica de 14% de opacidade. O papel em volta é o ar das orelhas.
- **Espessura do traço:** manchas largas (16–24) no corpo e na cabeça. As patas são finas (4.8–5.4), finas de propósito: é o que diz "pinscher". As linhas de acento são finíssimas (0.8–1.4), só onde a forma encosta no papel (atrás da coxa, frente do antebraço, borda da orelha).
- **Linha viva ("boil") sem filtro:** gerar 3 variantes de seed para as 6 manchas grandes (crânio, tronco, sela, preenchimento e borda das orelhas, topo da cabeça) e trocar o `d` a 8 fps quando ela se mexe, 4 fps parada e 0 dormindo. É o *line boil* da animação desenhada à mão, com custo perto de zero (troca de string pré-calculada). Com movimento reduzido, a troca não acontece.

---

## 4. Folha de modelo

**ViewBox `0 0 200 160`, de frente para a direita, patas em `y = 150`.** A cabeça fica em **3/4 virada para quem olha**, com os dois olhos e as duas orelhas visíveis. O corpo fica de perfil (convenção de jogo 2D). Isso é o que mais separa ela de um cachorro genérico de perfil.

| Medida | Valor | Por quê |
|---|---|---|
| Altura total (chão até a ponta da orelha) | cerca de 121 | |
| Cabeça + orelhas | cerca de 50% da altura | Proporção quase de filhote, legível em 100 px |
| Crânio | 36 × 34 (centro 137, 62) | |
| Tronco | 62 × 26 (x 63–125) | Compacto: cabeça para tronco é cerca de 1 : 1.6 em comprimento |
| **Orelha** | **34 de comprimento, 18 de base** (≈ altura do crânio) | É o traço número 1 dela |
| Focinho | 8–9 além do crânio, fino, ponta escura | Curto e fino, ≈ 0.37 do crânio |
| Olho de cá | elipse 5.1 × 5.2 + esclera 5.9 × 5.5 | Grande, escuro, com 2 brilhos |
| Olho de lá | 3.6 × 4.4 (encurtado pela perspectiva) | |
| Patas | 4.8–5.4 de largura, cerca de 44 de comprimento | Finas, na pontinha: "pezinho de bailarina" |
| Rabo | 4 segmentos, cerca de 27, foice para cima | **A confirmar com o André** |

**Escala ao lado do Borrão:** exibir a caixa de 200×160 a **0.5 (100 × 80 px)**.
- **O Borrão:** a caixa dele tem 64 px. A silhueta visível tem cerca de 57 px (do tufo ao pé), com cerca de 46 px de largura de corpo e os olhos a cerca de 32 px do chão.
- **A Mel a 0.5:** cerca de 60 px até a ponta das orelhas, crânio no topo a cerca de 52 px, olhos a cerca de 44 px do chão, tronco com cerca de 31 px.
- **Leitura:** os dois ficam do mesmo "peso" visual. Ela é um pouco mais alta só por causa das orelhas, e o olhar dela fica levemente acima do dele. Quando ela abaixa a cabeça para cheirá-lo, o olho dela fica na altura do dele, o que é bom para as interações.
- **Celular:** a mesma proporção. Se o Borrão encolher, ela encolhe junto: `MEL_SCALE = BORRAO_SIZE / 128`.

**O que faz dela ELA:**
1. Orelhas de folha, enormes, abertas para os lados. **A de lá fica mais caída** (+58° contra −48° da de cá), a assimetria da foto. As duas têm o interior em papel, como orelha contra a luz.
2. Olhos grandes com **um filete de branco no canto** e sobrancelhas claras com o canto interno mais alto. O resultado é o olhar atento e um pouco "assustadinho".
3. **Focinho grisalho** em `mist`, com 3 pontinhos de papel: a idade dela, desenhada com carinho.
4. Sela de tinta cheia que começa no dorso e sobe pela nuca até o topo da cabeça, contínua.
5. Corpo pequeno e patas finas, sempre um pouco na ponta.

**Poses-chave (nomes para a folha de modelo):**
- **"Atenta"**: em pé, orelhas abertas, cabeça um pouco erguida, olhando para quem visita (pose de repouso).
- **"Cabeça de lado"**: sentada, cabeça inclinada 14°, orelha de cá subindo, a pose de Rosetsu (curiosidade).
- **"Colinho"**: olhos fechados em arco "∩", orelhas para trás, rabo abanando, coraçãozinho. Vem das referências 2 e 3 dele.

---

## 5. Técnica: comparação e recomendação

| Opção | Visual de nanquim | Celular | Bundle | Controle por código (mouse, rolagem, IK) | Veredito |
|---|---|---|---|---|---|
| **(a) Rig SVG próprio** (traços pré-gerados, `transform` em grupos, IK de 2 ossos, molas) | Excelente: usa o mesmo `brushPath` do site | Bom: cerca de 22 grupos com transform, nenhum filtro | Cerca de 6–9 KB | Total: patas plantadas no chão na velocidade da rolagem, orelhas com física | **Recomendado** |
| (b) Rive | Bom, mas o André teria que redesenhar no editor. A textura de pincel vira imagem ou malha | Ótimo (60 FPS no teste da Callstack) | 222 KB (lite) a 567 KB | Bom via Data Binding (Inputs deprecados). IK e plantar a pata na velocidade da rolagem ficam presos ao editor | Pesado para um personagem só |
| (c) Lottie | Médio: timeline, sem física | Fraco no teste (≈17 FPS) e o README avisa sobre muitos nós | Cerca de 148–198 KiB | Ruim: state machine recente e lógica toda manual | Descartar |
| (d) Sprite sheet desenhado | O mais "à mão" | Leve para desenhar, pesado em imagens (cerca de 15 estados × 8–12 quadros × @2x) | Imagens (centenas de KB) | Ruim: não planta pata em velocidade variável, orelha não reage | Bom só para um momento especial (ver extra) |
| (e) Canvas 2D procedural | Excelente (`new Path2D(d)` aceita as mesmas strings) | Ótimo: 1 nó | Igual a (a) | Igual a (a), mas perde classes CSS e exige wrapper acessível | Plano B |

**Recomendação: (a)**, escrito para que a troca por (e) seja só trocar o "pintor". As partes guardam strings `d`. Se o perfil de um Android fraco pedir, `ctx.setTransform` + `ctx.fill(new Path2D(d))` desenham o mesmo rig num `<canvas>`.

**Regras de desempenho:**
- Rodar no **`gsap.ticker`** (o mesmo relógio de ScrollTrigger e Lenis): um único rAF.
- Pausar o loop com `IntersectionObserver` fora da tela e com `document.hidden`. Dormindo, só a respiração em CSS (`scaleY` no grupo do tronco) e nenhum JS por quadro.
- **Não usar `renderScene`** para o rig. Ele dá `replaceChildren` e, com `filter` indefinido, cai no `bleed` por padrão (`filterFor`). Montar com `strokeToPath(item).path` e `filter: 'none'` em todos os traços.
- Patas do lado de lá reaproveitam as mesmas strings `d` com outra classe de tom.
- Só escrever `transform` quando o valor mudar (arredondar a 0.1°/0.1 px).
- Poeira e flores: no máximo 6 vivas, sem filtro, animando só `transform` e `opacity`.

---

## 6. Desenho: o rig (formato de `scenes.ts`)

Sugestão: novo arquivo `src/lib/dog-rig.ts` (só dados). O comportamento fica em outro módulo, no estilo de `mascot.ts`.

**Árvore de grupos (ordem de pintura, de trás para a frente):**
```
root  translate(x,y) · scaleX(facing)
├─ shadow
├─ farRear  ─ thigh(rot @hip) ─ shin(rot @knee) ─ paw(rot @ankle)    [mist, translate(5 -1.5)]
├─ farFront ─ upper(rot @shoulder) ─ fore(rot @elbow) ─ paw(rot @wrist) [mist, translate(5 -1.5)]
├─ tail  seg0(rot @T0) ─ seg1(rot @T1) ─ seg2(rot @T2) ─ seg3(rot @T3)
├─ body  translate(bodyX bodyY) rotate(pitch @BODY) scale(breath)
├─ nearRear  (como farRear, tom wash + acentos)
├─ nearFront
└─ head  translate(com o ombro) rotate(neck @NECK)
   ├─ neck strokes
   └─ skull  rotate(tilt @SKULL)
      ├─ farEar  translate(149 50) rotate(earFar) scale(.9 1)    ← antes do crânio
      ├─ nearEar translate(126 52) rotate(earNear)
      ├─ skull strokes, cap, brows, muzzle, nose
      ├─ jaw  rotate(@JAW)  (latido)
      ├─ eyes (near/far) + arcs (happy/sleep)
      └─ hat (junho)
```
Os pivôs estão no **mesmo espaço da pose de repouso**. Por isso `rotate(a px py)` aninhado funciona em qualquer nível. As orelhas são a exceção: são desenhadas em volta de (0, 0) e posicionadas com `translate`/`rotate`.

```ts
import { ellipsePoints, stroke, type Point, type Stroke } from './brush';

/** Rest pose drawn in a 200×160 box facing right, paws on y = 150. Pivots share this space, so nested
 * `rotate(angle px py)` works at every level. Every stroke opts out of SVG filters: the rig is animated. */
export const DOG_VIEW = { width: 200, height: 160, ground: 150 } as const;

type StrokeOptions = Parameters<typeof stroke>[2];
const ink = (points: Point[], width: number, options: StrokeOptions = {}): Stroke => stroke(points, width, { filter: 'none', ...options });

export const PIVOTS = {
  body: [92, 104],
  neck: [118, 92],
  skull: [128, 74],
  jaw: [148, 74],
  nearEar: [126, 52],
  farEar: [149, 50],
  hip: [72, 104],
  knee: [75, 124],
  ankle: [71, 146],
  shoulder: [112, 104],
  elbow: [110, 124],
  wrist: [111, 145],
  tail: [[65, 95], [60, 89.5], [56.5, 83], [54.5, 76.5], [54, 70]],
} satisfies Record<string, Point | Point[]>;

/** Offset of the far legs (they sit behind the body, slightly higher). */
export const FAR_OFFSET: Point = [5, -1.5];

/** Rest rotation of each ear in degrees: 0 points straight up, positive is clockwise. The far ear droops more, like hers. */
export const EAR_REST = { near: -48, far: 58 };

/** Bone lengths and rest angles (degrees, SVG convention) for the two-bone IK. */
export const LEGS = {
  rear: { upper: 20.2, lower: 22.4, thighRest: 81.5, shinRest: 100.3, bend: -1 as const }, // stifle in front of the hip→ankle line
  front: { upper: 20.1, lower: 21.0, thighRest: 95.7, shinRest: 87.3, bend: 1 as const }, // elbow behind it
};

export const DOG_PARTS = {
  body: [
    ink([[68, 97], [63, 104], [66, 112]], 15, { tone: 'wash', seed: 301, start: 0.3, end: 0.3, wobble: 0.15 }),
    ink([[64, 102], [78, 98], [96, 97], [110, 99], [118, 104]], 24, { tone: 'wash', seed: 302, start: 0.2, end: 0.15, wobble: 0.15 }),
    ink([[112, 98], [118, 108], [114, 118]], 15, { tone: 'wash', seed: 303, start: 0.2, end: 0.4 }),
    ink([[86, 109], [97, 110.5], [107, 112]], 1.3, { tone: 'soft', seed: 304, start: 0.4, end: 0.4 }),
    // Saddle: the dark back that runs up the nape into the cap of the head
    ink([[63, 96], [76, 88], [94, 86], [110, 89], [118, 95]], 11, { tone: 'ink', seed: 305, start: 0.15, end: 0.35, wobble: 0.35 }),
    // Dry-brush gaps on the saddle
    ink([[78, 88.5], [92, 87]], 1.1, { tone: 'paper', seed: 306, start: 0.3, end: 0.5 }),
    ink([[84, 91], [100, 90]], 0.9, { tone: 'paper', seed: 307, start: 0.4, end: 0.4 }),
  ],
  /** June only: her little green outfit, translated into mist with paper dots. */
  outfit: [
    ink([[90, 93], [104, 92], [114, 97], [117, 108]], 17, { tone: 'mist', seed: 308, start: 0.15, end: 0.2 }),
    ...[[96, 97], [103, 96.5], [110, 99], [99, 102], [107, 103.5], [113, 106]].map(([x, y], i) =>
      ink([[x, y], [x + 0.7, y + 0.4]], 1.8, { tone: 'paper', seed: 390 + i, start: 0.5, end: 0.5 })
    ),
  ],
  neck: [
    ink([[114, 96], [121, 84], [128, 74]], 17, { tone: 'wash', seed: 310, start: 0.1, end: 0.2 }),
    ink([[113, 90], [118, 80], [125, 70]], 7, { tone: 'ink', seed: 311, start: 0.1, end: 0.4 }),
  ],
  /** Drawn around (0,0) = ear base, pointing up; placed with translate(pivot) rotate(angle). */
  ear: [
    ink([[0, 1], [0, -15], [0, -33]], 18, { tone: 'wash', seed: 320, start: 0.04, end: 0.85, wobble: 0.1 }),
    ink([[1, -3], [1.4, -15], [0.4, -27]], 7.5, { tone: 'paper', seed: 321, start: 0.15, end: 0.8, wobble: 0.1 }),
    ink([[-2.5, -5], [-2, -18]], 1, { tone: 'mist', seed: 322, start: 0.3, end: 0.6 }),
    ink([[-8.5, 1], [-9.5, -11], [-5.5, -24], [0, -34]], 2.2, { tone: 'ink', seed: 323, start: 0.05, end: 0.6 }),
    ink([[0, -34], [5, -23], [8.6, -10], [9, 1]], 1.4, { tone: 'soft', seed: 324, start: 0.5, end: 0.1 }),
  ],
  skull: [
    ink(ellipsePoints(137, 62, 10, 9, { seed: 330, count: 16 }), 16, { tone: 'wash', seed: 330, start: 0.02, end: 0.05, wobble: 0.15 }),
    ink([[124, 66], [128, 74], [134, 77]], 9, { tone: 'wash', seed: 331 }),
    ink([[121, 60], [127, 50], [138, 46], [149, 50]], 8, { tone: 'ink', seed: 332, start: 0.2, end: 0.35, wobble: 0.3 }),
    ink([[142, 50], [146, 57], [150, 63]], 3.4, { tone: 'soft', seed: 333, start: 0.2, end: 0.6 }),
    // Pale brows, inner corners raised: the alert, slightly startled look
    ink([[129, 54.4], [134, 52.6]], 3, { tone: 'mist', seed: 334, start: 0.3, end: 0.3 }),
    ink([[144.2, 52.4], [147.8, 53.8]], 2.4, { tone: 'mist', seed: 335, start: 0.3, end: 0.3 }),
    // Grey muzzle (her age), its top line and the nose
    ink([[146, 67], [153, 69.5], [159.5, 71.5]], 9.5, { tone: 'mist', seed: 336, start: 0.1, end: 0.35 }),
    ink([[147, 64.5], [154, 66.8], [159, 68.6]], 1.2, { tone: 'soft', seed: 337, start: 0.2, end: 0.3 }),
    ink(ellipsePoints(160.5, 70.6, 1.7, 1.3, { seed: 340, count: 8 }), 4.4, { tone: 'ink', seed: 340, start: 0.02, end: 0.05 }),
  ],
  jaw: [
    ink([[147, 74.5], [153, 76.2], [157.5, 75.6]], 3.2, { tone: 'mist', seed: 338, start: 0.2, end: 0.4 }),
    ink([[148.5, 73.6], [153.5, 75], [157.5, 74.2]], 1, { tone: 'ink', seed: 339, start: 0.3, end: 0.3 }),
  ],
  /** Hidden unless panting or happy. */
  tongue: [ink([[152, 75.5], [153.5, 80], [155.5, 79]], 3.4, { tone: 'wash', seed: 341, start: 0.2, end: 0.3 })],
  rearThigh: [
    ink([[71, 99], [69, 111], [75, 124]], 13, { tone: 'wash', seed: 350, start: 0.05, end: 0.45 }),
    ink([[64, 104], [64.5, 113], [70, 122]], 1.3, { tone: 'soft', seed: 351, start: 0.3, end: 0.4 }),
  ],
  rearShin: [
    ink([[75, 123], [70, 136], [71, 146]], 5.4, { tone: 'wash', seed: 352, start: 0.05, end: 0.1 }),
    ink([[72.6, 134], [69.4, 137.5], [69.6, 145]], 1.1, { tone: 'ink', seed: 353, start: 0.3, end: 0.3 }),
  ],
  rearPaw: [
    ink(ellipsePoints(73.2, 147.6, 2.9, 1.5, { seed: 354, count: 10 }), 3.2, { tone: 'wash', seed: 354, start: 0.02, end: 0.05 }),
    ink([[73.6, 146.8], [74, 148.6]], 0.8, { tone: 'ink', seed: 355, start: 0.3, end: 0.3 }),
    ink([[75.4, 147], [75.8, 148.6]], 0.7, { tone: 'ink', seed: 356, start: 0.3, end: 0.3 }),
  ],
  frontUpper: [ink([[113, 99], [111, 112], [110, 124]], 9.5, { tone: 'wash', seed: 360, start: 0.1, end: 0.3 })],
  frontFore: [
    ink([[110, 123], [110.6, 135], [111, 145]], 4.8, { tone: 'wash', seed: 361, start: 0.05, end: 0.1 }),
    ink([[112.6, 127], [113, 144]], 1.1, { tone: 'ink', seed: 362, start: 0.3, end: 0.3 }),
  ],
  frontPaw: [
    ink(ellipsePoints(113.2, 147.6, 2.8, 1.5, { seed: 363, count: 10 }), 3.2, { tone: 'wash', seed: 363, start: 0.02, end: 0.05 }),
    ink([[113.4, 146.8], [113.8, 148.6]], 0.8, { tone: 'ink', seed: 364, start: 0.3, end: 0.3 }),
  ],
  /** One segment per pivot in PIVOTS.tail; widths taper to an ink tip. */
  tail: [
    ink([[65, 95], [60, 89.5]], 5.4, { tone: 'soft', seed: 370, start: 0.1, end: 0.05 }),
    ink([[60.3, 90], [56.5, 83]], 4.4, { tone: 'soft', seed: 371, start: 0.05, end: 0.05 }),
    ink([[56.7, 83.5], [54.5, 76.5]], 3.4, { tone: 'soft', seed: 372, start: 0.05, end: 0.05 }),
    ink([[54.6, 77], [54, 70]], 2.6, { tone: 'ink', seed: 373, start: 0.05, end: 0.7 }),
  ],
  /** June only: straw hat, tilted like in the photo (wrap in rotate(-10 140 42)). */
  hat: [
    ink([[129, 43], [131, 34], [140, 31], [148, 34], [149, 42]], 10, { tone: 'mist', seed: 380, start: 0.05, end: 0.05 }),
    ink([[116, 46], [128, 42], [142, 40.5], [157, 43], [163, 47]], 4.6, { tone: 'wash', seed: 381, start: 0.1, end: 0.2 }),
    ink([[117, 47.2], [140, 42.6], [162, 48]], 1.1, { tone: 'ink', seed: 382, start: 0.1, end: 0.1 }),
    ink([[129, 40], [149, 40.4]], 2, { tone: 'ink', seed: 383, start: 0.1, end: 0.1 }),
    // Woven straw: two diagonal hatch directions
    ...Array.from({ length: 5 }, (_, i) => ink([[131 + i * 3.6, 39], [133 + i * 3.6, 33]], 0.7, { tone: 'soft', seed: 384 + i, start: 0.3, end: 0.3 })),
    ...Array.from({ length: 5 }, (_, i) => ink([[131 + i * 3.6, 33], [133.4 + i * 3.6, 39]], 0.7, { tone: 'soft', seed: 395 + i, start: 0.3, end: 0.3 })),
  ],
} satisfies Record<string, Stroke[]>;

/** Crisp primitives (circles/ellipses) for the eyes and highlights; the pupil group moves for look-at. */
export const DOG_EYES = {
  near: { pivot: [133, 61], sclera: { cx: 133, cy: 61.4, rx: 5.9, ry: 5.5 }, iris: { cx: 133.7, cy: 60.9, rx: 5.1, ry: 5.2 }, shine: [[135.5, 58.9, 1.6], [131.8, 63.1, 0.6]] },
  far: { pivot: [147.4, 59.6], sclera: { cx: 147.4, cy: 59.6, rx: 4.2, ry: 4.8 }, iris: { cx: 147.8, cy: 59.4, rx: 3.6, ry: 4.4 }, shine: [[149, 57.6, 1.2], [146.8, 61.3, 0.45]] },
  /** Closed-eye strokes, drawn like Borrão's `.mascot-closed` (ink stroke 1.5, round caps). */
  happy: 'M128.3 61.6 Q133 57.6 137.7 61.6 M143.9 60 Q147.4 56.8 150.9 60',
  sleep: 'M128.3 60.4 Q133 63.6 137.7 60.4 M143.9 59 Q147.4 61.8 150.9 59',
  /** Grey hairs on the muzzle. */
  greyDots: [[151, 70.5], [153.5, 71.6], [150, 72.2]],
  noseShine: [161.2, 69.6, 0.65],
  shadow: { cx: 92, cy: 150.5, rx: 30, ry: 2.4 },
};
```

**Boil:** para `skull[0]`, `body[1]`, `body[4]`, `ear[0]`, `ear[3]` e `skull[2]`, pré-gerar `d` com `seed`, `seed + 1000` e `seed + 2000`, e alternar.

### IK de duas peças, sem refazer traço

As pernas ficam **fora** do grupo do corpo. A cada quadro:
1. `hipNow = rotate(PIVOTS.hip − PIVOTS.body, pitch) + PIVOTS.body + [bodyX, bodyY]` (o mesmo vale para o ombro).
2. Grupo da perna: `translate(hipNow − PIVOTS.hip)`.
3. Joelho por lei dos cossenos: `base = atan2(ankle − hip)`, `spread = acos((u² + d² − l²) / (2ud))` e `kneeAngle = base + bend·spread`. Para a traseira, `bend = −1` (joelho na frente). Para a dianteira, `bend = +1`.
4. `thighRot = deg(atan2(knee − hip)) − thighRest`.
5. `shinLocal = deg(atan2(ankle − knee)) − shinRest − thighRot`.
6. `pawLocal = pawGlobal − thighRot − shinLocal`. `pawGlobal` vale 0 apoiada; no balanço, +60° na dianteira (dobra para trás) e +35° na traseira (arrasta a ponta).

Saída: `thigh.setAttribute('transform', 'rotate(thighRot 72 104)')`, `shin` → `rotate(shinLocal 75 124)`, `paw` → `rotate(pawLocal 71 146)`. As mesmas três linhas servem para a dianteira, com os pivôs dela.

---

## 7. Estados e transições (estilo jogo)

**Arquitetura:** máquina de estados finita + **pose-alvo por estado**. Cada parâmetro persegue o alvo com mola criticamente amortecida (ω = 8/s normal, 14/s em reações). Transições com curva própria usam `gsap.parseEase()` dentro do loop, sem misturar tweens GSAP no rig.

**Parâmetros de pose:** `bodyX, bodyY, pitch, neck, tilt, earOpen, tail, wagAmp, wagHz`, mais os alvos das patas.

**Convenções:**
- Orelhas: `near = −(48 + earOpen)` e `far = 58 + earOpen`. Valores extras por estado aparecem na tabela.
- Rabo: rotação da raiz relativa ao repouso. +25 = bem alto, −45 = horizontal (corrida), −95 = no chão, −120 = entre as pernas.

**Física secundária (acompanhamento):**
- **Orelhas:** mola angular com `k = 170` e `c = 11` (sub-amortecida, ζ ≈ 0.42; ela balança e assenta). Recebe impulsos de −0.9 × velocidade angular da cabeça e de ±0.04 × aceleração vertical do corpo. Na queda, as orelhas sobem; no pouso, abrem.
- **Abano:** `seg_i = tail + A·sin(ωt − 0.6·i)·(0.6 + 0.25·i)`, que é o acompanhamento em cadeia. No abano feliz, **o corpo abana junto**, `pitch ± 1.5°` na mesma frequência, como fazem os cães pequenos.

| Estado | Entrada (tempo / ease) | Pose-alvo (valores iniciais) | Loop e detalhes |
|---|---|---|---|
| **atenta** (idle em pé) | 0.35 s `power2.out` | tudo 0, `earOpen` 0, `tail` 0, wag 12°/3 Hz | Respiração: `body scaleY 1 ± 0.018`, período 2.6 s, cabeça com atraso de 0.25 ciclo (±0.6). A cada 3–6 s troca o peso de pata (`bodyX ± 1.2`, 0.5 s `sine.inOut`). **Olhar:** íris até 1.2 u para o ponteiro e pescoço ±12° (lerp 6/s). |
| **piscar** | aleatório a cada 2.4–5.5 s, 30% de chance de piscada dupla | | Olho `scaleY 1 → 0.1` em 60 ms `power2.in`, segura 40 ms, abre em 90 ms `power2.out` (cerca de 190 ms no total). |
| **orelhada** | aleatória a cada 4–9 s, uma orelha | | Impulso de 220°/s numa só orelha (a mola faz o resto). |
| **cabeça de lado** (curiosa; som, clique perto, foco por teclado) | 0.35 s `back.out(1.6)` | `tilt +14`, `earOpen −14` (orelhas em pé), `neck −4` | Segura 1.2 s e volta em 0.5 s `sine.inOut`. A orelha de cá sobe mais (−34). |
| **andar** | troca de marcha em 0.3 s (blend dos offsets) | `neck +2`, `tail +5` | Passo lateral com offsets RT 0, RD 0.25, LT 0.5, LD 0.75. Passada 22 u, `duty` 0.62, ergue 5 u. Sobe e desce 2× por ciclo (1.2 u), cabeça em contra-fase com atraso de 0.12 ciclo. Abano 14°/4 Hz. |
| **trotar** | 0.3 s | `neck +5`, `earOpen +10`, `tail −10` | Diagonais: RT+LD = 0 e LT+RD = 0.5. Passada 30 u, `duty` 0.45, ergue 8 u, sobe e desce 2 u. |
| **correr** (galope) | 0.25 s | `neck +10`, orelhas `near −88 / far +20` (para trás), `tail −45` | Galope rotativo (offsets por inferência, a validar com Muybridge): RT 0, LT 0.1, LD 0.5, RD 0.6. Passada 40 u, `duty` 0.3, ergue 10 u. **Coluna:** `body scaleX 0.93 ↔ 1.07` por ciclo e sobe 5 u na suspensão. Poeira (mist, sem filtro) a cada 0.35 s. |
| **sentar** | antecipação: sobe 2 u em 80 ms `power1.out`, depois desce em 0.45 s `power3.out` e assenta (squash 4%, 120 ms) | `pitch −24`, `bodyX +4`, `bodyY +12`. Tornozelo traseiro em (86, 146), dianteiro em (116, 145) | O rabo varre o chão: `tail −95`, abano 18°/3 Hz ("vassourinha"). |
| **deitar** | do sentar, 0.7 s `power2.inOut` | `pitch 0`, `bodyY +30`. Traseiras em (92, 148), dianteiras esticadas em (138, 147). `neck +28`, `tilt +8`, `earOpen +40` | **Suspiro:** `scaleY 1.06 → 0.96` em 1.2 s `sine.inOut` antes de dormir. |
| **dormir** | 28 s sem interação (como o Borrão) | igual a deitar, olhos `sleep`, `tail −110` (enrolado) | Respiração de 3.6 s, ±0.035, feita **em CSS** (rAF parado). "z" reaproveita `mascot-snore`. A cada 20 s, **sonhando:** patas remam ±6° a 6 Hz por 1.5 s. |
| **cheirar** | cabeça desce em 0.4 s `power2.inOut` | `neck +32`, `tilt +6`, `pitch +4`, `tail +20`, wag 10°/2 Hz | Fungadas: focinho ±0.5 u a 14 Hz em rajadas de 0.21 s com pausa de 0.3 s. Anda devagar (25 px/s) cheirando. |
| **pular** | antecipação: agacha 0.12 s `power2.in` (`bodyY +4`) | no ar: dianteiras recolhidas para a frente, traseiras esticadas | Decolagem: `scaleY 1.08 / scaleX 0.94` por 0.1 s. Pouso: `scaleY 0.86 / scaleX 1.1` por 90 ms e volta em 0.35 s `elastic.out(1, 0.45)`. Orelhas pela mola. |
| **latir** | antecipação: cabeça −8° em 0.1 s `power2.in` | latido: cabeça +6°, `jaw rotate +16 @JAW`, corpo recua 1.5 u, dianteiras sobem 1 u | 1 a 3 latidos, 0.12 s cada, espaçados 0.28 s `power3.out`. Balão "au!" com o pop existente. Som de latidinho sintetizado e mudo por padrão. |
| **carinho** (hover > 600 ms na cabeça, toque longo, Enter) | 0.3 s `sine.out` | olhos `happy`, `tilt +10` (encosta na mão), `earOpen +22` (para trás), `tail +15`, wag 28°/7 Hz + corpo abanando | Língua aparece. Após 1.2 s sobe um **coraçãozinho de nanquim** (24 px em 1.4 s `power1.out`, some no último terço). **Mais de 3 s:** reflexo de coçar, pata traseira chutando ±20° a 12 Hz. |
| **clique** (poke) | susto: 0.18 s `back.out(3)` | orelhas em pé (`earOpen −18`), íris `scale 1.12` (o olhar assustadinho) | Depois **reverência de brincar** em 0.6 s (`pitch +18`, dianteiras em (128, 145), rabo alto abanando). **3 cliques em 2 s:** *zoomies*, corre de um lado para o outro por 2.5 s. |
| **coçar orelha** (variação de idle sentada, 7–18 s parada) | pata sobe em 0.25 s `power2.out` | traseira de cá vai até a orelha, `tilt −18`, olhos semicerrados | Coça a 10 Hz ±14° por 1.1 s e sacode a cabeça em 0.4 s. |
| **carregada** | como o Borrão (mola 260/28) | patas penduradas balançando com −vx, `tail −120` (entre as pernas), orelhas tremulando | Olhos arregalados. |
| **sacudir** (ao soltar) | 0.8 s | | Corpo ±6° a 9 Hz decaindo `power2.out`. As orelhas batem sozinhas pela mola, e a cabeça vem com atraso. |
| **virar** | 0.18 s | | A cabeça vira primeiro (antecipação de 80 ms), depois `scaleX` passa por 0 com squash. |

**Andar junto com a rolagem do mundo** (`drive(x, speed)`):
- Período do ciclo: `T = clamp(stride_px / (|v| · duty), Tmin, Tmax)`, com `stride_px = stride × escala` (100 px / 200 u = 0.5). Assim a pata apoiada recua **exatamente** na velocidade do chão, sem patinar.
- `Tmin` por marcha: andar 0.38 s, trote 0.26 s, galope 0.22 s. Quando T bate no `Tmin`, a passada cresce.
- Limiares de velocidade de tela: andar < 90 px/s, trote 90–260, galope > 260.
- Quando a rolagem para: desacelera a marcha em 0.35 s, firma as dianteiras e **olha para a câmera** (`tilt +6`).

**`prefers-reduced-motion`:**
- Nenhum rAF e nenhum boil. Ela aparece em pose estática **"cabeça de lado" sentada**.
- Estados trocam de pose instantaneamente (sentada, dormindo com olhos `sleep`, carinho com olhos `happy` e coração estático).
- No mundo, fica parada no lugar dela (sem andar com a rolagem).
- O balão aparece só com `opacity`. Sem poeira, sem flores, sem piscar. Arrastar fica desabilitado, como no Borrão.

---

## 7b. Mel e Borrão: andar juntos e interagir

**Formação na rolagem.** Hoje o `world.ts` chama `mascot.drive(mascotX, velocity / 3)`. A Mel recebe:
```ts
// Mel trails Borrão on the side he is walking away from; the gap breathes with speed.
mel.drive(mascotX - borrao.facing * followGap(speed), speed);
```
- **`followGap`:** 48 px parados (ela senta virada para ele), 70 px andando, 90 px trotando. A posição dela persegue o alvo com mola (k = 40, ζ = 1). Quando a rolagem acelera ou **inverte**, ela fica para trás, trota ou galopa para alcançar e passa por trás dele até o novo lado. É o "seguir o líder" de jogo, e de graça mostra as marchas.
- **Camadas:** a Mel fica uma camada abaixo do Borrão (z-index 39), então ele passa na frente dela. A sombra dela é mais larga e mais clara, para não brigar com a dele.

**Ganchos que o Borrão precisa expor** (mudança pequena em `mascot.ts`): getters `x`, `y`, `state` e `facing`, mais um `EventTarget` (ou callback `onEvent`) que emite `hop`, `say`, `poke`, `carried`, `dropped`, `knocked` e `sleep`. A Mel só escuta; o Borrão não depende dela.

| Gatilho (Borrão) | Reação da Mel | Tempo / ease |
|---|---|---|
| `hop` (pula uma pedra) | Pula também, **120 ms depois**, no mesmo ponto do chão (siga o líder). Em 1 de cada 4 vezes, desvia e cheira a pedra. | Antecipação 0.12 s, pouso `elastic.out(1, 0.45)` |
| `say` (balão dele) | "Cabeça de lado" virada para ele, orelha de cá em pé | 0.35 s `back.out(1.6)` |
| `poke` (visitante clica nele) | Abana o rabo e dá **reverência de brincar** para ele | 0.6 s |
| `carried` (arrastado) | Late para o cursor ("au! au!"), **fica em pé nas patas traseiras** pedalando as dianteiras, segue o cursor por baixo | Latidos de 0.12 s espaçados 0.28 s; pernas a 6 Hz |
| `dropped` ou `knocked` (mancha no chão) | Corre até ele, **cheira a mancha**, fica com um pinguinho de tinta no focinho grisalho por 5 s, depois **lambe o Borrão** (língua + o Borrão fecha os olhos, `mouth: smile`) | Galope curto, cheirar 1 s, lamber 3 × 0.15 s |
| `sleep` (28 s parado) | Deita **enroladinha encostada nele**, cabeça apoiada (ele vira travesseiro) e sincroniza a respiração com a dele, defasada meio ciclo | Deitar em 0.7 s, respiração CSS de 3.6 s |
| Parados por 6–12 s (aleatório) | **Brincadeira:** ela faz reverência, ele dá um pulinho, ela dá *zoomies* em volta dele por 2 s e senta de novo | Zoomies como em "correr", raio de 60 px |
| Parados por 8 s | Cheira o Borrão. Ele ri (`mouth: open`, treme 2 px) | Fungadas de 14 Hz |
| Pegadas dele (`footprints`) | Às vezes vai farejando as pegadas | Cheirar andando a 25 px/s |

**Balões sem colisão:**
- A Mel quase não fala: só "au!", coraçãozinho ou "?" de curiosidade. O balão dela fica 18 px acima e para o lado de fora da dupla.
- Se o Borrão estiver com balão aberto, o dela espera ele fechar.

**Movimento reduzido:** os dois ficam lado a lado, estáticos (ela sentada em "cabeça de lado", olhando para ele). As reações viram trocas de pose instantâneas, sem corrida: lambida = olhos `happy` nos dois, sono = ela deitada com olhos `sleep`.

**Desempenho com dois personagens:** o mesmo `gsap.ticker` atualiza os dois. A Mel pausa fora da tela e, dormindo, os dois ficam só com CSS.

---

## 8. Easter eggs afetivos (discretos)

1. **Junho:** chapéu de palha trançado + roupinha (`outfit` em `mist` com bolinhas) + bandeirinhas de papel no mundo. Ativa com `new Date().getMonth() === 5`.
2. **Coraçãozinho** no carinho (vem da referência 2 dele). Depois de 10 carinhos, `unlock('carinho')` em `secrets.ts`.
3. **Rastro florido** (lição de Ōkami): no galope, a cada 4ª pegada brota um raminho de sumi-e de 2 traços que desbota em 3 s. No máximo 6 vivos.
4. **Selo hanko** com o nome dela, num cantinho da estação onde ela mora, como a assinatura de um pintor. É uma homenagem silenciosa.
5. **Digitar o nome dela** em qualquer lugar: ela vem correndo de fora da tela e senta aos pés do visitante.
6. **Noite** (22h–6h local): ela dorme enroladinha. Se o Borrão existir junto, ela usa ele de travesseiro.
7. **Som ligado:** as orelhas giram na direção da origem do som (cabeça de lado).
8. **Data especial dela** (aniversário ou adoção): um bolinho de nanquim na estação.

---

## 9. Perguntas para o André

1. ~~Nome~~ **Mel** (respondido). Você a chamava por algum apelido ("Melzinha")? Isso entra no easter egg de digitar o nome: aceitar "mel" e o apelido.
2. **Como era o rabo?** Comprido em foice, enrolado, curto? Na foto não aparece.
3. A orelha mais caída era **sempre a mesma**? Na foto é a direita dela. Confirmo o lado?
4. ~~Convive com o Borrão?~~ **Sim, andam juntos** (respondido). Ela segue o Borrão ou às vezes **puxa a fila** (vai na frente quando a rolagem é rápida)? E na estação da casa, ela tem um tapetinho só dela?
5. **Tom:** alegre de jogo o tempo todo, ou com um cantinho de memória (o selo, uma frase curta sua)?
6. **Focinho grisalho:** quer lembrar dela mais velha, como na foto? Ou prefere uma versão filhote escondida num segredo?
7. **Manias dela:** tremia (chihuahua treme), girava antes de deitar, espirrava de alegria, inclinava a cabeça? Cada mania vira um estado de idle e é isso que faz o desenho ser *ela*.
8. **Latido:** quer um latidinho sintetizado (mudo por padrão) ou prefere sem som?
9. Topa **desenhar à mão por cima das poses-chave** ("Atenta", "Cabeça de lado", "Colinho")? Eu vetorizo nos mesmos pivôs e a identidade fica sendo o seu traço.

## 10. Sugestões extras

- **Folha de poses de verdade:** montar um protótipo HTML único em `prototipo/` com o rig e botões para cada estado antes de integrar. Isso serve para ajustar os números da tabela no olho.
- **Um momento desenhado quadro a quadro** (sprite de 8–12 quadros) só para "girar antes de deitar", se for mania dela. É o único lugar onde o sprite vale o peso.
- **Retrato estático em aguada**, grande, na estação dela (feito com `renderScene` e revelação animada, aí com filtros, porque é estático): ela "posa" para o retrato quando o visitante chega.
