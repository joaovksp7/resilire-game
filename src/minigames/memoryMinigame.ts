import type { MemoriaActivity } from '../missions/content';
import { textEl } from '../ui/cards';
import type { ActivityResult, ActivityTheme } from './activities';
import { button, el, openActivityPanel, resultList, shuffledIndexes } from './activityPanel';

// Textos da interface (não são conteúdo educativo: esse fica em content/atividades.json).
const TEXT = {
  situation: 'Situação',
  care: 'Cuidado',
  counter: (n: number, total: number) => `Pares achados: ${n} de ${total}`,
  pick: 'Toque numa carta para virar.',
  pickSecond: 'Agora toque em outra carta para formar o par.',
  pairTitle: 'Par encontrado!',
  noPairTitle: 'Essas duas não formam par',
  noPairText: 'Toque em outra carta para continuar: estas duas viram de novo.',
  down: (n: number) => `Carta ${n}, virada para baixo`,
  up: (n: number, kind: string, texto: string) => `Carta ${n}, ${kind}: ${texto}`,
  matched: (n: number, kind: string, texto: string) => `Carta ${n}, ${kind}: ${texto}, par encontrado`,
  flipped: (kind: string, texto: string) => `${kind}: ${texto}.`,
  allFound: 'Você achou todos os pares.',
  next: 'Continuar',
} as const;

/** Uma carta: de qual par ela é e se mostra a situação ou o cuidado. */
interface Card {
  readonly pair: number;
  readonly care: boolean;
}

/**
 * Atividade `memoria`: pares de situação e cuidado, com as cartas viradas para baixo. Cada carta é um
 * botão. Duas cartas que formam par ficam viradas e mostram a explicação no rodapé fixo; duas que não
 * formam ficam viradas até o próximo toque (nada vira sozinho depois de um tempo). Sem cronômetro, e
 * conta sempre como acerto de primeira (decisão 6 do plano-parte-3).
 */
export class MemoryMinigame {
  private readonly root: HTMLElement;
  private readonly onRight: () => void;

  constructor(root: HTMLElement, onRight: () => void = () => {}) {
    this.root = root;
    this.onRight = onRight;
  }

  run(activity: MemoriaActivity, theme: ActivityTheme): Promise<ActivityResult> {
    return new Promise((resolve) => {
      const { pares } = activity;
      const panel = openActivityPanel(this.root, theme, activity.titulo, activity.instrucao);
      const all: Card[] = pares.flatMap((_, pair) => [
        { pair, care: false },
        { pair, care: true },
      ]);
      const cards = shuffledIndexes(all.length).map((i) => all[i]);
      const matched = new Set<number>();
      /** Cartas viradas que ainda não formaram par (posições em `cards`). */
      let open: number[] = [];

      const kindOf = (card: Card): string => (card.care ? TEXT.care : TEXT.situation);
      const textOf = (card: Card): string => (card.care ? pares[card.pair].cuidado : pares[card.pair].situacao);

      const counter = textEl('p', 'atividade__dica', '');
      const board = el('div', 'memoria');
      const cardButtons = cards.map((_, i) => {
        const b = button('', 'memoria__carta');
        b.addEventListener('click', () => flip(i));
        board.append(b);
        return b;
      });

      // Rodapé fixo: a dica ou a explicação do último par e, no fim, "Continuar".
      const feedback = el('div', 'dialogo__retorno memoria__retorno');
      const feedbackTitle = textEl('p', 'dialogo__retorno-titulo', '');
      const feedbackText = textEl('p', 'dialogo__retorno-texto', '');
      feedback.append(feedbackTitle, feedbackText);
      const action = button(TEXT.next, 'botao botao--primario');
      action.hidden = true;
      action.addEventListener('click', () => finish());
      const footer = panel.footer(feedback, action, panel.notice);

      const showFeedback = (kind: 'dica' | 'certo' | 'errado', title: string, text: string): void => {
        feedback.className = `dialogo__retorno memoria__retorno${kind === 'certo' ? ' dialogo__retorno--certo' : kind === 'errado' ? ' dialogo__retorno--errado' : ''}`;
        feedbackTitle.hidden = title === '';
        feedbackTitle.textContent = title;
        feedbackText.textContent = text;
      };

      const render = (): void => {
        counter.textContent = TEXT.counter(matched.size, pares.length);
        cards.forEach((card, i) => {
          const b = cardButtons[i];
          const isMatched = matched.has(card.pair);
          const isUp = isMatched || open.includes(i);
          b.className = `memoria__carta${isUp ? ' memoria__carta--virada' : ''}${isMatched ? ' memoria__carta--par' : ''}`;
          if (isUp) {
            b.replaceChildren(textEl('span', 'memoria__tipo', kindOf(card)), textEl('span', 'memoria__texto', textOf(card)));
            b.setAttribute('aria-label', (isMatched ? TEXT.matched : TEXT.up)(i + 1, kindOf(card), textOf(card)));
          } else {
            const back = textEl('span', 'memoria__verso', '?');
            back.setAttribute('aria-hidden', 'true');
            b.replaceChildren(back);
            b.setAttribute('aria-label', TEXT.down(i + 1));
          }
        });
        action.hidden = matched.size < pares.length;
      };

      const flip = (i: number): void => {
        const card = cards[i];
        // Carta de um par já achado: mostra de novo a explicação daquele par.
        if (matched.has(card.pair)) {
          showFeedback('certo', TEXT.pairTitle, pares[card.pair].explicacao);
          panel.say(`${TEXT.flipped(kindOf(card), textOf(card))} ${pares[card.pair].explicacao}`);
          return;
        }
        if (open.includes(i)) return;
        // Duas viradas sem par: viram de novo agora, no próximo toque.
        if (open.length === 2) open = [];
        open.push(i);

        if (open.length === 1) {
          render();
          showFeedback('dica', '', TEXT.pickSecond);
          panel.say(TEXT.flipped(kindOf(card), textOf(card)));
          return;
        }
        const other = cards[open[0]];
        if (other.pair === card.pair) {
          matched.add(card.pair);
          open = [];
          render();
          const explicacao = pares[card.pair].explicacao;
          showFeedback('certo', TEXT.pairTitle, explicacao);
          const allFound = matched.size === pares.length;
          panel.say(`${TEXT.flipped(kindOf(card), textOf(card))} ${TEXT.pairTitle} ${explicacao}${allFound ? ` ${TEXT.allFound}` : ''}`);
          if (allFound) action.focus();
          return;
        }
        render();
        showFeedback('errado', TEXT.noPairTitle, TEXT.noPairText);
        panel.say(`${TEXT.flipped(kindOf(card), textOf(card))} ${TEXT.noPairTitle}. ${TEXT.noPairText}`);
      };

      const finish = (): void => {
        this.onRight();
        const items = pares.map((p) => ({ title: p.situacao, note: p.cuidado, explanation: p.explicacao, right: true }));
        panel.showResult(true, TEXT.allFound, [resultList(items, false)], () => {
          panel.close();
          resolve({ firstTry: true });
        });
      };

      render();
      showFeedback('dica', '', TEXT.pick);
      panel.show(panel.instruction, counter, board, footer);
      cardButtons[0]?.focus();
    });
  }
}
