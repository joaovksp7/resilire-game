# Plano — Parte 2: até 4 jogadores, em equipe

Continuação de [`prompt-jogo-desastres-climaticos.md`](prompt-jogo-desastres-climaticos.md), cujas fases 1 a 8 estão concluídas. Este arquivo descreve só o que muda. Tudo o que não está aqui continua valendo como está no plano original. Onde os dois discordam, vale este.

Decisões aprovadas em 28/10/2026 e revisadas no mesmo dia: o jogo continua com as 10 missões, e cada jogador cuida de uma missão diferente.

## 1. Objetivo

Deixar o jogo jogável por **até 4 pessoas no mesmo aparelho**, cada uma na sua vez, como num jogo de tabuleiro. Pensado para um grupo de alunos num computador do laboratório, num Chromebook ou num celular passado de mão em mão.

O jogo continua com as **10 missões**. Para a partida com vários jogadores continuar cabendo numa aula, **cada jogador cuida de uma missão diferente, ao mesmo tempo**: a equipe se divide pela cidade.

## 2. Decisões

| Tema | Decisão |
|---|---|
| Onde se joga | Mesmo aparelho, passando a vez. Sem internet e sem servidor (o jogo continua sem backend) |
| Quantos jogadores | De 1 a 4, escolhidos na tela inicial |
| Modo | **Equipe**: cada jogador tem a sua missão, ao mesmo tempo, e os pins são da equipe. Não tem vencedor nem perdedor |
| Missões | **As 10 de hoje**, em todos os modos (ver 3.4) |
| Quem fica sem missão | Ajuda os colegas: pode fazer a visita da missão de outro jogador |
| Porta da missão de um colega | Quem chegar faz a visita, e o pin guarda quem buscou |
| Ordem da vez | A ordem em que os jogadores aparecem na tela inicial |
| Onde começa | Todos começam na porta de casa |
| Nomes | Opcionais. Campo vazio vira "Jogador 1", "Jogador 2"… |

## 3. Game design

### 3.1 Tela inicial

A tela inicial que já existe (nome do jogo com a cidade ao fundo) ganha a escolha de quantos vão jogar:

```
          RESILIRE
       Cidade Resiliente

     Quantos vão jogar?
   [ 1 ]  [ 2 ]  [ 3 ]  [ 4 ]

          [ Jogar ]
        [ Como jogar ]
         [ Créditos ]
        [ Som: ligado ]
```

- **Seletor de 1 a 4:** quatro botões grandes (`<button>` com `aria-pressed`) num grupo com o rótulo "Quantos vão jogar?". Começa no número da última partida, ou em 1.
- **Jogar, com 2 ou mais:** abre a janela "Quem vai jogar?", com um campo de nome por jogador (opcional, até 12 letras) e a cor do peão ao lado. Botões **Começar** e **Voltar**.
- **Jogar, com 1:** vai direto para a cidade, como hoje.
- **Com partida salva:** mostra quem está jogando e os pins (ex.: "Ana, Bia e Caio · Pins: 2 de 10"). Tem **Continuar** e **Novo jogo**. Novo jogo pede confirmação, como o "Começar de novo" de hoje, e depois mostra o seletor.
- **Com todas as missões feitas:** **Ver resultado** e **Jogar de novo**. Jogar de novo pede confirmação e depois mostra o seletor.
- **Como jogar, Créditos e Som:** iguais. O aviso de "o progresso não fica salvo" também continua.
- Os nomes da última equipe já vêm preenchidos na partida seguinte (só se o navegador deixar guardar).

### 3.2 Equipe e vez

- Cada jogador tem o seu peão: o mesmo personagem low-poly de hoje, com uma cor de jaqueta diferente para cada um (as 4 cores ficam no `config.ts`).
- **Uma vez é uma jogada do dado:** jogar, escolher a casa, andar. Ao chegar, a vez passa para o próximo da ordem.
- Se nenhuma casa ficar ao alcance, o mesmo jogador joga de novo, como hoje.
- Só o peão da vez anda. As casas destacadas e o "Ir rumo ao objetivo" valem para ele.
- **Início da vez:** a câmera vai até o peão da vez e o rodapé do dado mostra "Vez de Ana", com a cor dela. Não abre uma janela a cada vez, para não travar o ritmo com 4 pessoas: a janela só aparece quando o jogador recebe uma missão nova (ver 3.3). Com 1 jogador, o rodapé fica como hoje ("Sua vez!").
- O peão da vez tem um anel no chão. A cor nunca é a única pista: o nome e o número do jogador aparecem na interface.
- Peões não bloqueiam o caminho uns dos outros. Na mesma casa, ficam lado a lado, sem se sobrepor.
- Pausa, tela inicial, diálogo e cartões param o jogo, como hoje.

### 3.3 Missões divididas

