# Plano — Parte 3: uma atividade diferente em cada parada

Continuação de [`prompt-jogo-desastres-climaticos.md`](prompt-jogo-desastres-climaticos.md) e [`plano-parte-2.md`](plano-parte-2.md). Este arquivo descreve só o que muda. Tudo o que não está aqui continua valendo como está nos planos anteriores. Onde os planos discordam, vale este.

Base: o [`Tabuleiro Digital.docx (1).md`](<Tabuleiro Digital.docx (1).md>), que substitui o `refatoração-jogo.md`. Vale a **ordem da lista do início (1 a 10)**, com o **conteúdo das cenas do roteiro** em cada parada.

> **Status: Fases 15 a 21 prontas (18/11/2026).** Aprovados em 16/11/2026: a ordem das paradas e as mudanças no mapa (seção 2). As decisões da seção 7 seguiram as recomendações marcadas lá e ainda esperam a aprovação da equipe. O conteúdo da seção 4.3 continua com a equipe, e os testes com aparelho de verdade estão no `README.md` ("Antes de publicar").

## 1. Objetivo

Deixar o jogo mais interativo: **cada parada tem um tipo de atividade diferente** e abre com uma **carta sobre a função do local**. Hoje 9 das 10 missões terminam na mesma pergunta de múltipla escolha, e só o Mercado tem minijogo (a mochila).

## 2. O que muda

- **10 paradas, cada instituição uma vez só.** Hoje os Bombeiros têm duas missões.
- **Sai o CRAS. Entram o Hospital e o Abrigo de animais.** Depois da Fase 16, todas as paradas têm prédio.
- **Conflito com o `plano-parte-2.md`:** ele proíbe criar missão nova e mudar orientação de segurança. Este plano passa por cima dessa regra, e por isso depende de aprovação. Se o eixo "Depois" for aprovado (decisão 1), também muda a regra dos três eixos fixos do `CLAUDE.md`.
- **A Parte 2 está implementada (Fases 9 a 14).** Faltam os testes à mão, que entram na Fase 21.

### 2.1 Mapa

| Prédio | Hoje | Depois |
|---|---|---|
| Casa do jogador | Centro-leste, uma casa só (linha 11, coluna 25) | Beira-rio, no lugar da Rádio (linhas 19 e 20, colunas 25 e 26, porta na linha 18). **Parte baixa: alaga em "Durante"** |
| Comunicação (Rádio) | Beira-rio | Centro-leste, no lugar da Casa (linhas 10 e 11, colunas 25 e 26, porta na linha 12). Deixa de alagar |
| Abrigo | Parte alta, a oeste (linhas 9 a 11, colunas 3 a 6) | Prédio novo no norte da parte alta, à esquerda da Defesa Civil (linhas 3 a 5, colunas 3 a 6, porta na rua da linha 6), no lugar de algumas casas |
| Hospital | Não existe | Prédio de hoje do Abrigo (porta na linha 12) |
| Abrigo de animais | Não existe | Prédio de hoje do CRAS |
| CRAS | Norte da parte alta | Sai do jogo |

- Escola, Defesa Civil, Bombeiros, Mercado (Loja) e UBS (Posto de Saúde) ficam onde estão.
- **A casa passa para a parte baixa.** Isso combina com o roteiro (a Defesa Civil confirma que a casa está em área de risco), mas tem duas consequências:
  - os peões continuam começando na porta de casa, agora na beira-rio;
  - em "Durante", a porta de casa fica embaixo d'água. Hoje, quando não acha rua seca por perto, o jogo leva o peão para a porta de casa. Isso precisa mudar.
- **Casa e Loja ficam na parte baixa:** as duas precisam ficar fora de "Durante". Na ordem aprovada isso já acontece.
- O tamanho de cada prédio se ajusta na fase: a casa hoje ocupa uma casa da grade, e a Rádio ocupa quatro.

### 2.2 A ordem da lista e o texto das cenas

