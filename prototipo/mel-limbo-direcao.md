# Mel, versão sombra (inspirada em LIMBO): direção

> Só proposta. Ela entra como `style: 'shadow'` em `src/lib/mel.ts`, com o mesmo rig e as mesmas interações. Abaixo, **[V]** marca o que foi verificado por WebFetch e **[I]** marca inferência ou decisão minha.

## 1. Fontes

| Fonte | Link | O que diz |
|---|---|---|
| Wikipedia, *Limbo (video game)* | https://en.wikipedia.org/wiki/Limbo_(video_game) | **[V]** Gráficos em tons de cinza. Os críticos citam a abordagem monocromática "with film grain filter, focusing techniques and lighting" (noir, cinema mudo). Silhuetas usadas para despistar o jogador. **Um animador trabalhou em tempo integral por três anos** só nas animações do menino, incluindo **animações de antecipação** (ele estende a mão para a alça do carrinho quando o jogador se aproxima). Jensen achava isso importante porque o personagem fica no centro da tela. Há um sistema de física para objetos e para o próprio personagem, num engine próprio. Uma crítica alemã o compara à animadora de silhuetas Lotte Reiniger. |
| Game Developer, "Hanging in Limbo" (Jensen e Patti) | https://www.gamedeveloper.com/business/hanging-in-limbo | **[V]** "It was an ongoing thing for three years" (sobre o menino). Patti diz que o comportamento é o que faz a animação funcionar, porque ele **lê o ambiente**. Jensen: **"He can look forward in time half a second to see what's out there."** O jogo foi testado primeiro com caixas, e o visual tem que "feel right". |
| Game Informer, review (2010) | https://gameinformer.com/games/limbo/b/xbox360/archive/2010/07/21/review-immerse-yourself-in-a-new-world | **[V]** Os visuais em preto e branco são "slightly blurry", um desfoque que acompanha o tom. |
| NBC News, review (2010) | https://www.nbcnews.com/news/amp/wbna38450368 | **[V]** "keep an eye on the boy's bright, glowing eyes": para onde ele olha, você também deve olhar. **O olho é o indicador de intenção.** |
| ACMI, *Die Abenteuer des Prinzen Achmed* (Reiniger, 1926) | https://www.acmi.net.au/works/100855--die-abenteuer-des-prinzen-achmed-the-adventures-of-prince-achmed/ | **[V]** Silhuetas recortadas, animadas quadro a quadro e inspiradas no teatro de sombras chinês, sobre fundos retroiluminados. A lição é que uma silhueta precisa ser legível só pelo contorno. |

