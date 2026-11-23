import type { CacaPalavrasActivity } from '../missions/content';
import { textEl, uid } from '../ui/cards';
import type { ActivityResult, ActivityTheme } from './activities';
import { button, el, openActivityPanel, resultList } from './activityPanel';

// Textos da interface (não são conteúdo educativo: esse fica em content/atividades.json).
const TEXT = {
  words: 'Palavras',
  grid: 'Grade de letras',
  found: 'achada',
  notFound: 'ainda não achada',
  pickFirst: 'Toque na primeira letra de uma palavra.',
  pickLast: 'Agora toque na última letra da palavra.',
  cancelled: 'Letra desmarcada. Toque na primeira letra de uma palavra.',
  wrongTitle: 'Não é uma das palavras',
  wrongText: 'Toque na primeira e na última letra de uma palavra da lista, na mesma linha ou na mesma coluna.',
  foundTitle: (palavra: string) => `Você achou ${palavra}!`,
  letterLabel: (row: number, col: number, letter: string, state: string) =>
    `linha ${row}, coluna ${col}, letra ${letter}${state ? `, ${state}` : ''}`,
  chosen: 'escolhida',
  inWord: 'achada',
  counter: (n: number, total: number) => `Palavras achadas: ${n} de ${total}`,
  said: (titulo: string, texto: string) => `${titulo} ${texto}`,
  allFound: 'Você achou todas as palavras.',
  next: 'Continuar',
} as const;

/** Colunas da grade no celular: 8 cabem em 360px com cada letra perto de 40px. */
export const GRID_COLS = 8;
/** A grade tem pelo menos 8 linhas; mais, se a maior palavra for maior que isso (no celular, ela fica na vertical). */
const MIN_ROWS = 8;
/** Tela larga: a atividade abre em duas colunas e a grade fica quadrada. */
const WIDE_QUERY = '(min-width: 40rem)';

/**
 * Formato da grade. `narrow` (celular): 8 colunas, e cresce para baixo. `square` (tela larga): quadrada,
 * com o lado do tamanho da maior palavra (no mínimo 8), como num caça-palavras comum.
 */
export type GridShape = 'narrow' | 'square';

function gridSize(words: readonly string[], shape: GridShape): { rows: number; cols: number } {
  const side = Math.max(MIN_ROWS, ...words.map((w) => w.length));
  return shape === 'square' ? { rows: side, cols: side } : { rows: side, cols: GRID_COLS };
}

/** A tela é larga o bastante para a grade quadrada e as duas colunas? */
function isWideScreen(): boolean {
  try {
    return typeof window.matchMedia === 'function' && window.matchMedia(WIDE_QUERY).matches;
  } catch {
    return false;
  }
}
const ATTEMPTS = 200;
const FILLER = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';

/** Como a palavra aparece na grade: maiúscula, sem acento e sem hífen (Ç vira C, Ã vira A, BEM-ESTAR vira BEMESTAR). */
export function gridWord(palavra: string): string {
  return palavra.replace(/-/g, '').normalize('NFD').replace(/[̀-ͯ]/g, '').toUpperCase();
}

export interface WordPlace {
  readonly row: number;
  readonly col: number;
  readonly vertical: boolean;
  readonly length: number;
}
export interface WordGrid {
  readonly rows: number;
  readonly cols: number;
  /** letters[linha][coluna] */
  readonly letters: readonly (readonly string[])[];
  /** Onde ficou cada palavra (na mesma ordem da lista). */
  readonly places: readonly WordPlace[];
}

/** Quantas vezes a palavra aparece na grade, na horizontal (esquerda → direita) e na vertical (cima → baixo). */
function occurrences(letters: readonly (readonly string[])[], word: string): number {
  const rows = letters.length;
  const cols = letters[0].length;
  let n = 0;
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (c + word.length <= cols && [...word].every((ch, k) => letters[r][c + k] === ch)) n++;
      if (r + word.length <= rows && [...word].every((ch, k) => letters[r + k][c] === ch)) n++;
    }
  }
  return n;
}