A ordem é a da lista do início, mas o texto das cenas foi escrito para a ordem do roteiro. Onde as duas não batem, o diálogo se adapta:

- **Defesa Civil (5)** manda procurar abrigo, mas o Abrigo é a parada 3. O diálogo lembra que o jogador já conhece o caminho do abrigo.
- **Bombeiros (6)** começa "após sair da rádio", mas a Comunicação é a parada 7. Os números 190, 192 e 193 aparecem primeiro na ligação para os Bombeiros.
- **Escola (4)** é "pós-enchente" no roteiro (organizar o espaço escolar e a cartilha pós-enchente). Na parada 4 ela fica com "Conhecimento que protege" (decisão 3).
- **Posto de Saúde (8)** começa no abrigo, ajudando uma pessoa que teve contato com a água da enchente. Aqui não há conflito, porque o Abrigo (3) vem antes.

## 3. Uma atividade por parada

Eixos como na recomendação da decisão 1, com o eixo novo "Depois":

| # | Eixo | Parada (id no código) | Atividade | Como se joga |
|---|---|---|---|---|
| 1 | Alerta | Casa (`casa`) | Plano da família | Pôr em ordem os passos do plano da família |
| 2 | Preparação | Loja (`mercado`) | Mochila de emergência | O minijogo de hoje, que continua no Mercado |
| 3 | Preparação | Abrigo (`abrigo`) | Chegada ao abrigo | História curta com 2 a 4 momentos de "O que você faz?" |
| 4 | Preparação | Escola (`escola`) | Seguro ou perigoso? | Separar cartões de atitudes em duas colunas |
| 5 | Durante | Defesa Civil (`defesa-civil`) | Mapa de risco | Tocar nas áreas de risco num mapa desenhado e descobrir que a casa está numa delas |
| 6 | Durante | Bombeiros (`bombeiros`) | Ligação para o 193 | Escolher o número e responder ao atendente, como numa conversa de celular |
| 7 | Durante | Comunicação (`radio`) | Confiável ou boato? | As mensagens chegam no celular, uma por vez: confiar ou conferir antes |
| 8 | Depois | Posto de Saúde (`ubs`) | Jogo da memória | Formar pares de situação e cuidado |
| 9 | Depois | Abrigo de animais (id novo) | Caça-palavras | Achar as 10 palavras dos cuidados com os animais na grade |
| 10 | Depois | Hospital (id novo) | Caça-palavras | Achar as palavras de primeiros socorros na grade |

- Ficam 1 parada no Alerta, 3 na Preparação, 3 em Durante e 3 em Depois. Com 3 eixos (decisão 1, opção b), as paradas 5 a 10 ficam todas em "Durante".
- Nenhuma porta de missão fica embaixo d'água no eixo dela: Casa e Loja estão nos dois primeiros eixos, e as paradas de "Durante" e "Depois" ficam no centro ou na parte alta.
- **A Casa abre o jogo.** Todos os peões começam na porta de casa, então o Jogador 1 faz a visita da Casa na primeira vez, sem jogar o dado. Como o Alerta só tem essa parada, o clima já muda depois dela.
- As missões continuam sendo distribuídas como na Parte 2: cada jogador pega a próxima livre de `missions.json`, mesmo que seja do eixo seguinte, e quem sobra ajuda a equipe.
- Saem do plano anterior o "Carrinho consciente" (a Loja fica com a mochila, como pede o roteiro) e o "Núcleo comunitário" (o Abrigo de animais fica no lugar dele).

### 3.1 Como funciona cada atividade

