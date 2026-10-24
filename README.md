# André Luan · mundo de papel

Portfólio pessoal desenhado em nanquim. O site é um mundo de papel que você percorre rolando a página: cada pincelada é gerada por código, e um cachorrinho de tinta, o Borrão, acompanha a caminhada.

## O que tem no caminho

- **Intro "molhando o pincel"**, que pode ser pulada com `Esc`.
- **Início**: retrato em nanquim revelado por pinceladas.
- **Como eu trabalho**: quatro bandeirinhas com o caminho de um projeto.
- **Destaques**: um varal com os projetos principais, que balançam com o vento da rolagem.
- **Estante**: um caderno com todos os projetos, aberto em tela cheia, com páginas que viram em 3D (dá para arrastar o canto, clicar, usar a roda do mouse ou ← →).
- **Ateliê**: mural com os repositórios do GitHub, lidos na hora do build.
- **Um ano em pinceladas**: as contribuições reais do GitHub, uma mancha de tinta por dia.
- **Sobre**: ficha de personagem com atributos, árvore de habilidades, diário de missões e conquistas.
- **Correio**: caixa de correio e caderno de recados com comandos (`ajuda`, `recado <texto>`…).
- **Mesinha escondida** no fim do caminho: pinte o céu com pincel seco ou derrube o tinteiro.
- **Borrão**: cachorrinho com esqueleto procedural (pernas com cinemática inversa, marcha de passo e trote, rabo e orelha com molas). Anda, trota, pula pedras, cheira o chão, senta, dá a pata, coça a orelha, deita, dorme, se espreguiça e se sacode; pode ser arrastado e derrubado.
- **11 segredos** registrados num passaporte de carimbos.
- Versões em português e inglês, sons de papel e pincel sintetizados (mudos por padrão) e suporte a `prefers-reduced-motion`.

## Stack

- [Astro](https://astro.build) (site estático)
- [GSAP](https://gsap.com) + ScrollTrigger para a rolagem lateral e as animações
- [Lenis](https://lenis.darkroom.engineering) para rolagem suave
- SVG gerado em tempo real (motor de pincel próprio) e filtros `feTurbulence` / `feDisplacementMap` para a textura da tinta
- Web Audio API para os sons

## Rodando localmente

```bash
npm install
npm run dev
```

O site abre em `http://localhost:4321`. Cada estação tem link próprio: `#processo`, `#destaques`, `#estante`, `#github`, `#ano`, `#sobre`, `#contato`. Para gerar a versão de produção:

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
  lib/world.ts         o mundo de papel (camadas, estações, rolagem)
  lib/book.ts          caderno da estante com páginas em 3D
  lib/character.ts     ficha de personagem completa
  lib/mascot.ts        Borrão, o cachorrinho de tinta (rig, marcha e estados)
  lib/notebook.ts      caderno de recados
  data/github.ts       repositórios e contribuições lidos no build
  lib/secrets.ts       segredos e passaporte
  lib/sound.ts         sons sintetizados
  lib/painting.ts      pintura com pincel seco
  styles/              estilos globais e de cada parte
public/images/         retratos em nanquim
prototipo/             protótipos anteriores em HTML único
docs/referencias.md    pesquisa de referências
```

---

Desenhado traço a traço por André Luan.
