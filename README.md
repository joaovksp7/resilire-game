# Missão Clima — Caminhos da Prevenção

Jogo educativo para navegador sobre **enchentes e deslizamentos**, para estudantes do ensino fundamental II e médio dos Vales do Rio Pardo e Taquari (RS). O jogador anda por uma cidade 3D, recebe missões e visita instituições que ensinam como agir antes e durante um evento climático extremo.

- Game design completo:
- Regras para quem desenvolve: [`CLAUDE.md`](CLAUDE.md) / [`AGENTS.md`](AGENTS.md)

> **Status:** Fase 4 (Missões) — as 10 missões jogáveis do começo ao fim: dado até a instituição, diálogo, pergunta, pin e próxima missão, com progresso salvo. O clima (chuva, rio subindo, ruas alagadas) entra na Fase 5. **Todo o texto educativo é rascunho e precisa ser validado com a Defesa Civil** (veja os campos `todoValidar` em `content/`).

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
| Ir rumo ao objetivo (só teclado) | Depois de jogar o dado, `Tab` até "Ir rumo ao objetivo" e `Enter` | — |
| Ver os pins / começar de novo | Botão de pins no canto de cima | Tocar no botão de pins |
| Mover a câmera | `W` `A` `S` `D` ou setas | — |
| Zoom | Roda do mouse | Pinça com dois dedos |

A cada jogada, a câmera volta a seguir o personagem. A instituição da missão tem uma seta flutuando em cima; quando ela está fora da tela, uma seta na borda aponta para onde ir. A porta da missão aparece em amarelo entre as casas destacadas.

Diálogos, perguntas, cartões e o painel de pins funcionam só com teclado (`Tab`, `Enter`, `Espaço` e `Esc` para fechar o painel).

### Progresso salvo

O jogo salva sozinho a missão atual, os pins, os acertos de primeira e onde o personagem está. Ao recarregar a página, continua de onde parou. Se o navegador bloquear o armazenamento (acontece dentro de iframe em alguns navegadores), o jogo funciona normalmente, mas o progresso some ao recarregar. Para recomeçar, use "Começar de novo" no painel de pins.

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

Todo o texto educativo fica em arquivos JSON na pasta [`content/`](content/). Dá para editar sem programar, com qualquer editor de texto.

**Depois de editar, rode `npm run build`** (o conteúdo vai junto no build). Se algo estiver errado, o build ou o jogo avisa em português qual arquivo e qual item corrigir.

### Regras gerais

- **JSON é exigente:** textos entre aspas duplas `"…"`, vírgula entre os itens e **sem vírgula depois do último**. Para usar aspas dentro de um texto, prefira as aspas curvas “assim”.
- Cada item tem um **`id`** (ex.: `"m03-combinado"`). Os arquivos se ligam pelo `id`, nunca pelo texto. Pode mudar os textos à vontade; mudar um `id` exige mudar também onde ele é usado.
- **`todoValidar`** (opcional, em qualquer item): anota o que ainda precisa ser confirmado com a Defesa Civil. Não aparece no jogo. Apague o campo quando a informação for validada.
- JSON não aceita comentários (`//`); por isso as pendências ficam no `todoValidar`.

### `institutions.json` — instituições e personagens

Uma lista com as 9 instituições do mapa (os `id` são fixos: `defesa-civil`, `bombeiros`, `escola`, `ubs`, `abrigo`, `radio`, `mercado`, `cras`, `casa`).

| Campo | O que é |
|---|---|
| `id` | Id fixo da instituição (não mudar) |
| `nome` | Nome que aparece no jogo (ex.: `"Defesa Civil"`) |
| `nomeComPreposicao` | O nome com "na/no/em", para frases como "Você está **na Defesa Civil**" |
| `personagem.nome` | Nome de quem conversa com o jogador |
| `personagem.funcao` | Função, que aparece embaixo do nome (ex.: `"agente da Defesa Civil"`) |

A cor, o ícone e o formato do prédio ficam no código ([`src/world/institutions.ts`](src/world/institutions.ts)).

### `missions.json` — eixos e missões

Tem duas listas:

- **`eixos`**: os três eixos, **sempre nesta ordem e com estes `id`**: `alerta`, `preparacao`, `durante`. Cada um tem `nome` e `descricao` (o texto do cartão que aparece quando o jogo passa para aquele eixo).
- **`missoes`**: as missões, **na ordem em que o jogador faz**. As missões de um eixo vêm todas antes das do próximo.

| Campo da missão | O que é |
|---|---|
| `id` | Id da missão |
| `eixo` | `alerta`, `preparacao` ou `durante` |
| `titulo` | Título da missão |
| `descricao` | O que o jogador precisa fazer (aparece no cartão da missão) |
| `instituicao` | `id` da instituição de destino (de `institutions.json`) |
| `dialogo` | `id` do diálogo (de `dialogues.json`) |
| `pergunta` | `id` da pergunta (de `questions.json`) |
| `aprendizado` | Um tópico curto com o que foi aprendido, para o resumo da tela final |