- **Plano da família (`ordenar`):** os passos aparecem embaralhados, e o aluno toca neles na ordem certa. Ao conferir, mostra o que ficou fora do lugar e a explicação.
- **Mochila de emergência (`mochila`):** o minijogo de hoje, com o mesmo `kit-items.json`. Todos os itens da cena 2 do roteiro já estão nele.
- **Chegada ao abrigo (`historia`):** de 2 a 4 momentos seguidos, cada um com uma situação e alternativas. Usa a mesma lógica da pergunta de hoje.
- **Seguro ou perigoso? (`classificar`):** cartões de atitudes. O aluno toca num cartão e depois na coluna. Ao conferir, cada cartão fora do lugar mostra a explicação.
- **Mapa de risco (`cena`):** um mapa simples da cidade desenhado em SVG no código, com pontos para tocar (beira do rio, encosta do morro, rua baixa, parte alta, a casa do jogador). As áreas de risco precisam ser achadas, e tocar num ponto que não é de risco mostra por que não é. No fim, a casa aparece numa área de risco, e a conclusão é procurar o abrigo. Cada ponto é um botão, então funciona só com teclado.
- **Ligação para o 193 (`chamada`):** uma tela de celular. Primeiro o aluno escolhe para qual número ligar (190, 192 ou 193). Depois o atendente faz perguntas sobre o poste que caiu em cima do carro, e o aluno escolhe as respostas, como numa conversa. Usa a mesma lógica da `historia`, com cara de conversa.
- **Confiável ou boato? (`mensagens`):** as mensagens aparecem uma por vez, como num celular, com quem mandou. O aluno escolhe "Pode confiar" ou "Conferir antes de repassar" e vê a explicação.
- **Jogo da memória (`memoria`):** de 4 a 6 pares de situação e cuidado, com cartas que são botões. O texto da carta virada é anunciado ao leitor de tela.
- **Caça-palavras do Abrigo de animais (`caca-palavras`):** o mesmo tipo do Hospital, com as 10 palavras do caça-palavras da cena 8 ("Missão proteção animal"): ABRIGO, ANIMAIS, ALIMENTOS, CUIDADOS, ÁGUA, PROTEÇÃO, VETERINÁRIO, SEGURANÇA, RESGATE e BEM-ESTAR. Mudança pedida depois da Fase 21: antes, esta parada usava a pergunta de múltipla escolha `q11-animal-perdido`, que continua no `questions.json` sem uso.
  - A grade do roteiro (15×15, com palavras de trás para frente e na diagonal) não é copiada: o jogo monta a grade sozinho, como no Hospital. Com 10 palavras, a grade fica com 8×11 letras no celular e 11×11 na tela larga.
  - O caça-palavras passa a aceitar até 10 palavras, e o hífen: a lista mostra BEM-ESTAR, e a grade usa BEMESTAR.
- **Caça-palavras (`caca-palavras`):** uma grade de letras. O aluno toca na primeira e depois na última letra de uma palavra. A lista de palavras fica à vista e vai sendo riscada, e cada palavra achada mostra a sua explicação.
  - Palavras só na horizontal e na vertical, sem diagonal e sem escrita de trás para frente.
  - IMOBILIZAÇÃO tem 12 letras e fica na vertical. Assim a grade cabe em 8 colunas a 360px, com cada letra perto de 40px, um tamanho bom para tocar.
  - Na tela larga (a partir de 640px), a grade fica quadrada (lado do tamanho da maior palavra) e a lista vai para o lado, para tudo caber sem rolar. Mudança pedida depois da Fase 21: a grade de 8 colunas ficava comprida demais no computador.
  - Teclado: as setas andam pela grade e `Enter` ou `Espaço` marca a letra. Cada letra é um botão com rótulo ("linha 3, coluna 5, letra P").

### 3.2 Regras para todas as atividades

- O loop passa a ser: carta do local → diálogo com o personagem → atividade → pin.
- Errar não reprova: o jogo explica e deixa tentar de novo. Conta como acerto de primeira quando a primeira tentativa já está certa. Na memória e no caça-palavras, ver a decisão 6.
- Sem cronômetro, inclusive na memória, nas mensagens e no caça-palavras.
- Funciona por toque, mouse ou só teclado. Nada depende de arrastar: o aluno toca no cartão e depois no destino.
- Cabe em 360px sem rolagem horizontal, respeita `prefers-reduced-motion` e anuncia o resultado para o leitor de tela.
- Cada atividade tem de 6 a 8 cartões (ou passos, pontos, mensagens) e dura de 1 a 2 minutos, para a partida com 4 jogadores continuar em 15 a 25 minutos.
- Os desenhos (o mapa de risco e a tela de celular) são SVG e CSS feitos no código, como os da mochila. Nada é baixado e nenhuma dependência nova entra.
- Em equipe, a atividade é feita por quem parou na porta, e todos acompanham na mesma tela, como a visita de hoje.

