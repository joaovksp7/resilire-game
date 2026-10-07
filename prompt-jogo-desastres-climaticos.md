# Prompt para o Claude Code — Jogo educativo sobre desastres climáticos

## 1. Contexto

Quero que você crie um jogo educativo para navegador sobre desastres climáticos (enchentes e deslizamentos), voltado a estudantes de escolas do Rio Grande do Sul, principalmente dos Vales do Rio Pardo e Taquari.

A referência de jogabilidade é o jogo "Caminhos da Cidadania" (https://igorflores.itch.io/caminhos-da-cidadania). Nele o jogador anda por uma cidade 3D, recebe missões que mandam ir até serviços de saúde e coleta pins ao completar cada visita. Quero a mesma ideia, mas com o tema de desastres climáticos. As missões levam o jogador até instituições que ensinam como agir antes e durante um evento extremo.

Nome provisório: **Missão Clima — Caminhos da Prevenção** (deixe o nome fácil de trocar em um arquivo de configuração).

## 2. Stack escolhida

- **TypeScript** com **Vite** como bundler
- **Three.js** para a cidade 3D
- HTML e CSS puros para a interface (HUD, diálogos, menus), sobrepostos ao canvas
- Sem backend. Progresso salvo em `localStorage`
- Sem frameworks de UI pesados. Se precisar de estado reativo na interface, use algo pequeno e escrito à mão

Por que essa stack: o build final é um site estático (pasta `dist/`) que roda em qualquer hospedagem simples e pode ser incorporado via iframe em uma página WordPress. Three.js dá o visual 3D parecido com a referência sem precisar instalar engine. TypeScript ajuda a manter o código organizado conforme o jogo cresce.

## 3. Público e restrições

- Estudantes do ensino fundamental II e médio
- Precisa rodar bem em computadores fracos de laboratório de escola e em Chromebooks
- Precisa funcionar em celular (toque) e no desktop (mouse e teclado)
- Todo o texto em português do Brasil, com linguagem simples e direta
- Partida completa em 15 a 25 minutos, para caber em uma aula
- Nenhum asset externo baixado da internet. Toda a arte deve ser gerada com geometria primitiva do Three.js (estilo low-poly)

## 4. Game design

### 4.1 Loop principal

1. O jogador recebe uma missão (card na tela com título, descrição e instituição de destino)
2. Anda pela cidade até a instituição
3. Ao chegar, abre um diálogo com um personagem da instituição que explica o que fazer naquela situação
4. O jogador responde uma pergunta ou faz uma pequena escolha sobre o que aprendeu
5. Ganha o pin (selo) daquela instituição e a próxima missão é liberada
6. Ao juntar todos os pins, completa o seu Caminho da Prevenção e vê uma tela final com resumo do que aprendeu

### 4.2 Fases do evento climático

O jogo é dividido em três eixos, que funcionam como fases. Cada fase muda o clima da cidade:

| Eixo | Clima na cidade | Foco das missões |
|---|---|---|
| Alerta | Céu nublado, chuva fraca | Saber receber e checar alertas oficiais |
| Preparação | Chuva moderada, rio subindo um pouco | Montar kit, plano familiar, reconhecer áreas de risco |
| Durante o evento | Chuva forte, rio transbordando, algumas ruas alagadas | Agir com segurança, buscar abrigo, pedir ajuda |

Na fase "Durante o evento", ruas da parte baixa da cidade ficam bloqueadas por água. O jogador precisa achar rotas pela parte alta. Isso ensina na prática a ideia de rota de fuga.

### 4.3 Movimento e câmera

- Movimento por clique ou toque: o jogador clica em um ponto da rua e o personagem anda até lá usando pathfinding (A*) em uma grade de tiles de rua
- Câmera isométrica que segue o personagem
- WASD ou setas movem a câmera livremente (como na referência). Ao clicar para andar, a câmera volta a seguir o personagem
- Scroll do mouse ou pinça no celular para zoom, com limites
- Instituições têm um marcador flutuante acima. A instituição da missão atual tem marcador destacado e animado
- Uma seta discreta na borda da tela aponta para o destino quando ele está fora da visão

### 4.4 A cidade

Uma cidade fictícia de vale, gerada a partir de um mapa definido em código ou JSON (não aleatório, para o professor saber onde fica cada coisa). Elementos:

- Um rio atravessando a cidade, com a parte baixa perto dele
- Um morro com casas na encosta (área de risco de deslizamento)
- Parte alta da cidade, segura, onde ficam o abrigo e a Defesa Civil
- Ruas em grade simples, praça, árvores, casas e prédios low-poly
- A água do rio é um plano que sobe de nível conforme a fase avança

### 4.5 Instituições

Cada instituição é um prédio com cor e ícone próprios e um personagem que conversa com o jogador:

- **Defesa Civil** — alertas, níveis de risco, plano de contingência
- **Corpo de Bombeiros** — sinais de deslizamento, como agir em alagamentos, telefone 193
- **Escola** — plano familiar de emergência, ponto de encontro
- **UBS (Unidade Básica de Saúde)** — remédios de uso contínuo, receitas, vacinas
- **Abrigo municipal (ginásio)** — como funciona um abrigo, o que levar, animais de estimação
- **Rádio comunitária** — fontes confiáveis e boatos em grupos de mensagem
- **Mercado** — onde acontece o minijogo do kit de emergência
- **CRAS (Assistência Social)** — apoio às famílias atingidas, cadastro

### 4.6 Missões de exemplo

Crie estas missões como conteúdo inicial. Todo o texto educativo precisa ficar em arquivos JSON separados do código, porque a equipe vai revisar e validar o conteúdo com a Defesa Civil antes de publicar.

**Eixo Alerta**
1. "Fique por dentro" — Defesa Civil. Aprender a se cadastrar para receber alertas por SMS e entender os níveis de alerta
2. "Notícia ou boato?" — Rádio comunitária. Diferenciar alerta oficial de mensagem falsa em grupo de WhatsApp
3. "Combinado é combinado" — Escola. Montar um plano familiar com ponto de encontro e contatos

**Eixo Preparação**
4. "Monte sua mochila" — Mercado. Minijogo do kit de emergência (ver 4.7)
5. "Remédio não pode faltar" — UBS. Separar remédios de uso contínuo e cópias de receitas
6. "O morro está avisando" — Bombeiros. Reconhecer sinais de deslizamento (rachaduras em paredes, árvores ou postes inclinados, água barrenta minando do chão)

**Eixo Durante o evento**
7. "Desliga antes de sair" — volta para casa do jogador. Desligar energia e gás antes de sair
8. "Água corrente não se atravessa" — Bombeiros. Nunca atravessar rua alagada a pé ou de carro
9. "Para o lugar seguro" — Abrigo. Chegar ao abrigo pela rota alta, já que as ruas baixas estão alagadas
10. "Ninguém fica para trás" — CRAS. Como ajudar vizinhos e quem precisa de apoio

### 4.7 Minijogo do kit de emergência

- Tela com uma mochila e uma prateleira de itens
- A mochila tem limite de peso ou espaço
- Itens úteis: documentos em saco plástico, lanterna, pilhas, rádio a pilha, água, comida que não estraga, remédios, carregador portátil, apito, capa de chuva, roupa extra
- Itens que atrapalham ou não são prioridade: videogame, objetos pesados, eletrodomésticos, coisas de vidro
- Ao confirmar, o jogo mostra o que ficou bom e o que faltou, com explicação curta de cada item

### 4.8 Perguntas nas instituições

- Cada visita termina com uma pergunta de múltipla escolha ou uma escolha de ação ("O que você faz agora?")
- Errar não reprova. O personagem explica por que aquela não era a melhor opção e o jogador tenta de novo
- Registrar acertos de primeira para mostrar na tela final

### 4.9 Progressão e pins

- Cada missão concluída dá um pin com o ícone da instituição
- Painel de pins sempre acessível no HUD
- Ao terminar um eixo, aparece uma transição curta mostrando o clima piorando e o nome do próximo eixo
- Tela final com os pins, número de acertos de primeira e um resumo em tópicos do que foi aprendido em cada eixo

## 5. Arte e áudio

- Estilo low-poly com cores chapadas, construído só com geometrias do Three.js (caixas, cilindros, cones, planos)
- Paleta clara e amigável. Cada instituição com uma cor marcante para ser reconhecida de longe
- Chuva com sistema de partículas simples, com intensidade por fase
- Iluminação e cor do céu mudando por fase
- Áudio opcional e gerado por código com Web Audio API (som de chuva, som de pin coletado). Botão de mudo sempre visível
- Nada de imagens ou modelos baixados

## 6. Interface

- Tela inicial com título, botão Jogar, botão Como jogar e botão Créditos
- HUD com: missão atual, eixo atual, pins coletados, botão de pausa, botão de mudo
- Caixa de diálogo estilo visual novel na parte de baixo da tela, com nome e cor da instituição
- Fontes grandes e legíveis. Contraste adequado
- Botões grandes o suficiente para toque no celular
- Opção de continuar o jogo salvo ou começar de novo

## 7. Estrutura do projeto

```
/
├─ index.html
├─ package.json
├─ vite.config.ts
├─ src/
│  ├─ main.ts
│  ├─ config.ts            (nome do jogo, constantes)
│  ├─ core/                (loop, input, câmera, save)
│  ├─ world/               (cidade, rio, clima, prédios)
│  ├─ player/              (personagem, pathfinding)
│  ├─ missions/            (gerenciador de missões e eixos)
│  ├─ minigames/           (kit de emergência)
│  ├─ ui/                  (HUD, diálogos, menus, tela final)
│  └─ audio/
├─ public/
└─ content/
   ├─ missions.json
   ├─ institutions.json
   ├─ dialogues.json
   ├─ questions.json
   └─ kit-items.json
```

O conteúdo em `content/` precisa ser editável por alguém que não programa. Documente o formato de cada JSON no README.

## 8. Requisitos técnicos

- `vite.config.ts` com `base: './'` para o build funcionar em subpasta e dentro de iframe
- Mirar 60 fps em notebook comum e pelo menos 30 fps em máquina fraca. Usar `InstancedMesh` para árvores e casas repetidas
- Limitar o pixel ratio do renderer (no máximo 2)
- Redimensionar corretamente ao mudar o tamanho da janela
- Toda leitura e escrita no `localStorage` dentro de try/catch, e o jogo precisa funcionar mesmo se o storage falhar
- Sem erros no console
- README com: como rodar (`npm install`, `npm run dev`), como gerar o build, como editar o conteúdo e como incorporar o jogo em uma página via iframe

## 9. Ordem de implementação

Trabalhe em fases. Ao final de cada fase, rode o projeto, confira se não tem erro e me mostre um resumo do que foi feito antes de seguir.

1. **Base** — projeto Vite + TS + Three.js, cena com chão, câmera isométrica, controles de câmera e resize
2. **Cidade** — mapa de tiles, ruas, rio, morro, prédios das instituições e decoração
3. **Personagem** — personagem low-poly, clique ou toque para andar, pathfinding A*
4. **Missões** — sistema de missões lendo os JSONs, marcadores, diálogo, pergunta, pins, save
5. **Clima e fases** — chuva, céu, nível do rio e ruas bloqueadas na fase Durante o evento
6. **Minijogo do kit**
7. **Interface completa** — tela inicial, como jogar, pausa, tela final, créditos
8. **Polimento** — áudio, animações dos pins, ajustes de performance e teste no celular

## 10. Critérios de aceite

- Dá para jogar do começo ao fim, completando as 10 missões e chegando à tela final
- Funciona no Chrome e no Firefox, no desktop e no celular
- O build em `dist/` abre direto em servidor estático e dentro de um iframe
- Trocar um texto em `content/*.json` muda o jogo sem mexer no código
- O progresso continua depois de recarregar a página

## 11. O que não fazer

- Não usar engine pesada nem bibliotecas que deixem o build grande sem necessidade
- Não baixar assets da internet
- Não colocar texto educativo fixo dentro do código
- Não usar linguagem alarmista ou imagens que assustem. O tom é de orientação e cuidado
- Não inventar números de telefone, siglas ou procedimentos. Use só os já citados aqui e deixe marcado com `// TODO validar` qualquer informação nova que precisar acrescentar
