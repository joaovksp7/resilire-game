# Resilire — Cidade Resiliente

Jogo educativo para navegador sobre **enchentes e deslizamentos**, para estudantes do ensino fundamental II e médio dos Vales do Rio Pardo e Taquari (RS). O jogador anda por uma cidade 3D, recebe missões e visita instituições que ensinam como agir antes e durante um evento climático extremo.

- Game design completo: [`prompt-jogo-desastres-climaticos.md`](prompt-jogo-desastres-climaticos.md) (o plano original), [`plano-parte-2.md`](plano-parte-2.md) (até 4 jogadores, em equipe) e [`plano-parte-3.md`](plano-parte-3.md) (uma atividade diferente em cada parada), com o roteiro das cenas em [`Tabuleiro Digital.docx (1).md`](<Tabuleiro Digital.docx (1).md>)
- Regras para quem desenvolve: [`CLAUDE.md`](CLAUDE.md) / [`AGENTS.md`](AGENTS.md)

> **Status:** Parte 3 concluída (Fases 15 a 21). De 1 a 4 jogadores no mesmo aparelho, em equipe, cada um com o seu peão e a sua missão, passando a vez a cada jogada do dado. São 10 paradas, cada lugar uma vez só, em quatro eixos (Alerta, Preparação, Durante o evento e Depois do evento), com o clima mudando a cada eixo. Cada visita abre com uma carta sobre o que o lugar faz, segue com a conversa e termina numa atividade diferente em cada parada (ordenar, mochila, história, classificar, mapa de risco, ligação, mensagens, jogo da memória e caça-palavras; o Abrigo de animais fica com uma pergunta). Os pins são da equipe e mostram quem buscou cada um; o progresso fica salvo. O jogo tem tela inicial, Como jogar, pausa, tela final, créditos e som gerado por código.
>
> **Antes de publicar:** todo o texto educativo é rascunho e precisa ser validado com a Defesa Civil, e o de saúde e primeiros socorros também com a área da saúde (veja os campos `todoValidar` em `content/`). Os créditos ainda estão "A definir" (veja `content/creditos.json`). Faltam os testes com aparelho de verdade (veja [Antes de publicar](#antes-de-publicar-testes-com-aparelho-de-verdade)).

---

## Como rodar

Precisa do [Node.js](https://nodejs.org/) **20.19 ou mais novo** (recomendado: 22 LTS).

```bash
npm install     # só na primeira vez
npm run dev     # abre o servidor de desenvolvimento
```

Depois, abra o endereço que aparecer no terminal (normalmente `http://localhost:5173`).

### Telas

- **Tela inicial:** o nome do jogo sobre uma cena animada desenhada em código (nuvens, sol, garoa leve, rio e os peões pulando, um para cada jogador escolhido). Com `prefers-reduced-motion`, a cena fica parada. Na primeira vez, mostra **Quantos vão jogar?** (de 1 a 4, começando no número da última partida) e **Jogar**. Com 1, vai direto para a cidade. Com 2 ou mais, abre **Quem vai jogar?**, com um campo de nome por jogador (opcional, até 12 letras; vazio vira "Jogador 1", "Jogador 2"…) e a cor do peão. Se já houver progresso, mostra quem está jogando, os pins, **Continuar** e **Novo jogo**; depois de completar tudo, **Ver resultado** e **Jogar de novo**. Novo jogo e Jogar de novo apagam o progresso depois de confirmar e voltam ao seletor. Sempre tem **Como jogar**, **Créditos** e **Som** (liga e desliga). Se o navegador não deixar salvar o progresso, uma linha avisa.
- **Pausa:** botão ⏸ no alto da tela (ou `Esc`). Tem **Continuar**, **Como jogar**, **Ver resultado** (só depois de completar tudo), **Começar de novo**, **Som** e **Tela inicial**. **Começar de novo** apaga o progresso e volta à tela inicial, já com o seletor. Na pausa e na tela inicial, o personagem e o dado ficam parados.
- **Painel de pins:** os pins conquistados e, com 2 ou mais jogadores, quem buscou cada um e as missões em andamento, com quem cuida de cada uma.
- **Tela final:** aparece depois da última missão, com os pins (cada um mostra o lugar e a atividade feita lá, como "Defesa Civil · Mapa de risco"), os acertos de primeira e um resumo do que foi aprendido em cada eixo (o campo `aprendizado` de cada missão). Com 2 ou mais jogadores, diz "A equipe completou todas as missões!", mostra os nomes da equipe e quem buscou cada pin, sem ranking nem vencedor. Dá para **Jogar de novo** (volta à tela inicial, já com o seletor) ou **Fechar** e continuar andando pela cidade.
- **Como jogar:** o objetivo (carta do local, conversa, atividade e pin), o dado, os eixos, **Jogando em grupo**, **As atividades** (tudo por toque, sem arrastar, e pelo teclado) e os controles.

"Novo jogo", "Começar de novo" e "Jogar de novo" sempre pedem confirmação antes de apagar o progresso.

### Controles

O personagem anda **por dado**, como num jogo de tabuleiro:

1. Jogue o dado (de 1 a 6). Ele cai rolando ao lado do personagem.
2. As casas que dá para alcançar com até aquele número de passos ficam destacadas em azul no chão.
3. Escolha uma delas e o personagem anda casa por casa até lá. Não precisa usar todos os passos.

Com 2 ou mais jogadores, cada um tem o seu peão e todos começam na porta de casa. Uma vez é uma jogada do dado: ao chegar, a vez passa para o próximo, na ordem da tela inicial. Só o peão da vez anda, e ele tem um anel no chão; a câmera vai até ele e o rodapé mostra de quem é a vez, com o número e a cor do jogador. Peões não bloqueiam o caminho uns dos outros e, na mesma casa, ficam lado a lado.

Cada jogador cuida de uma missão diferente, ao mesmo tempo, na ordem de `missions.json`. No começo, as missões são distribuídas na ordem da vez, a partir do Jogador 1. **Quem parar na porta de qualquer missão em andamento faz a visita**, seja a sua ou a de um colega. Depois da visita, o dono da missão recebe a próxima livre, mesmo que seja do eixo seguinte, e quem fez a visita continua com a sua. Só quando não sobra missão livre (no fim do jogo) ele passa a ajudar a equipe. O eixo (clima, rio e ruas alagadas) só muda quando todas as missões dele acabam, então uma missão adiantada do eixo seguinte é feita ainda com o clima do eixo atual. O cartão da missão aparece no começo da vez de quem a recebeu, e quem já está na porta de uma missão em andamento faz a visita sem jogar o dado. Para quem ajuda, a barra do topo mostra "Ajudando a equipe", e "Ir rumo ao objetivo" e a seta da borda levam à missão mais perto.

| Ação | Computador | Celular |
|---|---|---|
| Jogar o dado | Botão "Jogar dado", `Enter` ou `Espaço` | Tocar em "Jogar dado" |
| Escolher a casa | Clicar numa casa destacada | Tocar numa casa destacada |
| Ir até uma instituição | Clicar no prédio (se a porta estiver destacada) | Tocar no prédio |
| Ir rumo ao objetivo (só teclado) | Depois de jogar o dado, `Tab` até "Ir rumo ao objetivo" e `Enter` | — |
| Ver os pins | Botão de pins no canto de cima | Tocar no botão de pins |
| Pausar | Botão de pausa (⏸) ou `Esc` | Tocar no botão de pausa |
| Ligar ou desligar o som | Botão de som (alto-falante) ou `M` | Tocar no botão de som |
| Começar de novo | Menu de pausa, ou "Novo jogo" na tela inicial | Menu de pausa, ou "Novo jogo" na tela inicial |
| Mover a câmera | `W` `A` `S` `D` ou setas | — |
| Zoom | Roda do mouse | Pinça com dois dedos |

A cada jogada, a câmera volta a seguir o personagem. Toda instituição com missão em andamento tem uma seta flutuando em cima, e a porta dela aparece em amarelo entre as casas destacadas. Quando o destino do jogador da vez está fora da tela, uma seta na borda aponta para onde ir.

Telas, menus, diálogos, perguntas, as atividades, cartões e o painel de pins funcionam só com teclado (`Tab`, `Enter`, `Espaço`; `Esc` fecha o painel de pins, a pausa, Como jogar, os créditos e a tela final). No caça-palavras, a grade é uma parada só do `Tab`, e as setas andam pelas letras. Nenhuma atividade precisa de arrastar: toca-se no cartão e depois no lugar.

### As missões

São 10 missões, uma em cada instituição, entregues nesta ordem:

| Ordem | Missão | Eixo | Instituição |
|---|---|---|---|
| 1 | Estou preparado? | Alerta | Casa (atividade "Plano da família": pôr os passos em ordem) |
| 2 | Compras conscientes | Preparação | Mercado (atividade da mochila) |
| 3 | Um lugar seguro | Preparação | Abrigo (atividade "Chegada ao abrigo": uma história com momentos de "O que você faz?") |
| 4 | Conhecimento que protege | Preparação | Escola (atividade "Seguro ou perigoso?": separar atitudes em colunas) |
| 5 | Informação e prevenção | Durante o evento | Defesa Civil (atividade "Mapa de risco": achar as áreas de risco no mapa da cidade) |
| 6 | Segurança em primeiro lugar | Durante o evento | Bombeiros (atividade "Ligação para o 193": escolher o número e conversar com o atendente) |
| 7 | Informação salva vidas | Durante o evento | Rádio (atividade "Confiável ou boato?": decidir se dá para confiar em cada mensagem) |
| 8 | Cuidar também é prevenir | Depois do evento | UBS (atividade "Jogo da memória": formar pares de situação e cuidado) |
| 9 | Animal perdido | Depois do evento | Abrigo de animais |
| 10 | Primeiros socorros | Depois do evento | Hospital (atividade "Caça-palavras": achar as palavras dos primeiros socorros) |

Todos os peões começam na porta de casa, então o Jogador 1 faz a visita da Casa logo na primeira vez, sem jogar o dado. Cada visita segue esta ordem: a carta do local (o que aquele lugar faz pela cidade), a conversa com o personagem, a pergunta ou a atividade e o pin.

### Clima em cada eixo

| Eixo | Na cidade |
|---|---|
| Alerta | Céu nublado, chuva fraca |
| Preparação | Chuva moderada, o rio sobe um pouco |
| Durante o evento | Chuva forte, o rio transborda e alaga a parte baixa da cidade (a beira-rio, onde fica a casa do jogador, a baixada no meio da rua principal, a ponte e o outro lado do rio) |
| Depois do evento | A chuva para, o céu clareia e a água baixa: as ruas da parte baixa voltam a ficar secas |

Ao passar para um novo eixo, o clima muda aos poucos atrás do cartão do eixo. Em "Durante o evento", as ruas alagadas não aparecem entre as casas destacadas pelo dado: o caminho tem que ser pela parte alta. Tocar numa rua alagada mostra um aviso. Quem estiver numa rua que alagou vai para a rua seca mais perto.

Para quem pediu menos animação no sistema (`prefers-reduced-motion`), a chuva é mais calma, o clima muda na hora, os pins aparecem sem animação e a cena da tela inicial fica parada. No celular, a chuva tem menos gotas, para não pesar. As cores, a luz, o nível da água e a quantidade de chuva de cada eixo ficam em [`src/config.ts`](src/config.ts) (`CLIMATE` e `RAIN`).

### Som

Todo o som é gerado por código (Web Audio API), sem nenhum arquivo de áudio:

- **Chuva:** acompanha a chuva de cada eixo — mais baixa em "Alerta", mais forte em "Durante o evento".
- **Pin conquistado:** quatro notas subindo.
- **Dado:** batidinhas ao jogar e quando ele para no chão.
- **Acerto:** duas notas curtas quando a pergunta ou a atividade fica certa. Errar não tem som, para não soar como castigo.

O som começa **ligado**, mas só toca depois do primeiro clique, toque ou tecla (regra dos navegadores). Para ligar ou desligar: o botão de som no alto da tela (ao lado dos pins e da pausa), a tecla `M`, ou o botão **Som** na tela inicial e no menu de pausa. A escolha fica guardada no navegador, à parte do progresso: "Começar de novo" não muda o som. Com a aba escondida, o som para.

No iPhone, a chave de silencioso do aparelho também corta o som do jogo. Os volumes (geral, chuva e efeitos) ficam em [`src/config.ts`](src/config.ts) (`AUDIO`).

### Progresso salvo

O jogo salva sozinho, a cada vez: quem está jogando, de quem é a vez, onde está cada peão, a missão de cada jogador, os pins com quem buscou e os acertos de primeira. Ao recarregar a página, **Continuar** volta exatamente de onde parou (cada jogador vê de novo o cartão da sua missão, como lembrete). O formato é a versão 3 (chave `resilire-game:progresso:v3`), que chegou com o roteiro novo das missões; a partida salva por uma versão antiga do jogo (`v1`, de um jogador só, ou `v2`, com as missões de antes) é ignorada e começa do zero, e a escolha do som continua. Se o navegador bloquear o armazenamento (acontece dentro de iframe em alguns navegadores), o jogo funciona normalmente, mas o progresso some ao recarregar (a tela inicial avisa). Para recomeçar, use "Começar de novo" no menu de pausa ou "Novo jogo" na tela inicial.

Os nomes da última equipe ficam guardados à parte, só neste navegador, e voltam preenchidos na partida seguinte. Nada sai do aparelho.

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

O jogo se ajusta sozinho ao tamanho do iframe. A roda do mouse não rola a página do site: sobre a cidade ela dá zoom; sobre os menus e as janelas, rola só o texto da janela, quando ele é comprido.

## Antes de publicar: testes com aparelho de verdade

Os testes automáticos já passaram, no Chrome e no Firefox, num computador:
- as 10 paradas do começo ao fim, com 1, 2, 3 e 4 jogadores, jogando o dado;
- todas as atividades só com toque (sem arrastar) e só com teclado, a 360px;
- o jogo dentro de um iframe de outro site;
- o jogo sem `localStorage`;
- nenhum erro no console.

O que só dá para conferir com aparelho e pessoas de verdade:

| O quê | Como conferir | O que esperar |
|---|---|---|
| Celular (Android e iPhone) | Abrir o jogo no navegador do celular, na vertical, e fazer algumas visitas | Tudo cabe na tela sem rolar para o lado. Cada atividade se faz só tocando. As letras do caça-palavras (cerca de 35px a 360px de largura) dão para tocar sem errar |
| Chromebook da escola | Jogar no Chrome do Chromebook, com e sem a tela de toque | A cidade não trava, nem com a chuva forte de "Durante o evento" (meta: no mínimo 30 fps) |
| Computador fraco do laboratório | O mesmo do Chromebook | O mesmo do Chromebook |
| Leitor de tela | NVDA (Windows), TalkBack (Android) ou ChromeVox (Chromebook): fazer uma visita inteira | Lê a carta, as falas, cada botão e o resultado de cada atividade |
| Dentro do WordPress | Incorporar como em [Como incorporar](#como-incorporar-em-uma-página-iframe), na página real | O jogo abre e salva o progresso (ou avisa que não salva). A roda do mouse sobre a cidade dá zoom, e a página do site não rola nem sobre a cidade nem sobre os menus |
| Partida com 4 alunos | Cronometrar uma partida de 4 alunos, do começo à tela final | Meta do plano: de 15 a 25 minutos |

**Estimativa do tempo da partida:**
- Na partida automática com 4 jogadores, foram 69 jogadas de dado e 10 visitas.
- Contando uns 7 segundos por jogada (jogar, escolher a casa e andar) e de 1,5 a 2,5 minutos por visita (carta, conversa e atividade), a partida fica entre **23 e 33 minutos**.
- Isso pode passar da meta. A medição com alunos decide se é preciso encurtar alguma coisa.

## Como editar o conteúdo

Todo o texto educativo fica em arquivos JSON na pasta [`content/`](content/), junto com o texto dos créditos. Dá para editar sem programar, com qualquer editor de texto.

**Depois de editar, rode `npm run build`** (o conteúdo vai junto no build). Se algo estiver errado, o build ou o jogo avisa em português qual arquivo e qual item corrigir.

### Regras gerais

- **JSON é exigente:** textos entre aspas duplas `"…"`, vírgula entre os itens e **sem vírgula depois do último**. Para usar aspas dentro de um texto, prefira as aspas curvas “assim”.
- Cada item tem um **`id`** (ex.: `"m02-mochila"`). Os arquivos se ligam pelo `id`, nunca pelo texto. Pode mudar os textos à vontade; mudar um `id` exige mudar também onde ele é usado.
- **`todoValidar`** (opcional, em qualquer item): anota o que ainda precisa ser confirmado com a Defesa Civil. Não aparece no jogo. Apague o campo quando a informação for validada.
- JSON não aceita comentários (`//`); por isso as pendências ficam no `todoValidar`.

### `institutions.json` — instituições e personagens

Uma lista com as 10 instituições do mapa (os `id` são fixos: `defesa-civil`, `bombeiros`, `escola`, `ubs`, `abrigo`, `radio`, `mercado`, `hospital`, `abrigo-animais`, `casa`). O CRAS saiu do jogo na Parte 3.

| Campo | O que é |
|---|---|
| `id` | Id fixo da instituição (não mudar) |
| `nome` | Nome que aparece no jogo (ex.: `"Defesa Civil"`) |
| `nomeComPreposicao` | O nome com "na/no/em", para frases como "Você está **na Defesa Civil**" |
| `personagem.nome` | Nome de quem conversa com o jogador |
| `personagem.funcao` | Função, que aparece embaixo do nome (ex.: `"agente da Defesa Civil"`) |
| `carta` | Texto curto sobre o que o lugar faz. Aparece numa carta, com o ícone e a cor da instituição, no começo de cada visita, antes da conversa |

A cor, o ícone e o formato do prédio ficam no código ([`src/world/institutions.ts`](src/world/institutions.ts)).

### `missions.json` — eixos e missões

Tem duas listas:

- **`eixos`**: os quatro eixos, **sempre nesta ordem e com estes `id`**: `alerta`, `preparacao`, `durante`, `depois`. Cada um tem `nome` e `descricao` (o texto do cartão que aparece quando o jogo passa para aquele eixo).
- **`missoes`**: as missões, **na ordem em que são entregues aos jogadores**. As missões de um eixo vêm todas antes das do próximo. Com 1 jogador, é a ordem em que elas são feitas; com 2 ou mais, dentro de um eixo elas podem terminar em qualquer ordem.

| Campo da missão | O que é |
|---|---|
| `id` | Id da missão |
| `eixo` | `alerta`, `preparacao`, `durante` ou `depois` |
| `titulo` | Título da missão |
| `descricao` | O que o jogador precisa fazer (aparece no cartão da missão) |
| `instituicao` | `id` da instituição de destino (de `institutions.json`) |
| `dialogo` | `id` do diálogo (de `dialogues.json`) |
| `pergunta` | `id` da pergunta (de `questions.json`) |
| `atividade` | No lugar da `pergunta`: `id` da atividade (de `atividades.json`), por exemplo `"a02-mochila"`. Cada missão tem **ou** `pergunta` **ou** `atividade`, nunca as duas. (Este campo se chamava `minijogo`, com o valor `"kit"`.) |
| `aprendizado` | Um tópico curto com o que foi aprendido, para o resumo da tela final |

**Atenção no eixo `durante`:** a parte baixa da cidade fica alagada, então as missões desse eixo precisam ir para instituições da parte alta. Hoje, a Casa e o Mercado ficam na parte alagada. Se uma missão de `durante` apontar para uma delas, o jogo avisa qual missão corrigir. No eixo `depois` a água baixa, e a cidade toda volta a ficar seca.

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

### `atividades.json` — atividades das missões

Uma lista de atividades. Uma missão com `atividade` no lugar da `pergunta` abre uma delas depois do diálogo.

| Campo | O que é |
|---|---|
| `id` | Id da atividade (ex.: `"a02-mochila"`) |
| `tipo` | Qual atividade é: `mochila`, `ordenar`, `classificar`, `historia`, `chamada`, `cena`, `mensagens`, `memoria` ou `caca-palavras` |
| `titulo`, `instrucao` | O título e a instrução que aparecem no alto da tela (menos na `mochila`) |

Os outros campos dependem do tipo. Em todos, errar não reprova: o jogo mostra a explicação e deixa tentar de novo, e conta como acerto de primeira quando a primeira conferida já está certa.

**`mochila`** — só tem `id` e `tipo`. O título, a instrução e os itens ficam em `kit-items.json` (veja abaixo), para o mesmo texto não ficar em dois lugares.

```json
{
  "id": "a02-mochila",
  "tipo": "mochila"
}
```

**`ordenar`** — pôr passos em ordem. Os passos aparecem embaralhados e o aluno toca neles na ordem certa. Ao conferir, cada passo fora do lugar mostra a sua `explicacao` (se estiver tudo certo, aparecem todas).

| Campo | O que é |
|---|---|
| `passos` | De 3 a 8 passos, cada um com `texto` e `explicacao`. **A ordem no arquivo é a ordem certa**: o jogo embaralha na hora de mostrar |

```json
{
  "id": "a01-plano-familia",
  "tipo": "ordenar",
  "titulo": "Plano da família",
  "instrucao": "Toque nos passos na ordem certa.",
  "passos": [
    { "texto": "Primeiro passo", "explicacao": "Por que ele vem primeiro." },
    { "texto": "Segundo passo", "explicacao": "Por que ele vem depois." },
    { "texto": "Terceiro passo", "explicacao": "Por que ele vem por último." }
  ]
}
```

**`classificar`** — separar cartões em colunas. O aluno toca num cartão e depois na coluna (não precisa arrastar). Ao conferir, cada cartão na coluna errada mostra a sua `explicacao` e volta para a pilha.

| Campo | O que é |
|---|---|
| `grupos` | Os nomes das colunas: 2 ou 3 (ex.: `["Seguro", "Perigoso"]`) |
| `cartoes` | De 3 a 8 cartões, cada um com `texto`, `grupo` e `explicacao`. **`grupo` é o número da coluna certa, contando a partir de 0** (no exemplo, `0` = Seguro e `1` = Perigoso). Toda coluna precisa de pelo menos um cartão |

```json
{
  "id": "a04-seguro-ou-perigoso",
  "tipo": "classificar",
  "titulo": "Seguro ou perigoso?",
  "instrucao": "Toque num cartão e depois na coluna.",
  "grupos": ["Seguro", "Perigoso"],
  "cartoes": [
    {
      "texto": "Atravessar a rua alagada a pé",
      "grupo": 1,
      "explicacao": "Rua alagada não se atravessa, nem a pé, nem de carro."
    }
  ]
}
```

**`historia`** — uma história curta, com momentos de "O que você faz?" um depois do outro. Cada momento funciona como uma pergunta: as alternativas aparecem embaralhadas, e a errada mostra a sua `explicacao` e deixa tentar de novo. No fim, aparece o resumo com a resposta certa de cada momento. Conta como acerto de primeira quando todos os momentos foram acertados na primeira tentativa.

| Campo | O que é |
|---|---|
| `momentos` | De 2 a 4 momentos, na ordem da história. Cada um tem `situacao` (o que está acontecendo), `alternativas` (de 2 a 4, cada uma com `texto` e `explicacao`) e `correta` |
| `correta` | **O número da alternativa certa, contando a partir de 0**, como nas perguntas |

```json
{
  "id": "a03-chegada-abrigo",
  "tipo": "historia",
  "titulo": "Chegada ao abrigo",
  "instrucao": "Leia cada momento e escolha o que você faz.",
  "momentos": [
    {
      "situacao": "O que está acontecendo neste momento.",
      "alternativas": [
        { "texto": "A atitude certa", "explicacao": "Por que ela é a certa." },
        { "texto": "Outra atitude", "explicacao": "Por que não é a melhor escolha." }
      ],
      "correta": 0
    }
  ]
}
```

**`chamada`** — uma ligação, com cara de tela de celular. Primeiro o aluno escolhe o número (`discagem`); depois o atendente fala, um momento por vez, e o aluno escolhe a resposta. As falas do atendente e as respostas certas aparecem em balões, como numa conversa. Erro e acerto de primeira funcionam como na `historia`.

| Campo | O que é |
|---|---|
| `atendente` | Quem atende a ligação. Aparece no alto da tela e em cada fala (ex.: `"Atendente do 193"`) |
| `discagem` | A escolha do número. Tem o mesmo formato de um momento: `situacao` (a pergunta), `alternativas` (os números, cada um com `explicacao`) e `correta`. **Os números aparecem na ordem do arquivo**, como num teclado, sem embaralhar |
| `momentos` | De 2 a 4 momentos, como na `historia`. Aqui a `situacao` é o que o atendente fala, e cada alternativa é uma resposta |

```json
{
  "id": "a06-ligacao-193",
  "tipo": "chamada",
  "titulo": "Ligação para o 193",
  "instrucao": "Ligue para pedir ajuda e responda ao atendente.",
  "atendente": "Atendente do 193",
  "discagem": {
    "situacao": "Para qual número você liga?",
    "alternativas": [
      { "texto": "190", "explicacao": "De quem é este número." },
      { "texto": "193", "explicacao": "Por que este é o número certo." }
    ],
    "correta": 1
  },
  "momentos": [
    {
      "situacao": "O que o atendente fala.",
      "alternativas": [
        { "texto": "A resposta certa", "explicacao": "Por que ela ajuda." },
        { "texto": "Outra resposta", "explicacao": "Por que não ajuda." }
      ],
      "correta": 0
    }
  ]
}
```

**`cena`** — o mapa de risco. Um mapa da cidade desenhado no código, com pontos numerados para tocar (cada ponto é um botão, e uma legenda embaixo diz o nome de cada número). O aluno precisa achar todas as áreas de risco. Tocar num ponto mostra a sua `explicacao`; tocar num ponto que não é de risco mostra por que não é e faz a atividade não contar como acerto de primeira. Quando todas as áreas de risco foram achadas, aparece a `conclusao`.

| Campo | O que é |
|---|---|
| `pontos` | De 3 a 8 pontos, cada um com `id`, `nome`, `risco` e `explicacao`. **`id` diz onde o ponto fica no desenho** e precisa ser um destes: `beira-rio`, `encosta`, `baixada`, `casa`, `parte-alta`, `abrigo`. `risco` é `true` (é área de risco: precisa ser achado) ou `false` (não é). Pelo menos um ponto precisa ter `risco: true` |
| `conclusao` | O texto do fim, quando todas as áreas de risco foram achadas |

O desenho do mapa e a posição dos pontos ficam no código (`src/minigames/spotScenes.ts`). Para mudar o nome ou o texto de um ponto, ou dizer se ele é de risco, basta mudar este arquivo; para pôr um ponto num lugar novo do mapa, é preciso mexer no código.

```json
{
  "id": "a05-mapa-risco",
  "tipo": "cena",
  "titulo": "Mapa de risco",
  "instrucao": "Toque nos pontos do mapa e ache todas as áreas de risco.",
  "pontos": [
    { "id": "beira-rio", "nome": "Beira do rio", "risco": true, "explicacao": "Por que é área de risco." },
    { "id": "parte-alta", "nome": "Parte alta", "risco": false, "explicacao": "Por que não é área de risco." }
  ],
  "conclusao": "O que o aluno descobriu e o que fazer agora."
}
```

**`mensagens`** — confiável ou boato. As mensagens chegam uma por vez, num celular, com quem mandou. Para cada uma, o aluno escolhe um dos dois botões. Errar mostra a `explicacao` e deixa tentar de novo; acertar também mostra a `explicacao` e marca a resposta certa embaixo da mensagem. Conta como acerto de primeira quando todas foram acertadas na primeira tentativa.

| Campo | O que é |
|---|---|
| `respostas` | O texto dos dois botões: `confiar` (ex.: `"Pode confiar"`) e `conferir` (ex.: `"Conferir antes de repassar"`) |
| `mensagens` | De 3 a 8 mensagens, na ordem em que chegam. Cada uma tem `de` (quem mandou), `texto`, `confiavel` e `explicacao`. `confiavel` é `true` (a resposta certa é `confiar`) ou `false` (a resposta certa é `conferir`) |

```json
{
  "id": "a07-confiavel-ou-boato",
  "tipo": "mensagens",
  "titulo": "Confiável ou boato?",
  "instrucao": "Para cada mensagem, escolha: dá para confiar ou é melhor conferir antes de repassar?",
  "respostas": {
    "confiar": "Pode confiar",
    "conferir": "Conferir antes de repassar"
  },
  "mensagens": [
    {
      "de": "Quem mandou",
      "texto": "O que a mensagem diz.",
      "confiavel": false,
      "explicacao": "Por que é melhor conferir antes."
    }
  ]
}
```

**`memoria`** — jogo da memória. As cartas aparecem viradas para baixo e embaralhadas; cada par tem uma carta de situação e uma de cuidado. Duas cartas que formam par ficam viradas e mostram a `explicacao`. Duas que não formam par ficam viradas até o próximo toque (nada vira sozinho depois de um tempo). Sem cronômetro, e conta sempre como acerto de primeira: virar a carta errada faz parte do jogo.

| Campo | O que é |
|---|---|
| `pares` | De 4 a 6 pares, cada um com `situacao` (o texto de uma carta), `cuidado` (o texto da outra carta) e `explicacao` (aparece quando o par é achado). Textos curtos cabem melhor nas cartas |

```json
{
  "id": "a08-memoria-saude",
  "tipo": "memoria",
  "titulo": "Jogo da memória",
  "instrucao": "Vire as cartas e forme os pares: cada situação tem um cuidado.",
  "pares": [
    {
      "situacao": "Uma situação",
      "cuidado": "O cuidado certo para ela",
      "explicacao": "Por que esse é o cuidado certo."
    }
  ]
}
```

**`caca-palavras`** — caça-palavras. O jogo monta a grade sozinho, com as palavras só na horizontal e na vertical, na ordem de leitura (sem diagonal e sem escrita de trás para frente), e preenche o resto com letras sorteadas. O aluno toca na primeira e na última letra de cada palavra. A lista fica à vista e vai sendo riscada, e cada palavra achada mostra a sua `explicacao`. Conta sempre como acerto de primeira: tocar na letra errada faz parte do jogo.

| Campo | O que é |
|---|---|
| `palavras` | De 3 a 8 palavras, cada uma com `palavra` e `explicacao`. **Escreva a palavra certo, com acento**: a lista mostra assim, e a grade usa a mesma palavra sem acento (Ç vira C, Ã vira A). Cada palavra tem de 3 a 12 letras, só letras (sem espaço, hífen ou número), e não pode estar dentro de outra da lista |

A grade tem 8 colunas (para caber no celular) e pelo menos 8 linhas; uma palavra com mais de 8 letras fica na vertical, e a grade cresce até 12 linhas. Se as palavras não couberem, o jogo avisa ao abrir.

```json
{
  "id": "a10-caca-palavras",
  "tipo": "caca-palavras",
  "titulo": "Caça-palavras",
  "instrucao": "Toque na primeira e na última letra de cada palavra.",
  "palavras": [
    { "palavra": "SOCORRO", "explicacao": "O que esta palavra quer dizer aqui." },
    { "palavra": "PROTEÇÃO", "explicacao": "O que esta palavra quer dizer aqui." }
  ]
}
```

### `kit-items.json` — atividade da mochila de emergência (tipo `mochila`)

O jogador toca nos itens da prateleira para colocar ou tirar da mochila. A mochila tem espaço exato para **todos os itens com `"levar": true`, e só eles**: cada item que não é prioridade ocupa o lugar de um útil. Ao fechar a mochila, o jogo mostra o que faltou, o que não precisava levar e o que ficou bom, com a `explicacao` de cada item. Se não estiver tudo certo, o jogador arruma de novo; conta como acerto de primeira quando a primeira mochila fechada já está certa.

Tem duas partes:

- **`mochila`**: o `titulo` e a `instrucao` que aparecem no alto da tela da atividade.
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
- **`LAYOUT_LEVELS`**: a altura do terreno em cada quadradinho, de `0` (fundo do rio) a `9` (topo do morro). O nível `1` é a parte baixa (onde ficam a casa do jogador e o Mercado), que alaga na fase "Durante o evento". A ponte fica na altura das ruas das pontas, então também alaga. Rua de nível `2` ou mais fica seca.

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
  core/               loop, entrada (teclado/mouse/toque), câmera, renderer, save (progresso da equipe, escolha do som e última equipe)
  audio/
    sound.ts          som gerado por código: chuva, pin, dado, acerto e o liga/desliga
  missions/
    content.ts        lê content/*.json (e os créditos) e confere as ligações por id
    missionManager.ts missões em andamento e de quem é cada uma, pins e acertos de primeira
    missionFlow.ts    o loop: missão → porta → carta do local → diálogo → pergunta (ou atividade) → pin → próxima
  minigames/
    activities.ts     abre a atividade da missão (de content/atividades.json) pelo tipo
    activityPanel.ts  o que as telas das atividades dividem (janela, rodapé, aviso e resultado)
    kitMinigame.ts    atividade da mochila de emergência (prateleira, mochila, resultado)
    orderMinigame.ts  atividade "ordenar" (pôr passos em ordem)
    sortMinigame.ts   atividade "classificar" (separar cartões em colunas)
    storyMinigame.ts  atividades "historia" e "chamada" (momentos de "O que você faz?"; a ligação tem cara de celular)
    spotMinigame.ts   atividade "cena" (mapa de risco: tocar nos pontos do mapa)
    spotScenes.ts     desenho do mapa de risco e a posição de cada ponto (pelo id)
    messagesMinigame.ts atividade "mensagens" (confiável ou boato, num celular)
    memoryMinigame.ts atividade "memoria" (jogo da memória, pares de situação e cuidado)
    wordSearchMinigame.ts atividade "caca-palavras" (monta a grade e confere as palavras achadas)
    kitIcons.ts       desenhos dos itens da mochila
  player/
    character.ts      personagem low-poly e animação de andar
    player.ts         movimento casa por casa (com pulinho), altura do chão e da ponte
    team.ts           a equipe: nomes, números e cores dos jogadores
    pawns.ts          os peões da equipe: de quem é a vez, o anel e quem fica lado a lado na mesma casa
    pathfinding.ts    casas alcançáveis com o dado e caminho na grade de ruas (4 direções)
    dice.ts           dado 3D (pintas desenhadas em código) e a animação de rolar
    diceTurn.ts       a jogada do peão da vez: jogar o dado → escolher casa → andar
    reachHighlight.ts destaques azuis das casas alcançáveis
    clickToMove.ts    descobre o que foi tocado na tela (chão ou prédio)
  ui/
    diceHud.ts        botão "Jogar dado", "Ir rumo ao objetivo", avisos e de quem é a vez
    missionHud.ts     barra da missão no topo, painel de pins (com quem buscou) e botão de som
    dialogue.ts       caixa de diálogo e pergunta
    cards.ts          cartões (missão, pin, eixo), confirmação, botão de som e janelas com foco preso
    edgeArrow.ts      seta na borda da tela apontando o destino
    titleScreen.ts    tela inicial (com o seletor de jogadores) e créditos
    titleScene.ts     cena animada ao fundo da tela inicial
    teamSetup.ts      janela "Quem vai jogar?"
    pauseMenu.ts      botão e menu de pausa
    endScreen.ts      tela final (pins, quem buscou, acertos de primeira e resumo por eixo)
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
    markers.ts        seta flutuante e anel na porta de cada missão em andamento
    decor.ts          casas, prédios, árvores e ponte
    scene.ts          céu e luzes
```