### 3.3 Carta do local

O roteiro pede "uma carta explicativa sobre a função do local + uma atividade para completar a missão".

- Cada instituição ganha o campo `carta` no `institutions.json`, com um texto curto sobre o que o lugar faz.
- A carta abre a visita, antes do diálogo, como um cartão com o ícone e a cor da instituição, igual aos cartões de hoje.
- Ela soma uma tela a cada parada. Por isso o tempo da partida é medido de novo na Fase 21.

## 4. Conteúdo

### 4.1 Formato novo

A equipe precisa saber dessa mudança, e o `README.md` vai explicar o formato.

- Em `missions.json`, `"minijogo": "kit"` vira `"atividade": "<id>"`. Cada missão continua tendo uma `pergunta` **ou** uma `atividade`.
- Se o eixo "Depois" for aprovado, `missions.json` ganha o eixo `depois`, sempre por último.
- Em `institutions.json`, cada instituição ganha o campo `carta`. Saem o CRAS, e entram o Hospital e o Abrigo de animais.
- Novo arquivo `content/atividades.json`: cada atividade tem `id`, `tipo`, `titulo`, `instrucao` e os campos do seu tipo. A resposta certa vai por índice, como o `correta` das perguntas. Exemplo:

```json
{
  "id": "a04-seguro-ou-perigoso",
  "tipo": "classificar",
  "titulo": "Seguro ou perigoso?",
  "instrucao": "Toque em cada cartão e escolha a coluna.",
  "grupos": ["Seguro", "Perigoso"],
  "cartoes": [
    {
      "texto": "Atravessar a rua alagada correndo",
      "grupo": 1,
      "explicacao": "Rua alagada não se atravessa, nem a pé, nem de carro."
    }
  ]
}
```

- Tipos: `ordenar`, `mochila`, `historia`, `classificar`, `cena`, `chamada`, `mensagens`, `memoria` e `caca-palavras`.
- A `mochila` tem só `id` e `tipo`. O título, a instrução e os itens continuam no `kit-items.json`, para o mesmo texto não ficar em dois lugares.
- Na `cena`, a equipe muda os textos de cada ponto. O desenho e a posição dos pontos ficam no código, ligados pelo `id`, como os desenhos da mochila.
- No `caca-palavras`, a equipe escreve as palavras e as explicações. O código monta a grade.
- As perguntas que deixarem de ser usadas ficam no `questions.json` até a equipe decidir o que fazer com elas.

### 4.2 O que dá para rascunhar com o roteiro e os textos de hoje

Tudo com `todoValidar`:

- **Casa (cena 1):** os passos do plano da família.
  - Guardar documentos e registros de saúde em sacos plásticos vedados.
  - Separar os remédios de uso contínuo de cada pessoa.
  - Separar os remédios do animal de estimação, como o veterinário orientou.
  - Pôr no animal a coleira com placa de identificação (nome e telefone).
  - Abastecer a mochila com água e ração.
  - Pôr o animal com calma na caixa de transporte.
  - Seguir a rota de evacuação até um local seguro.