/**
 * Monta a grade: as palavras só na horizontal e na vertical, na ordem de leitura; duas palavras podem
 * se cruzar numa letra igual. O resto é sorteado, e a grade só vale se cada palavra aparecer uma vez só.
 * Devolve null se não der para montar (as palavras não cabem).
 */
export function buildWordGrid(
  palavras: readonly string[],
  shape: GridShape = 'narrow',
  random: () => number = Math.random,
): WordGrid | null {
  const words = palavras.map(gridWord);
  const { rows, cols } = gridSize(words, shape);
  // As maiores primeiro: são as mais difíceis de encaixar.
  const order = words.map((_, i) => i).sort((a, b) => words[b].length - words[a].length);

  for (let attempt = 0; attempt < ATTEMPTS; attempt++) {
    const cells: (string | null)[][] = Array.from({ length: rows }, () => Array<string | null>(cols).fill(null));
    const places: WordPlace[] = [];
    let ok = true;
    for (const i of order) {
      const w = words[i];
      const options: WordPlace[] = [];
      for (const vertical of [false, true]) {
        const lastRow = vertical ? rows - w.length : rows - 1;
        const lastCol = vertical ? cols - 1 : cols - w.length;
        for (let row = 0; row <= lastRow; row++) {
          for (let col = 0; col <= lastCol; col++) {
            const fits = [...w].every((ch, k) => {
              const cell = cells[vertical ? row + k : row][vertical ? col : col + k];
              return cell === null || cell === ch;
            });
            if (fits) options.push({ row, col, vertical, length: w.length });
          }
        }
      }
      if (options.length === 0) {
        ok = false;
        break;
      }
      const place = options[Math.floor(random() * options.length)];
      places[i] = place;
      [...w].forEach((ch, k) => {
        cells[place.vertical ? place.row + k : place.row][place.vertical ? place.col : place.col + k] = ch;
      });
    }
    if (!ok) continue;
    const letters = cells.map((line) => line.map((ch) => ch ?? FILLER[Math.floor(random() * FILLER.length)]));
    if (words.every((w) => occurrences(letters, w) === 1)) return { rows, cols, letters, places };
  }
  return null;
}

/**
 * Atividade `caca-palavras`: uma grade de letras. O aluno toca na primeira e na última letra de uma
 * palavra (em qualquer ordem). A lista fica à vista e vai sendo riscada; cada palavra achada mostra a
 * explicação no rodapé fixo. Teclado: a grade é uma parada só do Tab; as setas andam pelas letras.
 * Sem erro a explicar: conta sempre como acerto de primeira (decisão 6 do plano-parte-3).
 */
export class WordSearchMinigame {
  private readonly root: HTMLElement;
  private readonly onRight: () => void;

  constructor(root: HTMLElement, onRight: () => void = () => {}) {
    this.root = root;
    this.onRight = onRight;
  }

