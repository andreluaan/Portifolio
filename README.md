# André Luan · andreluaan.dev

Portfólio pessoal desenhado em nanquim, com a identidade da marca **andreluaan.dev**: papel, sumi, um toque de shu e Geist ("tinta, corte e código"). Detalhes em [docs/identidade.md](docs/identidade.md). O site é um mundo de papel que você percorre rolando a página: cada pincelada é gerada por código, e uma criaturinha de tinta, o Borrão, acompanha a caminhada.

## O que tem no caminho

- **Intro "molhando o pincel"**: a marca de memória se desenha (círculo, fio, corte) enquanto a página carrega. Pode ser pulada com `Esc`.
- **Início**: retrato em nanquim revelado por pinceladas.
- **Destaques**: um varal com os projetos principais, que balançam com o vento da rolagem.
- **Estante**: um caderno com todos os projetos, aberto em tela cheia, com páginas que viram em 3D (dá para arrastar o canto, clicar, usar a roda do mouse ou ← →).
- **Ateliê**: mural com os repositórios do GitHub, lidos na hora do build.
- **Um ano em pinceladas**: as contribuições reais do GitHub, uma mancha de tinta por dia.
- **Sobre**: ficha de personagem com atributos, árvore de habilidades, diário de missões e conquistas.
- **Correio**: caixa de correio e caderno de recados com comandos (`ajuda`, `recado <texto>`…).
- **Mesinha escondida** no fim do caminho: pinte o céu com pincel seco ou derrube o tinteiro.
- **Borrão**: anda, pula pedras, dorme, fala, e pode ser arrastado e derrubado (ele não gosta de altura). Uma versão dele como cachorrinho de tinta está guardada em `src/lib/mascot-dog.ts`.
- **11 segredos** registrados num passaporte de carimbos.
- Versões em português e inglês, sons de papel e pincel sintetizados (mudos por padrão) e suporte a `prefers-reduced-motion`.

## Stack

- [Astro](https://astro.build) (site estático)
- [GSAP](https://gsap.com) para as animações da interface
- [PixiJS](https://pixijs.com) para a Mel, recortada em malhas
- Motor de pincel próprio com filtros `feTurbulence` / `feDisplacementMap`, executado no build: `npm run ink` grava cada pincelada do mundo em WebP no Chrome instalado, e o site só posiciona as imagens
- O mundo anda sobre a rolagem nativa da página (barra de rolagem, PageDown e toque continuam funcionando)
- Web Audio API para os sons

## Rodando localmente

```bash
npm install
npm run dev
```

O site abre em `http://localhost:4321` (em inglês, `/en/`). Cada estação tem link próprio: `#destaques`, `#estante`, `#github`, `#sobre`, `#contato`, `#mesinha`.

No mundo: **A D** ou **← →** andam com a Mel, **W S** mudam a profundidade, **espaço** pula, **E** usa a estação em que ela está, e um toque no chão leva a Mel até lá. A rolagem da página também anda.

Depois de mudar um desenho, o mapa ou os textos, regrave as pinceladas com `npm run ink`. Para gerar a versão de produção:

```bash
npm run build
npm run preview
```

## Estrutura

```
src/
  data/content.ts      textos PT/EN, projetos, habilidades e missões
  lib/brush.ts         motor de pincel (traços, máscaras de desenho, molduras)
  lib/scenes.ts        desenhos: projetos, placas, estante, casa, mesinha
  world/               o mundo em modo jogo: mapa, câmera, cenário, peças do chão
  components/          a página (PT em /, EN em /en/) e as pinturas gravadas
  lib/book.ts          caderno da estante com páginas em 3D
  lib/character.ts     ficha de personagem completa
  lib/mascot.ts        Borrão, a criaturinha de tinta
  lib/mascot-dog.ts    versão guardada do Borrão como cachorrinho (não usada)
  lib/notebook.ts      caderno de recados
  data/github.ts       repositórios e contribuições lidos no build
  lib/secrets.ts       segredos e passaporte
  lib/sound.ts         sons sintetizados
  lib/painting.ts      pintura com pincel seco
  styles/              estilos globais e de cada parte (brand.css: as marcas)
  lib/memory-mark.ts   a marca de memória construída pelas medidas do manual
public/images/         retratos em nanquim e o rolo pintado
public/ink/            pinceladas gravadas por scripts/ink-bake (não editar à mão)
public/brand/          SVGs da marca (AL, AL completo claro e escuro, hanko)
public/fonts/          ponto redondo e kana, recortados por scripts/fonts/subset.py
scripts/brand/         favicons a partir das marcas
scripts/perf.mjs       medição de desempenho (npm run perf, --mobile para celular)
prototipo/             protótipos anteriores em HTML único
docs/referencias.md    pesquisa de referências
```

---

Desenhado traço a traço por André Luan.