- **Loja (cena 2):** o `kit-items.json` já tem todos os itens da cena. As explicações podem ganhar a água em garrafa lacrada e o cuidado de ver se nenhuma embalagem teve contato com água de enxurrada.
- **Abrigo (cena 6):** o abrigo é um local seguro para repousar, as educadoras escutam e acalmam crianças e adultos, e há os pilares do aprendizado, da adaptação e da reconstrução. Fica também o "pergunte à equipe do abrigo sobre o animal de estimação" de hoje.
- **Escola:** as atitudes que já estão nos textos de hoje (rua alagada, parte alta, beira do rio, desligar energia e gás, conferir a fonte).
- **Defesa Civil (cena 5):** o mapeamento de riscos, a subida rápida do rio, as sirenes de aviso prévio e as rotas de evacuação. Entram também os sinais de deslizamento dos textos de hoje (rachaduras, árvores ou postes inclinados, água barrenta minando do chão). A casa na beira-rio está em área de risco.
- **Bombeiros (cena 4):** o poste que cai em cima de um carro com uma pessoa presa, e a ligação para o 193 dando as informações pedidas. Do texto de hoje ficam o "não entrar na água" e o "nunca enfrentar sozinho".
- **Comunicação (cena 3 e lista):** os boletins de utilidade pública, os telefones 192 (SAMU), 193 (Bombeiros) e 190 (Polícia), e a regra de conferir na fonte oficial. As mensagens de exemplo da atividade são inventadas.
- **Posto de Saúde (cena 7 e lista):**
  - a pessoa do abrigo que teve contato com a água da enchente e não está bem;
  - a triagem para sintomas de leptospirose (bactéria transmitida pela urina de rato misturada à água) e a vacinação em dia;
  - evitar água contaminada, cuidar da higiene e buscar atendimento;
  - os remédios de uso contínuo e as receitas, dos textos de hoje.
- **Abrigo de animais (cena 8):** o animal perdido sem identificação vai para o abrigo de animais, onde os voluntários dão alimento e tratamento. Animal silvestre na cidade é caso para os órgãos ambientais (IBAMA e SEMA). A cena fala em Saúde Única.
- **Hospital (cena 9):** as palavras SOCORRO, PRESSÃO, IMOBILIZAÇÃO e PROTEÇÃO, e o objetivo da missão (conter sangramentos e manter imóvel a vítima com fratura até o SAMU, 192, chegar).
- **Carta de cada local:** um rascunho a partir do texto de cada cena.

### 4.3 O que só a equipe pode escrever

Nenhuma orientação de segurança nova sai de palpite:

- **Casa:** se a ordem dos passos importa. Se não importar, a atividade muda.
- **Abrigo:** as atitudes de acolhimento e convivência ("como agir ao chegar a um abrigo" e "quais cuidados ter com outras pessoas").
- **Escola:** o texto sobre mudanças climáticas, e a parte pós-enchente, se for usada (decisão 3).
- **Defesa Civil:** quais pontos do mapa são de risco e por quê, além do que já está escrito.
- **Bombeiros:** o que o atendente do 193 pergunta e o que responder, e o que fazer (e não fazer) perto de poste e fio caídos.
- **Comunicação:** a estação para sintonizar o rádio a pilha (o roteiro pede para verificar) e como a rádio avisa sobre mantimentos e abrigos.
- **Abrigo de animais:** o que fazer (e não fazer) ao encontrar um animal silvestre.
- **Hospital:** a explicação de cada palavra e as orientações de primeiros socorros.

Onde faltar conteúdo, a atividade entra com texto genérico marcado com `todoValidar` e não vai ao ar assim.

## 5. Como encaixa no código de hoje

Para quem for implementar. Arquivos novos e mudanças de formato são confirmados no começo de cada fase, como manda o `CLAUDE.md`.