- **Cada jogador tem a sua missão, ao mesmo tempo.** Ficam em andamento no máximo tantas missões quanto jogadores, sempre do eixo atual e na ordem do `missions.json`.
- **Com 1 jogador**, isso dá uma missão por vez, na ordem: o jogo funciona como hoje.
- **Distribuição:** quando um eixo começa, as missões dele são entregues uma para cada jogador, na ordem da vez, começando por quem joga em seguida (no começo da partida, o Jogador 1). Se o eixo tiver menos missões que jogadores, quem sobra começa ajudando. Assim, quem ajuda muda de um eixo para outro.
  - Com 4 jogadores no Alerta (3 missões): Ana, Bia e Caio recebem uma missão cada, e Duda ajuda.
  - Com 2 jogadores no Alerta: Ana fica com a missão 1 e Bia com a 2. A 3 espera alguém terminar.
- **Quem parar na porta de uma missão em andamento faz a visita**, seja a missão dele ou a de um colega: diálogo e pergunta, ou o minijogo da mochila. Todos acompanham na mesma tela, e dá para conversar antes de responder.
- Se duas missões em andamento forem na mesma instituição, a visita é a de quem parou na porta. Se nenhuma for dele, vale a que vem primeiro no `missions.json`.
- **Depois da visita, o dono da missão** (que pode não ser quem fez a visita) recebe a próxima missão livre do eixo. Se não sobrar nenhuma, ele passa a ajudar. Quem fez a missão de um colega continua com a sua.
- **Quem ajuda** não tem missão própria. O "Ir rumo ao objetivo" e a seta da borda da tela apontam para a missão em andamento mais perto dele. Vale a equipe combinar quem vai para onde.
- Errar não reprova: explica e deixa tentar de novo, como hoje.
- **O pin é da equipe e guarda quem buscou** ("Buscado por Ana"). O acerto de primeira conta para a equipe.
- **Depois do pin:** se todas as missões do eixo acabaram, vem o cartão do novo eixo. Depois, a vez passa para o próximo da ordem.
- **Cartão da missão:** aparece no começo da vez do dono, quando ele recebe uma missão nova, com o nome dele em cima ("Missão da Ana"). Com 1 jogador, aparece logo depois do pin, como hoje. Se a missão de alguém foi feita por um colega e não sobrou outra, o começo da vez dele avisa que agora ele ajuda a equipe.
- **Já está na porta:** se no começo da vez o peão da vez já estiver na porta de uma missão em andamento, a visita começa sem jogar o dado. Exemplo: quem fez a `m06` nos Bombeiros e recebeu a `m08`, também nos Bombeiros.
- Parar na porta de uma instituição sem missão em andamento mostra um aviso, como hoje ("Você está na Escola…"), e a vez passa.
- **Troca de eixo:** o eixo só muda quando todas as missões dele forem concluídas. O clima piora para a cidade toda. Todo peão que estiver numa rua que alagou vai para a rua seca mais perto (hoje isso é feito com um peão só). Depois, as missões do novo eixo são distribuídas.

### 3.4 As 10 missões

| Ordem | Missão | Eixo | Instituição |
|---|---|---|---|
| 1 | `m01-fique-por-dentro` — Fique por dentro | Alerta | Defesa Civil |
| 2 | `m02-noticia-ou-boato` — Notícia ou boato? | Alerta | Rádio |
| 3 | `m03-combinado` — Combinado é combinado | Alerta | Escola |
| 4 | `m04-mochila` — Monte sua mochila | Preparação | Mercado (minijogo) |
| 5 | `m05-remedio` — Remédio não pode faltar | Preparação | UBS |
| 6 | `m06-morro` — O morro está avisando | Preparação | Bombeiros |
| 7 | `m07-desliga` — Desliga antes de sair | Durante o evento | Casa |
| 8 | `m08-agua-corrente` — Água corrente não se atravessa | Durante o evento | Bombeiros |
| 9 | `m09-lugar-seguro` — Para o lugar seguro | Durante o evento | Abrigo |
| 10 | `m10-ninguem-fica` — Ninguém fica para trás | Durante o evento | CRAS |

- `content/missions.json` continua com as 10 missões de hoje. Nenhuma missão nova é criada e nenhum texto de segurança muda.
- Por eixo: 3 no Alerta, 3 na Preparação e 4 em Durante o evento. Com 4 jogadores, no Alerta e na Preparação alguém começa ajudando.
- A ordem da tabela vale entre os eixos e para a distribuição. Dentro de um eixo, com 2 ou mais jogadores, as missões podem terminar em qualquer ordem (ver seção 9).

### 3.5 HUD e telas

