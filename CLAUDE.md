# CLAUDE.md

## Workflow obrigatório

Para toda instrução, nesta ordem — sem exceção:

1. **Ler** — identificar e ler todos os arquivos ligados à instrução (módulos em `src/`, conteúdo em `content/`, estilos, configs, o plano do jogo).
2. **Confirmar** — responder com:
   - **Entendi:** (2–3 frases resumindo o que foi pedido)
   - **Arquivos que vou mudar:** (nome e caminho de cada um)
   - **Arquivos que vou criar:** (nome e caminho de cada um, se houver)
   - **O que muda em cada:** (descrição breve por arquivo)
3. **Esperar** — não mexer em nada antes de confirmação explícita ("ok", "pode ir", "sim" ou equivalente).
4. **Executar** — só depois da confirmação, implementar exatamente o combinado. Não expandir escopo sem avisar antes.

Se qualquer parte da instrução estiver ambígua, perguntar antes de ler os arquivos.

---

## Regras

**Fazer:**

- Seguir os padrões já estabelecidos no projeto (nomes, estrutura de pastas, tokens em CSS variables)
- Ficar no escopo estrito do que foi pedido
- Reportar problema encontrado fora do escopo antes de agir sobre ele
- Conferir imports, exports e tipos afetados pela mudança
- Avisar quando uma mudança puder quebrar outra parte do jogo
- Todo texto visível em **PT-BR** — o público é estudante de escola brasileira

**Não fazer:**

- Mudar arquivo sem apresentar o plano e esperar confirmação
- Assumir o que não foi dito
- Refatorar além do que foi pedido
- Renomear, mover ou apagar arquivo sem aprovação explícita
- Criar arquivo novo sem avisar antes
- Instalar dependência nova ou mexer no `package.json` sem informar e esperar confirmação
- Reescrever lógica que funciona ao corrigir algo simples
- Adiantar fase do plano. Uma fase por vez, e só começa a próxima quando a atual for aprovada
- Fazer `git commit`, `git push`, mudar de branch ou mexer em `.github/workflows/` sem pedido explícito
- Rodar comando destrutivo (`rm -rf`, `git reset --hard`, `git clean`) sem pedido explícito
- Editar `dist/` ou `node_modules/` à mão
- Hard-code de texto educativo (missão, diálogo, pergunta, explicação, item do kit) no TypeScript ou no HTML — conteúdo mora em `content/`
- **Inventar conteúdo de segurança.** Telefone, sigla, procedimento de emergência ou orientação que não esteja no plano é decisão humana, não palpite do modelo. Se faltar, deixar marcado com `// TODO validar` e avisar

---

## Projeto — Missão Clima: Caminhos da Prevenção

Jogo educativo para navegador sobre **enchentes e deslizamentos**, para estudantes de ensino fundamental II e médio dos Vales do Rio Pardo e Taquari. O jogador anda por uma cidade 3D low-poly, recebe missões e visita instituições que ensinam como agir antes e durante um evento climático extremo. Referência de jogabilidade: "Caminhos da Cidadania" (itch.io).

Publicado como site estático e incorporado por **iframe** em página WordPress.

Roda em **computador fraco de laboratório, Chromebook e celular do aluno** — os três são alvo primário, não adaptação um do outro.

**Conteúdo de segurança em desastre.** Uma orientação errada aqui pesa mais que num jogo qualquer. Nada de orientação de emergência sai de palpite do modelo.

### Fonte da verdade

- **`prompt-jogo-desastres-climaticos.md`** (raiz) — game design completo, missões, instituições, fases de implementação e critérios de aceite. Ler antes de começar qualquer fase nova.
- **`content/*.json`** — todo o texto educativo do jogo. Revisado pela equipe antes de ir pro ar.

Os três eixos são chaves fixas, sempre nesta ordem: `alerta` → `preparacao` → `durante`.

---

## Stack

- **TypeScript** + **Vite** + **Three.js**
- Interface (HUD, diálogos, menus) em HTML e CSS puros sobre o canvas. Sem React, Vue ou framework de UI
- Sem backend. Progresso salvo em `localStorage`
- **Zero requisição externa em runtime** — sem CDN, sem Google Fonts, sem API. Fonte self-hosted em `public/fontes/` ou fonte do sistema. Rede de escola cai
- **Zero asset baixado da internet.** Cidade, personagem e prédios feitos com geometria primitiva do Three.js
- `vite.config.ts` com `base: './'` — o build precisa abrir em subpasta e dentro de iframe