| Arquivo | O que muda | Fase |
|---|---|---|
| `src/missions/content.ts` | Lê e confere o `atividades.json`, o campo `atividade`, a `carta` e o eixo `depois` | 15 e 16 |
| `src/missions/missionFlow.ts` | A visita abre a carta e depois a atividade pelo tipo. O peão que fica na água não vai mais para a porta de casa | 15 e 16 |
| `src/minigames/kitMinigame.ts` | Não muda: ele já é a atividade `mochila` | 15 |
| `src/main.ts` | Cria as atividades no lugar do `KitMinigame` | 15 |
| `src/world/layout.ts` | Casa e Rádio trocadas, Abrigo novo no norte, Hospital e Abrigo de animais | 16 |
| `src/world/institutions.ts`, `icons.ts`, `buildings.ts` | Sai o `cras`, e entram os ids, cores, ícones e prédios do Hospital e do Abrigo de animais | 16 |
| `src/world/climate.ts` | O clima do eixo "Depois", se for aprovado | 16 |
| `src/core/save.ts` | Só se um save com ids de missão que não existem mais quebrar o jogo. Nesse caso, save versão 3 | 16 |
| `content/*.json` | Roteiro novo, nomes novos, cartas, diálogos e atividades | 16 a 20 |
| `src/style.css` | Estilos da carta e das atividades, usando as variáveis CSS que já existem | 16 a 20 |
| `src/ui/howToPlay.ts`, `endScreen.ts`, `README.md`, `CLAUDE.md`, `AGENTS.md` | Textos e documentação | 15, 16 e 21 |

Arquivos novos prováveis (a confirmar na fase):

- `content/atividades.json`
- `src/minigames/activities.ts`: abre a atividade certa pelo tipo
- Um arquivo por atividade:
  - `orderMinigame.ts`
  - `storyMinigame.ts`, que serve para a `historia` e para a `chamada`
  - `sortMinigame.ts`
  - `spotMinigame.ts`, com `spotScenes.ts`
  - `messagesMinigame.ts`
  - `memoryMinigame.ts`
  - `wordSearchMinigame.ts`

## 6. Ordem de implementação

Uma fase por vez. Ao final de cada uma, rodar o projeto, conferir se não tem erro e mostrar um resumo antes de seguir. A numeração continua a da Parte 2.

15. **Base das atividades**
    - **Entrega:** o campo `atividade`, o `atividades.json` com a mochila e o arquivo que abre a atividade pelo tipo. A mochila passa a abrir por esse caminho.
    - **Pronto quando:** o jogo funciona igual a hoje.

16. **Mapa e roteiro novos**
    - **Entrega:**
      - o mapa da seção 2.1, com prédio, ícone e cor do Hospital e do Abrigo de animais;
      - o peão que fica na água não vai mais para a porta de casa;
      - o `missions.json` com as 10 paradas na ordem aprovada, os nomes novos, as cartas e os diálogos em rascunho;
      - o eixo "Depois" e o clima dele, se forem aprovados.
    - Parada cuja atividade ainda não existe usa por enquanto uma das perguntas de hoje.
    - O mapa e o roteiro entram juntos porque trocar só um deixa missão com a porta embaixo d'água. Com o mapa novo e as missões de hoje, a Casa alaga em "Durante", onde hoje está a m07. Com o roteiro novo e o mapa de hoje, a Rádio alaga.
    - **Pronto quando:** dá para jogar todas as paradas até a tela final, com 1 a 4 jogadores. Um save de antes da fase é ignorado sem quebrar o jogo.

17. **Casa e Escola:** Plano da família e Seguro ou perigoso?

18. **Abrigo e Bombeiros:** Chegada ao abrigo e Ligação para o 193, que usam a mesma lógica.

19. **Defesa Civil e Comunicação:** Mapa de risco e Confiável ou boato?

20. **Posto de Saúde e Hospital:** Jogo da memória e Caça-palavras.

21. **Polimento**
    - **Entrega:**
      - o Como jogar e a tela final falando das atividades e das cartas;
      - `README.md`, `CLAUDE.md` e `AGENTS.md` atualizados;
      - os testes à mão que ficaram da Parte 2, somados aos desta parte: celular a 360px, Chromebook, só com teclado, Chrome e Firefox dentro de iframe, e 30 fps em máquina fraca;
      - uma partida cronometrada com 4 jogadores.
    - **Pronto quando:** todos os critérios de aceite da seção 8 são cumpridos.

Nas fases 17 a 20, uma atividade só fica pronta quando funciona só com teclado, a 360px, com `prefers-reduced-motion` e sem `localStorage`, sem erro no console, no `npx tsc --noEmit` e no `npm run build`.

