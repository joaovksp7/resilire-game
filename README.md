# Resilire — Cidade Resiliente

Jogo educativo para navegador sobre **enchentes e deslizamentos**, para estudantes do ensino fundamental II e médio dos Vales do Rio Pardo e Taquari (RS). O jogador anda por uma cidade 3D, recebe missões e visita instituições que ensinam como agir antes e durante um evento climático extremo.

- Game design completo:
- Regras para quem desenvolve: [`CLAUDE.md`](CLAUDE.md) / [`AGENTS.md`](AGENTS.md)

> **Status:** Parte 2, Fase 9 (Cinco missões) — as 5 missões jogáveis do começo ao fim, com progresso salvo; o clima muda a cada eixo (chuva, céu, rio subindo e ruas da parte baixa alagadas em "Durante o evento"); no mercado o jogador monta a mochila de emergência; o jogo tem tela inicial, Como jogar, pausa, tela final e créditos; e tem som gerado por código (chuva, pin, dado e acerto), com botão de som sempre à mão, e animação nos pins. **Todo o texto educativo é rascunho e precisa ser validado com a Defesa Civil** (veja os campos `todoValidar` em `content/`). Os créditos ainda estão "A definir" (veja `content/creditos.json`).

---

## Como rodar

Precisa do [Node.js](https://nodejs.org/) **20.19 ou mais novo** (recomendado: 22 LTS).

```bash
npm install     # só na primeira vez
npm run dev     # abre o servidor de desenvolvimento
```

Depois, abra o endereço que aparecer no terminal (normalmente `http://localhost:5173`).

### Telas

- **Tela inicial:** o nome do jogo com a cidade ao fundo. Na primeira vez, mostra **Jogar**. Se já houver progresso, mostra **Continuar** e **Começar de novo**; depois de completar tudo, **Ver resultado** e **Jogar de novo**. Sempre tem **Como jogar**, **Créditos** e **Som** (liga e desliga). Se o navegador não deixar salvar o progresso, uma linha avisa.
- **Pausa:** botão ⏸ no alto da tela (ou `Esc`). Tem **Continuar**, **Como jogar**, **Ver resultado** (só depois de completar tudo), **Começar de novo**, **Som** e **Tela inicial**. Na pausa e na tela inicial, o personagem e o dado ficam parados.
- **Tela final:** aparece depois da última missão, com os pins, os acertos de primeira e um resumo do que foi aprendido em cada eixo (o campo `aprendizado` de cada missão). Dá para **Jogar de novo** ou **Fechar** e continuar andando pela cidade.

"Começar de novo" e "Jogar de novo" sempre pedem confirmação antes de apagar o progresso.

### Controles

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
| Ver os pins | Botão de pins no canto de cima | Tocar no botão de pins |
| Pausar | Botão de pausa (⏸) ou `Esc` | Tocar no botão de pausa |
| Ligar ou desligar o som | Botão de som (alto-falante) ou `M` | Tocar no botão de som |
| Começar de novo | Menu de pausa ou tela inicial | Menu de pausa ou tela inicial |
| Mover a câmera | `W` `A` `S` `D` ou setas | — |
| Zoom | Roda do mouse | Pinça com dois dedos |

A cada jogada, a câmera volta a seguir o personagem. A instituição da missão tem uma seta flutuando em cima; quando ela está fora da tela, uma seta na borda aponta para onde ir. A porta da missão aparece em amarelo entre as casas destacadas.

Telas, menus, diálogos, perguntas, o minijogo da mochila, cartões e o painel de pins funcionam só com teclado (`Tab`, `Enter`, `Espaço`; `Esc` fecha o painel de pins, a pausa, Como jogar, os créditos e a tela final).

### As missões

São 5 missões, feitas nesta ordem:

| Ordem | Missão | Eixo | Instituição |
|---|---|---|---|
| 1 | Fique por dentro | Alerta | Defesa Civil |
| 2 | Monte sua mochila | Preparação | Mercado (minijogo da mochila) |
| 3 | O morro está avisando | Preparação | Bombeiros |
| 4 | Água corrente não se atravessa | Durante o evento | Bombeiros |
| 5 | Para o lugar seguro | Durante o evento | Abrigo |

A Rádio, a Escola, a UBS e o CRAS continuam no mapa, mas não têm missão nesta versão. Parar na porta de uma delas só mostra um aviso. Os diálogos e as perguntas dessas instituições continuam guardados em `dialogues.json` e `questions.json`, e o jogo não reclama de diálogo ou pergunta sem missão.

### Clima em cada eixo

| Eixo | Na cidade |
|---|---|
| Alerta | Céu nublado, chuva fraca |
| Preparação | Chuva moderada, o rio sobe um pouco |
| Durante o evento | Chuva forte, o rio transborda e alaga a parte baixa da cidade (a beira-rio, a baixada no meio da rua principal, a ponte e o outro lado do rio) |

Ao passar para um novo eixo, o clima piora aos poucos atrás do cartão do eixo. Em "Durante o evento", as ruas alagadas não aparecem entre as casas destacadas pelo dado: o caminho tem que ser pela parte alta. Tocar numa rua alagada mostra um aviso.

Para quem pediu menos animação no sistema (`prefers-reduced-motion`), a chuva é mais calma, o clima muda na hora e os pins aparecem sem animação. No celular, a chuva tem menos gotas, para não pesar. As cores, a luz, o nível da água e a quantidade de chuva de cada eixo ficam em [`src/config.ts`](src/config.ts) (`CLIMATE` e `RAIN`).

### Som

Todo o som é gerado por código (Web Audio API), sem nenhum arquivo de áudio:

- **Chuva:** acompanha a chuva de cada eixo — mais baixa em "Alerta", mais forte em "Durante o evento".
- **Pin conquistado:** quatro notas subindo.
- **Dado:** batidinhas ao jogar e quando ele para no chão.
- **Acerto:** duas notas curtas quando a pergunta ou a mochila fica certa. Errar não tem som, para não soar como castigo.

O som começa **ligado**, mas só toca depois do primeiro clique, toque ou tecla (regra dos navegadores). Para ligar ou desligar: o botão de som no alto da tela (ao lado dos pins e da pausa), a tecla `M`, ou o botão **Som** na tela inicial e no menu de pausa. A escolha fica guardada no navegador, à parte do progresso: "Começar de novo" não muda o som. Com a aba escondida, o som para.

No iPhone, a chave de silencioso do aparelho também corta o som do jogo. Os volumes (geral, chuva e efeitos) ficam em [`src/config.ts`](src/config.ts) (`AUDIO`).

### Progresso salvo

O jogo salva sozinho a missão atual, os pins, os acertos de primeira e onde o personagem está. Ao recarregar a página, continua de onde parou. Se o navegador bloquear o armazenamento (acontece dentro de iframe em alguns navegadores), o jogo funciona normalmente, mas o progresso some ao recarregar (a tela inicial avisa). Para recomeçar, use "Começar de novo" no menu de pausa ou na tela inicial.

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
2. Envie **todo o conteúdo** da pasta `dist/` para uma pasta da hospedagem, por exemplo `https://seusite.com.br/jogos/resilire/` (por FTP ou pelo gerenciador de arquivos da hospedagem — não pela biblioteca de mídia do WordPress).
3. No WordPress, adicione um bloco **HTML personalizado** com:

```html
<iframe
  src="https://seusite.com.br/jogos/resilire/"
  title="Resilire — Cidade Resiliente"
  style="width: 100%; aspect-ratio: 16 / 9; min-height: 420px; border: 0;"
  allow="fullscreen"
  loading="lazy"
></iframe>
```

O jogo se ajusta sozinho ao tamanho do iframe. Rolar a roda do mouse sobre o jogo dá zoom e não rola a página.

## Como editar o conteúdo

Todo o texto educativo fica em arquivos JSON na pasta [`content/`](content/), junto com o texto dos créditos. Dá para editar sem programar, com qualquer editor de texto.

**Depois de editar, rode `npm run build`** (o conteúdo vai junto no build). Se algo estiver errado, o build ou o jogo avisa em português qual arquivo e qual item corrigir.

### Regras gerais

- **JSON é exigente:** textos entre aspas duplas `"…"`, vírgula entre os itens e **sem vírgula depois do último**. Para usar aspas dentro de um texto, prefira as aspas curvas “assim”.
- Cada item tem um **`id`** (ex.: `"m04-mochila"`). Os arquivos se ligam pelo `id`, nunca pelo texto. Pode mudar os textos à vontade; mudar um `id` exige mudar também onde ele é usado.
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
| `minijogo` | No lugar da `pergunta`: `"kit"` abre o minijogo da mochila (de `kit-items.json`). Cada missão tem **ou** `pergunta` **ou** `minijogo`, nunca os dois |
| `aprendizado` | Um tópico curto com o que foi aprendido, para o resumo da tela final |

**Atenção no eixo `durante`:** a parte baixa da cidade fica alagada, então as missões desse eixo precisam ir para instituições da parte alta. Hoje, o Mercado e a Rádio ficam na parte alagada. Se uma missão de `durante` apontar para uma delas, o jogo avisa qual missão corrigir.

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

### `kit-items.json` — minijogo da mochila de emergência

O jogador toca nos itens da prateleira para colocar ou tirar da mochila. A mochila tem espaço exato para **todos os itens com `"levar": true`, e só eles**: cada item que não é prioridade ocupa o lugar de um útil. Ao fechar a mochila, o jogo mostra o que faltou, o que não precisava levar e o que ficou bom, com a `explicacao` de cada item. Se não estiver tudo certo, o jogador arruma de novo; conta como acerto de primeira quando a primeira mochila fechada já está certa.

Tem duas partes:

- **`mochila`**: o `titulo` e a `instrucao` que aparecem no alto da tela do minijogo.
- **`itens`**: a lista de itens (aparecem embaralhados na prateleira).

| Campo do item | O que é |
|---|---|
| `id` | Id do item. Também escolhe o desenho (veja abaixo) |
| `nome` | Nome que aparece no jogo |
| `espaco` | Quanto ocupa na mochila: um número inteiro, de `1` para cima |
| `levar` | `true` = é útil e precisa ir na mochila; `false` = não é prioridade ou atrapalha |
| `explicacao` | Uma frase curta sobre o item, mostrada no resultado |

Para mudar o tamanho da mochila, mude o `espaco` dos itens úteis: o espaço total é a soma deles. Os desenhos dos itens ficam em [`src/minigames/kitIcons.ts`](src/minigames/kitIcons.ts), pelo `id`. Um item novo, sem desenho próprio, aparece com o desenho de uma caixa.

### `creditos.json` — tela de créditos

Não é conteúdo educativo, mas fica aqui para a equipe editar sem programar. É uma lista de seções, mostradas na ordem do arquivo, embaixo do nome do jogo:

| Campo da seção | O que é |
|---|---|
| `titulo` | Título da seção (ex.: `"Realização"`) |
| `linhas` | Uma ou mais linhas de texto, cada uma num parágrafo (ex.: nomes de pessoas ou instituições) |

Exemplo de seção:

```json
{
  "titulo": "Realização",
  "linhas": ["Nome da equipe", "Nome da escola"]
}
```

As seções que estão com "A definir" têm um `todoValidar` dizendo o que falta preencher.

O nome do jogo fica em [`src/config.ts`](src/config.ts) (`GAME_NAME`). Ele aparece na aba do navegador, na tela inicial e nos créditos.

## Como mexer no mapa da cidade

A cidade é fixa (não muda a cada partida), para o professor saber onde fica cada coisa. O mapa é um desenho em texto no arquivo [`src/world/layout.ts`](src/world/layout.ts), com duas grades do mesmo tamanho (30 × 30):

- **`LAYOUT_TYPES`**: o que tem em cada quadradinho. Cada letra ou símbolo tem um significado, listado no começo do arquivo: rua, casa, árvore, rio e assim por diante. Cada instituição é um retângulo de letras iguais, por exemplo `A` para o Abrigo, e precisa de exatamente um `*` encostado nele. O `*` marca a rua em frente à porta.
- **`LAYOUT_LEVELS`**: a altura do terreno em cada quadradinho, de `0` (fundo do rio) a `9` (topo do morro). O nível `1` é a parte baixa, que alaga na fase "Durante o evento". A ponte fica na altura das ruas das pontas, então também alaga. Rua de nível `2` ou mais fica seca.

Regras:
- Todas as linhas precisam ter o mesmo número de caracteres.
- Só a rua (`#` e `*`), a praça (`+`) e a ponte (`=`) são caminháveis.
- Se algo estiver errado, como uma letra desconhecida ou uma instituição sem porta, o jogo mostra no console do navegador qual linha e qual coluna corrigir.

A aparência de cada instituição (cor, ícone e formato do prédio) fica em [`src/world/institutions.ts`](src/world/institutions.ts). Os nomes e personagens ficam em [`content/institutions.json`](content/institutions.json).

## Estrutura

```
index.html            página principal
content/              texto educativo e créditos (ver "Como editar o conteúdo")
src/
  main.ts             liga tudo: conteúdo, cidade, câmera, personagem, missões e interface
  config.ts           nome do jogo e constantes (câmera, render, mundo, personagem, cores, clima e chuva)
  style.css           cores e fontes (variáveis CSS) e estilos da interface
  core/               loop, entrada (teclado/mouse/toque), câmera, renderer, save (progresso e escolha do som)
  audio/
    sound.ts          som gerado por código: chuva, pin, dado, acerto e o liga/desliga
  missions/
    content.ts        lê content/*.json (e os créditos) e confere as ligações por id
    missionManager.ts missão atual, pins e acertos de primeira
    missionFlow.ts    o loop: missão → porta → diálogo → pergunta (ou minijogo) → pin → próxima
  minigames/
    kitMinigame.ts    minijogo da mochila de emergência (prateleira, mochila, resultado)
    kitIcons.ts       desenhos dos itens da mochila
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
    missionHud.ts     barra da missão no topo, painel de pins e botão de som
    dialogue.ts       caixa de diálogo e pergunta
    cards.ts          cartões (missão, pin, eixo), confirmação, botão de som e janelas com foco preso
    edgeArrow.ts      seta na borda da tela apontando o destino
    titleScreen.ts    tela inicial e créditos
    pauseMenu.ts      botão e menu de pausa
    endScreen.ts      tela final (pins, acertos de primeira e resumo por eixo)
    howToPlay.ts      janela "Como jogar"
  world/
    layout.ts         mapa da cidade em texto (tipos e alturas)
    cityMap.ts        lê o mapa: tiles, alturas, instituições e portas
    city.ts           monta a cidade inteira
    terrain.ts        terreno e laterais da maquete
    water.ts          água do rio (nível e cor)
    climate.ts        clima de cada eixo (céu, luzes, rio, chuva) e ruas alagadas
    rain.ts           chuva (riscos que acompanham a câmera)
    buildings.ts      prédios das instituições e placas com ícone
    institutions.ts   cor, ícone e formato de cada instituição
    icons.ts          desenhos dos ícones (placas 3D e interface)
    markers.ts        seta flutuante e anel na porta da missão atual
    decor.ts          casas, prédios, árvores e ponte
    scene.ts          céu e luzes
```