### Estrutura de arquivos

```
index.html
package.json
vite.config.ts
tsconfig.json
src/
  main.ts
  config.ts            # nome do jogo e constantes
  core/                # loop, input, câmera, save
  world/               # cidade, rio, clima, prédios
  player/              # personagem, pathfinding A*
  missions/            # gerenciador de missões e eixos
  minigames/           # kit de emergência
  ui/                  # HUD, diálogos, menus, tela final
  audio/               # Web Audio API, sons gerados por código
content/
  missions.json
  institutions.json
  dialogues.json
  questions.json
  kit-items.json
public/
  fontes/
prompt-jogo-desastres-climaticos.md
README.md
CLAUDE.md
AGENTS.md
```

---

## Conteúdo — `content/`

O único lugar onde mora texto educativo. **Nunca** tocar no código de renderização para mudar conteúdo.

- O formato de cada JSON fica documentado no `README.md`. Mudar formato = avisar antes, porque a equipe edita esses arquivos sem programar
- Todo item tem `id` estável. Missão aponta para instituição, diálogo e pergunta pelo `id`, nunca pelo texto
- Toda missão tem `eixo` com uma das três chaves fixas
- Pergunta: `correta` é o **índice** dentro de `alternativas`, não o texto. Alternativas embaralhadas na exibição
- Os JSONs ficam formatados e legíveis, porque o conteúdo é revisado lendo esses arquivos

---

## Mecânica — o que não pode quebrar

- **Loop:** missão → andar até a instituição → diálogo → pergunta → pin → próxima missão
- **Eixos em ordem fixa.** Clima, nível do rio e ruas bloqueadas mudam por eixo. Na fase `durante`, ruas baixas alagadas obrigam rota pela parte alta
- **Errar não reprova.** Explica e deixa tentar de novo. Sem cronômetro, sem penalidade
- **Movimento por clique ou toque** com A* em grade de tiles. WASD e setas movem a câmera
- **`localStorage` pode não existir.** Dentro de iframe cross-origin o Safari bloqueia e o Chrome particiona. Todo acesso em `try/catch`, degradando para estado em memória. Nunca deixar isso derrubar o jogo

---

## Performance

- Mirar 60 fps em notebook comum e no mínimo 30 fps em máquina fraca
- `InstancedMesh` para árvores, casas e objetos repetidos
- Pixel ratio do renderer limitado a 2
- Partículas de chuva com quantidade limitada e reduzida no celular
- Avisar antes de qualquer mudança que aumente muito o tamanho do build

---

## Quality floor

Vale independente do que o plano mostra:

- Contraste alto, fonte grande, alvo de toque generoso no celular
- Botões de interface são `<button>`, não `<div>` clicável
- Foco de teclado visível. Menus, diálogos, perguntas e minijogo navegáveis só pelo teclado
- `prefers-reduced-motion` respeitado (chuva e animações mais calmas)
- 360px de largura sem rolagem horizontal
- Tom de orientação e cuidado. Sem alarmismo, sem imagem que assuste
- Sem erro no console

---

## Ao terminar

- `npx tsc --noEmit` sem erro
- `npm run build` sem erro, e o `dist/` abrindo em servidor estático (`npx vite preview`)
- Conferir a parte alterada em **celular primeiro** (360px), depois desktop
- Testar com `localStorage` desabilitado — o jogo tem que continuar jogável
- Conferir que nenhum texto educativo foi parar fora de `content/`
- Ao fim de cada fase do plano, parar e mostrar resumo do que foi feito antes de seguir
- Se mudar arquitetura ou estrutura de pastas, **atualizar este `CLAUDE.md` e o `AGENTS.md`**
- Manter o `README.md` atualizado com como rodar, como gerar o build, como editar o conteúdo e como incorporar por iframe

---

## Pendências conhecidas

- Todo o conteúdo inicial das missões é rascunho e **precisa de revisão da equipe e validação com a Defesa Civil** antes de publicar
- Definir se as perguntas das instituições vão reaproveitar o banco do quiz Missão Clima ou ter banco próprio