- **Barra do topo:** mostra a missão do jogador da vez (missão, eixo e destino), os pins contando até 10, o som e a pausa. Para quem está ajudando, "Ajudando a equipe" no lugar da missão.
- **Setas e portas:** toda missão em andamento tem a seta em cima do prédio, e as portas delas aparecem em amarelo entre as casas destacadas. A seta da borda da tela aponta para a missão do jogador da vez (ou, para quem ajuda, a mais perto).
- **Rodapé do dado:** "Vez de Ana" com a cor dela. Com 2 ou mais jogadores, os avisos usam o nome (ex.: "Ana tirou 4. Escolha uma das casas destacadas.").
- **Cartão do pin e painel de pins:** cada pin mostra quem buscou. O painel também lista as missões em andamento e quem cuida de cada uma.
- **Tela final, com 2 ou mais:** "A equipe completou todas as missões!", os nomes da equipe, os pins com quem buscou, os acertos de primeira da equipe e o resumo por eixo (igual ao de hoje). Sem ranking e sem vencedor. Com 1 jogador, fica como hoje.
- **Pausa:** igual. "Começar de novo" pede confirmação e leva à tela inicial, já com o seletor.
- **Como jogar:** ganha a seção "Jogando em grupo" (a vez, os peões, cada um com a sua missão, ajudar os colegas, a visita de quem chega e os pins da equipe).

### 3.6 Progresso salvo

- O formato do save passa para a versão 2, numa chave nova do `localStorage`. Guarda os jogadores (nome, cor e casa onde está o peão), de quem é a vez, as missões em andamento e de quem é cada uma, os pins com quem buscou e os acertos de primeira.
- O save antigo (versão 1, de um jogador só) é ignorado: quem tinha uma partida começa de novo. A escolha do som não muda.
- Sem armazenamento, funciona como hoje: tudo na memória, e a tela inicial avisa.
- Os nomes ficam só neste navegador. Nada sai do aparelho.

## 4. O que não muda

- As 10 missões e os textos de `content/`
- Dado de 1 a 6, casas destacadas a até N passos, uma casa por passo, 4 direções
- Eixos em ordem fixa (`alerta` → `preparacao` → `durante`), com o clima, o rio e as ruas alagadas mudando por eixo
- Errar não reprova. Sem cronômetro, sem penalidade
- Todo o texto educativo em `content/`
- Sem backend, sem requisição externa e sem asset baixado
- Todo acesso ao `localStorage` em `try/catch`
- Meta de partida de 15 a 25 minutos, agora também com 4 jogadores

## 5. Como encaixa no código de hoje

Para quem for implementar. Arquivos novos e mudanças de formato são confirmados no começo de cada fase, como manda o `CLAUDE.md`.

| Arquivo | O que muda | Fase |
|---|---|---|
| `src/ui/titleScreen.ts` | Seletor de 1 a 4, "Quem vai jogar?", Continuar e Novo jogo | 10 |
| `src/config.ts` | Constantes da equipe: máximo de jogadores, cores dos peões e tamanho do nome | 10 e 11 |
| `src/player/character.ts` | Cor da jaqueta passa a vir por parâmetro | 11 |
| `src/player/player.ts` | Um por jogador. Deslocamento para peões na mesma casa | 11 |
| `src/player/diceTurn.ts` | Hoje recebe um `Player` fixo; passa a trocar o peão da vez | 11 |
| `src/main.ts` | Cria os peões a partir da equipe, e a câmera segue o da vez. Portas em amarelo de todas as missões em andamento | 11 e 12 |
| `src/missions/missionFlow.ts` | Escuta a chegada de todos os peões, tira todos da água e passa a vez depois da visita. Visita de quem chega a qualquer missão em andamento e cartão da missão no começo da vez | 11 e 12 |
| `src/missions/missionManager.ts` | Missões em andamento com o dono de cada uma, distribuição por eixo e quem buscou cada pin | 12 e 13 |
| `src/world/markers.ts` | Seta em cima de todas as missões em andamento | 12 |
| `src/core/save.ts` | Save versão 2 | 13 |
| `src/ui/diceHud.ts`, `missionHud.ts`, `endScreen.ts`, `howToPlay.ts`, `pauseMenu.ts` | Textos e telas da equipe | 11 a 14 |

Arquivos novos prováveis (a confirmar na fase): `src/player/team.ts` (a equipe e de quem é a vez) e `src/ui/teamSetup.ts` (a janela "Quem vai jogar?").

## 6. Ordem de implementação

Uma fase por vez. Ao final de cada uma, rodar o projeto, conferir se não tem erro e mostrar um resumo antes de seguir.

9. **As 10 missões de volta**
   - **Entrega:** `content/missions.json` de volta com as 10 missões, e o `README.md` com a lista das 10.
   - **Pronto quando:** dá para jogar sozinho do começo ao fim, com as 10 missões, como na Fase 8.

