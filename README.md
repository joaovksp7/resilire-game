# Missão Clima — Caminhos da Prevenção

Jogo educativo para navegador sobre **enchentes e deslizamentos**, para estudantes do ensino fundamental II e médio dos Vales do Rio Pardo e Taquari (RS). O jogador anda por uma cidade 3D, recebe missões e visita instituições que ensinam como agir antes e durante um evento climático extremo.

- Game design completo: [`prompt-jogo-desastres-climaticos.md`](prompt-jogo-desastres-climaticos.md)
- Regras para quem desenvolve: [`CLAUDE.md`](CLAUDE.md) / [`AGENTS.md`](AGENTS.md)

> **Status:** Fase 1 (Base) — cena 3D com chão provisório, câmera isométrica e controles de câmera. A cidade, o personagem e as missões entram nas próximas fases.

---

## Como rodar

Precisa do [Node.js](https://nodejs.org/) **20.19 ou mais novo** (recomendado: 22 LTS).

```bash
npm install     # só na primeira vez
npm run dev     # abre o servidor de desenvolvimento
```

Depois, abra o endereço que aparecer no terminal (normalmente `http://localhost:5173`).

### Controles (até agora)

| Ação | Computador | Celular |
|---|---|---|
| Mover a câmera | `W` `A` `S` `D` ou setas | — |
| Zoom | Roda do mouse | Pinça com dois dedos |

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

## Estrutura

```
index.html            página principal
src/
  main.ts             liga tudo: renderer, cena, câmera, entrada e loop
  config.ts           nome do jogo e constantes (câmera, render)
  style.css           cores e fontes (variáveis CSS) e layout base
  core/               loop, entrada (teclado/mouse/toque), câmera, renderer
  world/              cena e, nas próximas fases, cidade, rio e clima
```