## 7. Decisões a aprovar

1. **Eixos:**
   - (a) Quatro eixos, com o eixo novo "Depois" no final: Alerta (Casa), Preparação (Loja, Abrigo e Escola), Durante (Defesa Civil, Bombeiros e Comunicação) e Depois (Posto de Saúde, Abrigo de animais e Hospital). No "Depois", a chuva para e a água baixa aos poucos. **Recomendado**, porque o roteiro fala em "durante e depois" da inundação, as paradas ficam equilibradas e o jogo termina num clima de reconstrução, sem alarmismo. Custa mudar a regra dos três eixos fixos e fazer um clima novo.
   - (b) Manter três eixos: Alerta (Casa), Preparação (Loja, Abrigo e Escola) e Durante (paradas 5 a 10).
2. **As 10 missões de hoje:** trocar todas pelo roteiro novo? **Recomendado: sim**, levando o conteúdo atual para os diálogos (cadastro por SMS, plano da família, remédios, desligar energia e gás). O conteúdo da missão do CRAS pode ir para o diálogo do Abrigo.
3. **Escola:**
   - (a) Na parada 4, a Escola fica com "Conhecimento que protege" (seguro ou perigoso durante uma inundação), e a parte pós-enchente sai. **Recomendado.**
   - (b) A cartilha pós-enchente entra no eixo "Depois", no diálogo de outra parada.
4. **Carta do local:** abrir a visita antes do diálogo? **Recomendado: sim.** A outra opção é mostrar a carta junto com o pin.
5. **Caça-palavras:** **recomendado** usar letras sem acento na grade (Ç vira C, Ã vira A), com a palavra escrita certa, com acento, na lista.
6. **Acerto de primeira na memória e no caça-palavras:** **recomendado** contar sempre como acerto de primeira, porque virar a carta errada ou tocar na letra errada faz parte do jogo e não tem uma resposta errada a explicar.
7. **Atividades:** confirmar a atividade de cada parada da seção 3. O Abrigo de animais começou com a pergunta de hoje e depois passou para o caça-palavras da cena 8 (seção 3.1).

## 8. Critérios de aceite

- Dá para jogar do começo ao fim com 1, 2, 3 e 4 jogadores, passando pelas 10 paradas e chegando à tela final
- Cada parada tem uma atividade diferente e abre com a carta do local
- Nenhuma porta de missão fica embaixo d'água no eixo dela
- Toda atividade funciona por toque, mouse e só teclado, a 360px sem rolagem horizontal
- Errar não reprova em nenhuma atividade, e o acerto de primeira aparece na tela final
- Uma partida com 4 jogadores cabe em 15 a 25 minutos
- Sem `localStorage`, o jogo continua jogável do começo ao fim, e um save de antes da Fase 16 é ignorado sem quebrar o jogo
- Mínimo de 30 fps em máquina fraca
- Funciona no Chrome e no Firefox, no desktop e no celular, e dentro de iframe
- Sem erro no console, `npx tsc --noEmit` e `npm run build` sem erro
- Nenhum texto educativo fora de `content/`

## 9. O que não fazer

- Não pôr cronômetro em nenhuma atividade
- Não criar ranking, placar entre jogadores nem vencedor
- Não fazer atividade que só funcione arrastando
- Não inventar orientação de segurança: o que falta fica genérico e marcado com `todoValidar`
- Não instalar dependência nova nem baixar imagem

## 10. Pendências

- Todo o conteúdo continua sendo rascunho e precisa da validação da Defesa Civil antes de publicar. O de primeiros socorros (Hospital) e o de saúde (Posto de Saúde) precisam também de revisão da área da saúde
- O conteúdo da seção 4.3 precisa ser escrito pela equipe
- Os nomes que aparecem no jogo (Loja ou Mercado, Posto de Saúde ou UBS, Comunicação ou Rádio comunitária, Hospital, Abrigo de animais) ficam no `institutions.json` e são escolha da equipe