### `dialogues.json` — falas dos personagens

Uma lista de diálogos, cada um com `id` e `falas`: uma lista de frases, mostradas uma de cada vez, na ordem. Quem fala é o personagem da instituição da missão.

### `questions.json` — perguntas

| Campo | O que é |
|---|---|
| `id` | Id da pergunta |
| `tipo` | `multipla-escolha` (aparece como "Pergunta") ou `acao` (aparece como "O que você faz agora?") |
| `enunciado` | A pergunta ou a situação |
| `alternativas` | De 2 a 4 alternativas, cada uma com `texto` e `explicacao` |
| `correta` | **O número da alternativa certa, contando a partir de 0** (a primeira é `0`, a segunda é `1`…) |

A `explicacao` da alternativa certa aparece quando o jogador acerta; a das erradas explica por que aquela não era a melhor escolha, e o jogador tenta de novo. **As alternativas aparecem embaralhadas no jogo**, então a ordem no arquivo não importa para o jogador.

O nome do jogo fica em [`src/config.ts`](src/config.ts) (`GAME_NAME`).

## Como mexer no mapa da cidade

A cidade é fixa (não muda a cada partida), para o professor saber onde fica cada coisa. O mapa é um desenho em texto no arquivo [`src/world/layout.ts`](src/world/layout.ts), com duas grades do mesmo tamanho (30 × 30):

- **`LAYOUT_TYPES`**: o que tem em cada quadradinho. Cada letra ou símbolo tem um significado, listado no começo do arquivo: rua, casa, árvore, rio e assim por diante. Cada instituição é um retângulo de letras iguais, por exemplo `A` para o Abrigo, e precisa de exatamente um `*` encostado nele. O `*` marca a rua em frente à porta.
- **`LAYOUT_LEVELS`**: a altura do terreno em cada quadradinho, de `0` (fundo do rio) a `9` (topo do morro). O nível `1` é a parte baixa, que alaga na fase "Durante o evento".

Regras:
- Todas as linhas precisam ter o mesmo número de caracteres.
- Só a rua (`#` e `*`), a praça (`+`) e a ponte (`=`) são caminháveis.
- Se algo estiver errado, como uma letra desconhecida ou uma instituição sem porta, o jogo mostra no console do navegador qual linha e qual coluna corrigir.

A aparência de cada instituição (cor, ícone e formato do prédio) fica em [`src/world/institutions.ts`](src/world/institutions.ts). Os nomes e personagens ficam em [`content/institutions.json`](content/institutions.json).

## Estrutura

```
index.html            página principal
content/              texto educativo (ver "Como editar o conteúdo")
src/
  main.ts             liga tudo: conteúdo, cidade, câmera, personagem, missões e interface
  config.ts           nome do jogo e constantes (câmera, render, mundo, personagem, cores)
  style.css           cores e fontes (variáveis CSS) e estilos da interface
  core/               loop, entrada (teclado/mouse/toque), câmera, renderer, save (progresso)
  missions/
    content.ts        lê content/*.json e confere as ligações por id
    missionManager.ts missão atual, pins e acertos de primeira
    missionFlow.ts    o loop: missão → porta → diálogo → pergunta → pin → próxima
  player/
    character.ts      personagem low-poly e animação de andar
    player.ts         movimento casa por casa (com pulinho), altura do chão e da ponte
    pathfinding.ts    casas alcançáveis com o dado e caminho na grade de ruas (4 direções)
    dice.ts           dado 3D (pintas desenhadas em código) e a animação de rolar
    diceTurn.ts       a vez: jogar o dado → escolher casa → andar
    reachHighlight.ts destaques azuis das casas alcançáveis
    clickToMove.ts    descobre o que foi tocado na tela (chão ou prédio)
  ui/
    diceHud.ts        botão "Jogar dado", "Ir rumo ao objetivo" e avisos
    missionHud.ts     barra da missão no topo e painel de pins
    dialogue.ts       caixa de diálogo e pergunta
    cards.ts          cartões (missão, pin, eixo, fim) e janelas com foco preso
    edgeArrow.ts      seta na borda da tela apontando o destino
  world/
    layout.ts         mapa da cidade em texto (tipos e alturas)
    cityMap.ts        lê o mapa: tiles, alturas, instituições e portas
    city.ts           monta a cidade inteira
    terrain.ts        terreno e laterais da maquete
    water.ts          água do rio (o nível sobe nas próximas fases)
    buildings.ts      prédios das instituições e placas com ícone
    institutions.ts   cor, ícone e formato de cada instituição
    icons.ts          desenhos dos ícones (placas 3D e interface)
    markers.ts        seta flutuante e anel na porta da missão atual
    decor.ts          casas, prédios, árvores e ponte
    scene.ts          céu e luzes
```