**Não encontrei fonte para:** keyframe contra rotoscopia, taxa de quadros, cabelo e roupa do menino, piscada, vinheta e configuração do desfoque. A lista de palestras da Playdead (https://blog.playdead.com/articles/limbo_presentations/limbo_publications.html) só tem GDC 2010 (puzzles) e 2011 (som), nada de animação. Tudo o que vem a seguir sobre esses pontos é **[I]**.

## 2. Regras para a Mel

**O contraste é invertido [I].** No LIMBO a figura preta fica sobre um mundo escuro e enevoado. Aqui ela é uma **mancha de nanquim sobre papel claro**. Isso dá a leitura máxima, então o desfoque deve ser mínimo: o "soft" vem da borda, não da imagem toda.

### Silhueta
- **Preenchimento:** todas as partes em `--ink` (#151515). As patas do lado de lá ficam em `--soft` (#3b3c3a), o único recurso de profundidade, para as quatro patas não virarem uma massa só no trote.
- **Pelos na borda:** cerca de 40 tufos pré-gerados, cada um um traço afunilado de 2–4 u de comprimento e 0.8–1.6 u de largura, `start .1`, `end .9`, apontando para fora pela normal do contorno.
  - Ficam só no **dorso, peito, bochechas, base das orelhas, barriga e rabo**.
  - **Nada** na ponta das orelhas, no focinho nem nas patas, para manter as formas-chave nítidas.
  - **Junte os tufos de cada grupo num único `<path>`** (concatenando os `d`): 1 nó por grupo.
- **Borda macia sem filtro:** duplique a silhueta do corpo e da cabeça com `<use>` atrás, `stroke: var(--ink)`, `stroke-width: 1.6`, `stroke-opacity: .28`, `fill: none`. Dá uma franja de 0.8 u que simula o desfoque.
- **Filtro (opcional, no máximo um):** `feGaussianBlur stdDeviation="0.35"` no grupo raiz, **só com `(pointer: fine)` e sem movimento reduzido**. No celular, sem filtro.
- **Textura interna:** nenhuma. A falha de pincel seco só nas bordas: 2 traços `paper` de 0.7 u no dorso. A mancha tem que ser cheia.

### Olhos (o que tem que se destacar)
- **Tamanho:**
  - olho de cá: elipse 3.4 × 3.0 u (≈ 19% da largura do crânio, de 36 u);
  - olho de lá: 2.6 × 2.4 u.

  São menores que os olhos grandes da versão clara, mas, brilhando sobre o preto, leem como maiores. **Sem pupila**: são brancos lisos em `--paper`, como no LIMBO [I].
- **Olhar:** o olho inteiro desliza até 1 u dentro da órbita na direção do alvo (é assim que se lê para onde ela olha sem pupila).
- **Antecipação pelo olhar:** a regra do "meio segundo à frente" de Jensen vira esta regra [I]: **olho e cabeça viram para o alvo 0.35 s antes de qualquer ação** (andar, pular, reagir ao Borrão). Com 0.5 s inteiros fica lento demais na web.
- **Halo:** um círculo atrás de cada olho, com raio de 2.6× o do olho e `fill="url(#mel-glow)"`. É um único `<radialGradient>` compartilhado (paper, opacidade .55 → 0). Gradiente não é filtro e custa quase nada.
  - **Respiração do brilho:** opacidade do halo de .45 a .60 em 3.2 s `sine.inOut`, só no idle.
- **Piscar:** a cada 3–6 s (mais calmo que na versão clara). `scaleY` 1 → 0.08 em 70 ms `power2.in`, segura 50 ms, abre em 110 ms `power2.out`. **O halo acompanha** (opacidade ×0.2 com o olho fechado), então o brilho "apaga" junto.
- **Feliz ou carinho:** os olhos viram arcos "∩" de `paper` (traço 1.3) e o halo fica em 60%.
- **Dormir:** o olho fecha em 0.6 s `sine.inOut` e **sobra um arco fino de papel a 45%**, com o halo a 15%. **Nunca apaga 100%** (ver seção 4).
- **Susto (clique, Borrão caindo):** o olho escala 1.15 e o halo vai a 1.0 por 0.25 s com `back.out(3)`, depois volta.

### Linguagem corporal: mais pesada, mais pausada [I]
Valores relativos à versão clara:
- **Ciclos:**
  - andar e trote ficam **×1.15 mais longos**: `Tmin` andar 0.44 s, trote 0.30 s, galope 0.24 s;
  - sobe e desce: andar 1.6 u, trote 2.4 u, galope 5 u;
  - a cabeça atrasa 0.15 ciclo em relação ao corpo.
- **Inclinação:**
  - parada: −1° (cabeça um pouco baixa, a melancolia);
  - correndo: `pitch` +2° no andar, +3° no trote e +5° no galope (nariz para a frente);
  - mais o termo de aceleração `clamp(accel × 0.004, −4°, +6°)`.
- **Orelhas:** mola k = 140, c = 9 (ζ ≈ 0.38), mais moles e com mais acompanhamento.
- **Parar:** desacelera em 0.45 s `power3.out`. O corpo inclina −3° (o peso indo para a frente e voltando) e assenta com mola k = 120, ζ = 0.5, com uma oscilação visível. Depois **pausa de 0.3 s parada** antes de qualquer idle.
- **Virar:** 0.26 s no total.
  1. Olho e cabeça viram primeiro (90 ms).
  2. O corpo passa `scaleX` 1 → 0 → −1 com `power2.inOut` e `scaleY` 0.96 no meio.
- **Pular:**
  1. Agacha 5 u em 0.16 s `power2.in` (antecipação maior).
  2. No ar, orelhas pela mola.
  3. Pousa com squash `scaleY .88 / scaleX 1.08` por 100 ms e **segura 120 ms** (o peso).
  4. Recupera em 0.4 s `elastic.out(1, 0.5)`.
- **Idle:**
  - respiração de 3.2 s, ±0.02;
  - a cada 6–10 s, **olha em volta** (cabeça para cima e para trás em 0.8 s `sine.inOut`, segura 1 s, volta);
  - farejadas raras.
- **Brincar e carinho:** **mantêm a energia da versão clara** (abano 7 Hz, reverência, zoomies). O peso fica só no andar e no repouso. É isso que impede que ela fique triste.

## 3. Ambiente barato (sem filtro por elemento)
- **Poeira de nanquim nas patas** (trote e galope):
  - **pool fixo de 8 `<span>`** reaproveitados, sem criar nem remover nós, cada um com 6 px e `background: radial-gradient(circle, rgb(21 21 21 / .45), transparent 70%)`;
  - a cada pouso de pata (fim do balanço): `scale .6 → 1.8`, `opacity .5 → 0`, sobe 6 px e deriva −8 px × direção, em 0.6 s `power2.out`;
  - no máximo 1 por pata por ciclo.
- **Sombra macia:** uma elipse com `radialGradient` (ink .22 → 0) em vez da elipse chapada. `scaleX` 1 → 0.5 e opacidade ×0.4 conforme ela sobe no pulo.
- **Rastro de gotas** (só no galope): a cada 0.25 s cai uma gota de 2–3 px atrás do quadril, em 0.3 s `power2.in`, e vira uma mini mancha (`inkSplat` pequeno pré-renderizado numa folha só) que some em 2 s. Também pool, no máximo 6.
- **Pegadas:** a cada 4 passos, uma pegada `ink` a 25% que some em 2.6 s (como `mascot-footprint` do Borrão).
- **Não usar** grão, vinheta nem desfoque global: quebrariam o papel claro do site [I].

## 4. Tom: carinho, não luto
- **Ela nunca apaga.** Nem dormindo o olho some: fica o arco fino e um halo mínimo, como uma luzinha de presença.
- **Peso só no repouso.** Andar e olhar em volta podem ser pausados e contemplativos. Brincar, abanar, lamber o Borrão e o coraçãozinho continuam alegres e elásticos.
- **Sombra como tinta, não como trevas.** É "uma mancha de nanquim que ganhou vida", irmã do Borrão. Ele também é tinta, e os dois juntos fazem sentido.
- **Calor no brilho.** O halo pulsa no ritmo da respiração. Quando ela recebe carinho, o halo cresce 1.2×: ela "acende".
- **Sem morte nem perigo.** Do LIMBO só entram a silhueta, o olhar e o peso. Nada de queda trágica: quando o Borrão ou ela caem, a reação é a sacudida engraçada.
- **Sugestão:** usar a versão sombra no **modo noite** (22h–6h) ou como segredo, e a versão clara de dia. Decisão do André.

## 5. Perguntas para o André
1. A versão sombra é a padrão, a da noite ou um segredo?
2. Olhos sem pupila (puro LIMBO) ou com um pontinho de pupila (mais a Mel)?
3. O focinho grisalho some na silhueta. Quer manter 3 pontinhos de papel no focinho como lembrança da idade?