  run(activity: CacaPalavrasActivity, theme: ActivityTheme): Promise<ActivityResult> {
    return new Promise((resolve) => {
      const { palavras } = activity;
      // Tela larga: grade quadrada, lista ao lado e tudo cabendo sem rolar. Celular: 8 colunas, uma coisa embaixo da outra.
      const wide = isWideScreen();
      // O conteúdo já foi conferido ao abrir o jogo (as palavras cabem nos dois formatos), então a grade sai.
      const grid = buildWordGrid(
        palavras.map((p) => p.palavra),
        wide ? 'square' : 'narrow',
      ) as WordGrid;
      const panel = openActivityPanel(this.root, theme, activity.titulo, activity.instrucao, { wide });
      const found = new Set<number>();
      let first: { row: number; col: number } | null = null;
      let focusRow = 0;
      let focusCol = 0;

      const counter = textEl('p', 'atividade__dica', '');

      // Lista de palavras (com acento), riscada conforme o aluno acha.
      const listSection = el('section', 'atividade__secao');
      const listTitle = textEl('h3', 'atividade__secao-titulo', TEXT.words);
      listTitle.id = uid('caca-palavras');
      listSection.setAttribute('aria-labelledby', listTitle.id);
      const list = el('ul', 'caca__lista');
      const listItems = palavras.map((p) => {
        const li = document.createElement('li');
        const word = textEl('span', 'caca__palavra', p.palavra);
        const state = textEl('span', 'caca__estado', TEXT.notFound);
        li.append(word, state);
        list.append(li);
        return { li, state };
      });
      listSection.append(listTitle, list);

      // Grade: uma parada do Tab (tabindex móvel); as setas andam pelas letras.
      const gridBox = el('div', 'caca');
      gridBox.setAttribute('role', 'group');
      gridBox.setAttribute('aria-label', TEXT.grid);
      gridBox.style.setProperty('--colunas', String(grid.cols));
      gridBox.style.setProperty('--linhas', String(grid.rows));
      const letterButtons = grid.letters.map((line, row) =>
        line.map((letter, col) => {
          const b = button(letter, 'caca__letra');
          b.tabIndex = row === 0 && col === 0 ? 0 : -1;
          b.addEventListener('click', () => pick(row, col));
          b.addEventListener('focus', () => moveTabStop(row, col));
          gridBox.append(b);
          return b;
        }),
      );

      gridBox.addEventListener('keydown', (event) => {
        // A grade é uma parada só do Tab. A janela prende o foco contando todos os botões (inclusive as
        // letras fora da vez do Tab), então quem cuida do Tab aqui é a grade: vai para "Continuar" quando
        // ele aparece; senão, o foco fica na grade (é a única parada da tela).
        if (event.key === 'Tab') {
          event.preventDefault();
          if (!action.hidden) action.focus();
          return;
        }
        const moves: Record<string, [number, number]> = {
          ArrowUp: [-1, 0],
          ArrowDown: [1, 0],
          ArrowLeft: [0, -1],
          ArrowRight: [0, 1],
        };
        const move = moves[event.key];
        if (!move) return;
        event.preventDefault();
        const row = Math.min(grid.rows - 1, Math.max(0, focusRow + move[0]));
        const col = Math.min(grid.cols - 1, Math.max(0, focusCol + move[1]));
        letterButtons[row][col].focus();
      });

      const moveTabStop = (row: number, col: number): void => {
        letterButtons[focusRow][focusCol].tabIndex = -1;
        focusRow = row;
        focusCol = col;
        letterButtons[row][col].tabIndex = 0;
      };

      // A dica ou a explicação da última palavra achada e, no fim, "Continuar". No celular ficam no
      // rodapé fixo; na tela larga, na coluna da lista (sem rodapé, para a grade caber sem rolar).
      const feedback = el('div', 'dialogo__retorno caca__retorno');
      const feedbackTitle = textEl('p', 'dialogo__retorno-titulo', '');
      const feedbackText = textEl('p', 'dialogo__retorno-texto', '');
      feedback.append(feedbackTitle, feedbackText);
      const action = button(TEXT.next, 'botao botao--primario');
      action.hidden = true;
      action.addEventListener('click', () => finish());

      const showFeedback = (kind: 'dica' | 'certo' | 'errado', title: string, text: string): void => {
        feedback.className = `dialogo__retorno caca__retorno${kind === 'certo' ? ' dialogo__retorno--certo' : kind === 'errado' ? ' dialogo__retorno--errado' : ''}`;
        feedbackTitle.hidden = title === '';
        feedbackTitle.textContent = title;
        feedbackText.textContent = text;
      };

      /** A palavra em que esta letra está, se já foi achada. */
      const inFoundWord = (row: number, col: number): boolean =>
        [...found].some((i) => {
          const p = grid.places[i];
          return p.vertical
            ? col === p.col && row >= p.row && row < p.row + p.length
            : row === p.row && col >= p.col && col < p.col + p.length;
        });

      const render = (): void => {
        counter.textContent = TEXT.counter(found.size, palavras.length);
        letterButtons.forEach((line, row) =>
          line.forEach((b, col) => {
            const chosen = first !== null && first.row === row && first.col === col;
            const done = inFoundWord(row, col);
            b.classList.toggle('caca__letra--achada', done);
            b.setAttribute('aria-pressed', String(chosen));
            b.setAttribute(
              'aria-label',
              TEXT.letterLabel(row + 1, col + 1, grid.letters[row][col], chosen ? TEXT.chosen : done ? TEXT.inWord : ''),
            );
          }),
        );
        palavras.forEach((_, i) => {
          const { li, state } = listItems[i];
          li.classList.toggle('caca__item--achada', found.has(i));
          state.textContent = found.has(i) ? TEXT.found : TEXT.notFound;
        });
        action.hidden = found.size < palavras.length;
      };

      const pick = (row: number, col: number): void => {
        if (first === null) {
          first = { row, col };
          render();
          showFeedback('dica', '', TEXT.pickLast);
          panel.say(TEXT.pickLast);
          return;
        }
        const start = first;
        first = null;
        if (start.row === row && start.col === col) {
          render();
          showFeedback('dica', '', TEXT.cancelled);
          panel.say(TEXT.cancelled);
          return;
        }
        // Na mesma linha ou coluna, em qualquer ordem: a palavra vai da letra de cima (ou da esquerda).
        let place: WordPlace | null = null;
        if (start.row === row) {
          place = { row, col: Math.min(start.col, col), vertical: false, length: Math.abs(start.col - col) + 1 };
        } else if (start.col === col) {
          place = { row: Math.min(start.row, row), col, vertical: true, length: Math.abs(start.row - row) + 1 };
        }
        const index =
          place === null
            ? -1
            : grid.places.findIndex(
                (p) => p.row === place.row && p.col === place.col && p.vertical === place.vertical && p.length === place.length,
              );
        if (index < 0) {
          render();
          showFeedback('errado', TEXT.wrongTitle, TEXT.wrongText);
          panel.say(TEXT.said(`${TEXT.wrongTitle}.`, TEXT.wrongText));
          return;
        }
        const isNew = !found.has(index);
        found.add(index);
        render();
        const word = palavras[index];
        showFeedback('certo', TEXT.foundTitle(word.palavra), word.explicacao);
        const allFound = found.size === palavras.length;
        panel.say(`${TEXT.said(TEXT.foundTitle(word.palavra), word.explicacao)}${allFound ? ` ${TEXT.allFound}` : ''}`);
        if (allFound && isNew) action.focus();
      };

      const finish = (): void => {
        this.onRight();
        const items = palavras.map((p) => ({ title: p.palavra, note: null, explanation: p.explicacao, right: true }));
        panel.showResult(true, TEXT.allFound, [resultList(items, false)], () => {
          panel.close();
          resolve({ firstTry: true });
        });
      };

      render();
      showFeedback('dica', '', TEXT.pickFirst);
      if (wide) {
        // "Continuar" na linha do contador ("10 de 10"), para a coluna não passar da altura da grade.
        const top = el('div', 'caca__topo');
        top.append(counter, action);
        const side = el('div', 'caca__lado');
        side.append(panel.instruction, top, listSection, feedback, panel.notice);
        const layout = el('div', 'caca__layout');
        layout.append(side, gridBox);
        panel.show(layout);
      } else {
        panel.show(panel.instruction, counter, listSection, gridBox, panel.footer(feedback, action, panel.notice));
      }
      letterButtons[0][0].focus();
    });
  }
}
