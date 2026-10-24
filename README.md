# André Luan · mundo de papel

Portfólio pessoal desenhado em nanquim. O site é um mundo de papel que você percorre rolando a página: cada pincelada é gerada por código, e uma criaturinha de tinta, o Borrão, acompanha a caminhada.

## O que tem no caminho

- **Intro "molhando o pincel"**, que pode ser pulada com `Esc`.
- **Início**: retrato em nanquim revelado por pinceladas.
- **Destaques**: um varal com os projetos principais, que balançam com o vento da rolagem.
- **Estante**: um caderno com todos os projetos, aberto em tela cheia, com páginas que viram em 3D (dá para arrastar o canto, clicar, usar a roda do mouse ou ← →).
- **Sobre**: ficha de personagem com atributos, árvore de habilidades, diário de missões e conquistas.
- **Mesinha escondida** no fim do caminho: pinte o céu com pincel seco ou derrube o tinteiro.
- **Borrão**: anda, pula pedras, dorme, fala, e pode ser arrastado e derrubado (ele não gosta de altura).
- **9 segredos** registrados num passaporte de carimbos.
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

O site abre em `http://localhost:4321`. Para gerar a versão de produção:

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
  lib/mascot.ts        Borrão, a criaturinha de tinta
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