10. **Tela inicial com escolha de jogadores**
    - **Entrega:** seletor de 1 a 4, a janela "Quem vai jogar?", Continuar e Novo jogo. A equipe escolhida chega ao `main.ts`.
    - Nesta fase o jogo ainda anda com um peão só (o do jogador 1). Os outros peões chegam na Fase 11.
    - **Pronto quando:** funciona só pelo teclado, a 360px sem rolagem horizontal e sem armazenamento, e o leitor de tela anuncia o número escolhido.

11. **Peões e vez**
    - **Entrega:**
      - um peão por jogador, cada um com a sua cor, e o anel no da vez
      - peões lado a lado na mesma casa
      - a vez passando, com a câmera indo até o peão da vez e "Vez de Ana" no rodapé
      - a visita feita por quem chega
      - todos os peões saindo da água na troca de eixo
    - Nesta fase as missões ainda são uma por vez para a equipe toda. A divisão chega na Fase 12.
    - **Pronto quando:** 4 jogadores jogam até a tela final, só o peão da vez anda, e o jogo segura 30 fps em máquina fraca com 4 peões.

12. **Missões divididas**
    - **Entrega:**
      - as missões de cada eixo distribuídas, uma por jogador, e quem sobra ajudando
      - a visita de quem chega a qualquer missão em andamento, e o dono recebendo a próxima missão livre
      - o eixo mudando só quando todas as missões dele acabam
      - o cartão da missão no começo da vez do dono
      - a visita sem dado quando o peão da vez já está na porta
      - a seta em todas as missões em andamento, e a barra do topo com a missão do jogador da vez
    - **Pronto quando:** com 1 jogador funciona como hoje; com 2, 3 e 4 jogadores cada um recebe a sua missão e a partida chega à tela final; e ninguém fica travado, nem jogando só com teclado.

13. **Pins da equipe e progresso salvo**
    - **Entrega:** "Buscado por" no cartão do pin e no painel de pins, as missões em andamento no painel, o save versão 2, e Continuar restaurando a equipe, a vez, as posições e as missões de cada um.
    - **Pronto quando:** recarregar no meio da partida continua igual, um save antigo não quebra o jogo, e sem armazenamento o jogo continua jogável.

14. **Telas finais e polimento**
    - **Entrega:**
      - tela final da equipe
      - "Jogando em grupo" no Como jogar
      - pausa levando ao seletor
      - `README.md`, `CLAUDE.md` e `AGENTS.md` atualizados (a mecânica passa a ter a vez e as missões divididas)
      - teste no celular, no Chromebook e só com teclado
      - uma partida cronometrada com 4 jogadores
    - **Pronto quando:** todos os critérios de aceite da seção 7 são cumpridos.

## 7. Critérios de aceite

- Dá para jogar do começo ao fim com 1, 2, 3 e 4 jogadores, completando as 10 missões e chegando à tela final
- Com 1 jogador, o jogo funciona como hoje: uma missão por vez, na ordem
- Com 2 ou mais, cada jogador tem a sua missão, quem sobra ajuda, e o eixo só muda quando todas as missões dele acabam
- A vez passa na ordem da tela inicial, e só o peão da vez anda
- Uma partida com 4 jogadores cabe em 15 a 25 minutos
- O progresso (equipe, vez, posições, missões em andamento e pins) continua depois de recarregar a página
- Sem `localStorage`, o jogo continua jogável do começo ao fim
- A tela inicial e "Quem vai jogar?" funcionam só com teclado e a 360px sem rolagem horizontal
- Ninguém fica travado jogando só com teclado
- Mínimo de 30 fps em máquina fraca com 4 peões
- Funciona no Chrome e no Firefox, no desktop e no celular, e dentro de iframe
- Sem erro no console, `npx tsc --noEmit` e `npm run build` sem erro
- Nenhum texto educativo fora de `content/`

## 8. O que não fazer

- Não fazer jogo online nem em rede: é sempre o mesmo aparelho
- Não criar ranking, placar entre jogadores nem vencedor
- Não pôr cronômetro na vez
- Não criar missão nova nem mudar orientação de segurança
- Não instalar dependência nova

## 9. Pendências

- O conteúdo das 10 missões continua sendo rascunho e precisa da validação da Defesa Civil antes de publicar
- Dentro de um eixo, com 2 ou mais jogadores, as missões podem terminar em qualquer ordem. Alguns textos dão a entender uma sequência: a `m07` (preparar a casa antes de sair) vem antes da `m09` (ir para o abrigo), e o `d05` fala em separar os remédios "junto com a mochila", que é a `m04`. Se a equipe quiser ajustar, a mudança é em `content/`
- Os diálogos falam com "você", uma pessoa só. Em grupo, o "você" é quem está fazendo a visita. Se a equipe preferir um texto para o grupo, a mudança é em `content/`
- Continua aberta a pendência do plano original: definir se as perguntas reaproveitam o banco do quiz Missão Clima ou têm banco próprio
