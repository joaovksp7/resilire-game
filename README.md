# Missão Clima — Caminhos da Prevenção

Jogo educativo para navegador sobre **enchentes e deslizamentos**, para estudantes do ensino fundamental II e médio dos Vales do Rio Pardo e Taquari (RS). O jogador anda por uma cidade 3D, recebe missões e visita instituições que ensinam como agir antes e durante um evento climático extremo.

- Game design completo: [`prompt-jogo-desastres-climaticos.md`](prompt-jogo-desastres-climaticos.md)
- Regras para quem desenvolve: [`CLAUDE.md`](CLAUDE.md) / [`AGENTS.md`](AGENTS.md)

> **Status:** Fase 3 (Personagem) — cidade 3D completa e personagem que anda por dado, como num jogo de tabuleiro. As missões entram na próxima fase.

---

## Como rodar

Precisa do [Node.js](https://nodejs.org/) **20.19 ou mais novo** (recomendado: 22 LTS).

```bash
npm install     # só na primeira vez
npm run dev     # abre o servidor de desenvolvimento
```

Depois, abra o endereço que aparecer no terminal (normalmente `http://localhost:5173`).

### Controles (até agora)

O personagem anda **por dado**, como num jogo de tabuleiro:

1. Jogue o dado (de 1 a 6). Ele cai rolando ao lado do personagem.
2. As casas que dá para alcançar com até aquele número de passos ficam destacadas em azul no chão.
3. Escolha uma delas e o personagem anda casa por casa até lá. Não precisa usar todos os passos.

| Ação | Computador | Celular |
|---|---|---|
| Jogar o dado | Botão "Jogar dado", `Enter` ou `Espaço` | Tocar em "Jogar dado" |
| Escolher a casa | Clicar numa casa destacada | Tocar numa casa destacada |
| Ir até uma instituição | Clicar no prédio (se a porta estiver destacada) | Tocar no prédio |
| Mover a câmera | `W` `A` `S` `D` ou setas | — |
| Zoom | Roda do mouse | Pinça com dois dedos |

A cada jogada, a câmera volta a seguir o personagem.

## Como gerar o build

```bash
npm run build     # confere os tipos e gera a pasta dist/
npm run preview   # serve o dist/ localmente para testar
```

A pasta `dist/` é um site estático completo. Ela usa caminhos relativos, então funciona em qualquer subpasta da hospedagem.

> O `dist/index.html` **não abre com dois cliques** no arquivo. O navegador bloqueia scripts carregados direto do disco. Use `npm run preview` ou envie para um servidor.

Outros comandos:

```bash
npm run typecheck   # só confere os tipos do TypeScript
```

## Como incorporar em uma página (iframe)

1. Rode `npm run build`.
2. Envie **todo o conteúdo** da pasta `dist/` para uma pasta da hospedagem, por exemplo `https://seusite.com.br/jogos/missao-clima/` (por FTP ou pelo gerenciador de arquivos da hospedagem — não pela biblioteca de mídia do WordPress).
3. No WordPress, adicione um bloco **HTML personalizado** com:

```html
<iframe
  src="https://seusite.com.br/jogos/missao-clima/"
  title="Missão Clima — Caminhos da Prevenção"
  style="width: 100%; aspect-ratio: 16 / 9; min-height: 420px; border: 0;"
  allow="fullscreen"
  loading="lazy"
></iframe>
```

O jogo se ajusta sozinho ao tamanho do iframe. Rolar a roda do mouse sobre o jogo dá zoom e não rola a página.

## Como editar o conteúdo

Todo o texto educativo (missões, diálogos, perguntas, itens do kit) vai ficar em arquivos JSON na pasta `content/`, que podem ser editados sem programar. Essa pasta e a documentação do formato de cada arquivo entram na **Fase 4**.

O nome do jogo fica em [`src/config.ts`](src/config.ts) (`GAME_NAME`).

## Como mexer no mapa da cidade

A cidade é fixa (não muda a cada partida), para o professor saber onde fica cada coisa. O mapa é um desenho em texto no arquivo [`src/world/layout.ts`](src/world/layout.ts), com duas grades do mesmo tamanho (30 × 30):

- **`LAYOUT_TYPES`**: o que tem em cada quadradinho. Cada letra ou símbolo tem um significado, listado no começo do arquivo: rua, casa, árvore, rio e assim por diante. Cada instituição é um retângulo de letras iguais, por exemplo `A` para o Abrigo, e precisa de exatamente um `*` encostado nele. O `*` marca a rua em frente à porta.
- **`LAYOUT_LEVELS`**: a altura do terreno em cada quadradinho, de `0` (fundo do rio) a `9` (topo do morro). O nível `1` é a parte baixa, que alaga na fase "Durante o evento".

Regras:
- Todas as linhas precisam ter o mesmo número de caracteres.
- Só a rua (`#` e `*`), a praça (`+`) e a ponte (`=`) são caminháveis.
- Se algo estiver errado, como uma letra desconhecida ou uma instituição sem porta, o jogo mostra no console do navegador qual linha e qual coluna corrigir.

A aparência de cada instituição (cor, ícone e formato do prédio) fica em [`src/world/institutions.ts`](src/world/institutions.ts). Os nomes e textos das instituições vão para `content/` na Fase 4.

## Estrutura

```
index.html            página principal
src/
  main.ts             liga tudo: renderer, cena, cidade, câmera, entrada e loop
  config.ts           nome do jogo e constantes (câmera, render, mundo, personagem, cores)
  style.css           cores e fontes (variáveis CSS) e layout base
  core/               loop, entrada (teclado/mouse/toque), câmera, renderer
  player/
    character.ts      personagem low-poly e animação de andar
    player.ts         movimento casa por casa (com pulinho), altura do chão e da ponte
    pathfinding.ts    casas alcançáveis com o dado e caminho na grade de ruas (4 direções)
    dice.ts           dado 3D (pintas desenhadas em código) e a animação de rolar
    diceTurn.ts       a vez: jogar o dado → escolher casa → andar
    reachHighlight.ts destaques azuis das casas alcançáveis
    clickToMove.ts    descobre o que foi tocado na tela (chão ou prédio)
  ui/
    diceHud.ts        botão "Jogar dado" e avisos
  world/
    layout.ts         mapa da cidade em texto (tipos e alturas)
    cityMap.ts        lê o mapa: tiles, alturas, instituições e portas
    city.ts           monta a cidade inteira
    terrain.ts        terreno e laterais da maquete
    water.ts          água do rio (o nível sobe nas próximas fases)
    buildings.ts      prédios das instituições e placas com ícone
    institutions.ts   cor, ícone e formato de cada instituição
    icons.ts          desenhos dos ícones
    decor.ts          casas, prédios, árvores e ponte
    scene.ts          céu e luzes
```
