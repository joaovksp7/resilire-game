import type { ClassificarActivity } from '../missions/content';
import { textEl, uid } from '../ui/cards';
import type { ActivityResult, ActivityTheme } from './activities';
import { button, el, openActivityPanel, PANEL_TEXT, resultList, shuffledIndexes } from './activityPanel';

// Textos da interface (não são conteúdo educativo: esse fica em content/atividades.json).
const TEXT = {
  cards: 'Cartões',
  putIn: 'Pôr o cartão escolhido em:',
  putLabel: (grupo: string) => `Pôr o cartão escolhido em “${grupo}”`,
  emptyColumn: 'Nenhum cartão ainda.',
  pickFirst: 'Toque num cartão para escolher.',
  picked: (texto: string) => `Cartão escolhido: “${texto}”. Agora escolha a coluna.`,
  unpicked: (texto: string) => `“${texto}” não está mais escolhido.`,
  moved: (texto: string, grupo: string) => `“${texto}” foi para “${grupo}”.`,
  allPlaced: 'Todos os cartões estão nas colunas. Confira!',
  rightText: 'Cada cartão está na coluna certa.',
  wrongText: 'Alguns cartões ficaram na coluna errada. Eles voltam para a pilha: tente de novo.',
  youPut: (grupo: string, certo: string) => `Você pôs em “${grupo}”, mas é “${certo}”.`,
  isIn: (grupo: string) => `“${grupo}”`,
} as const;

/**
 * Atividade `classificar`: o aluno toca num cartão e depois na coluna (nada de arrastar). Um cartão
 * já numa coluna pode ser escolhido de novo para trocar de lugar. Ao conferir, os cartões na coluna
 * errada mostram a explicação e voltam para a pilha; os certos ficam. Errar não reprova.
 */
export class SortMinigame {
  private readonly root: HTMLElement;
  private readonly onRight: () => void;

  constructor(root: HTMLElement, onRight: () => void = () => {}) {
    this.root = root;
    this.onRight = onRight;
  }

  run(activity: ClassificarActivity, theme: ActivityTheme): Promise<ActivityResult> {
    return new Promise((resolve) => {
      const { cartoes, grupos } = activity;
      const panel = openActivityPanel(this.root, theme, activity.titulo, activity.instrucao);
      /** Ordem em que os cartões aparecem (embaralhada uma vez). */
      const order = shuffledIndexes(cartoes.length);
      /** Coluna onde está cada cartão (null = na pilha). */
      const where: (number | null)[] = cartoes.map(() => null);
      let selected: number | null = null;
      let attempts = 0;

      const pileSection = el('section', 'atividade__secao');
      const pileTitle = textEl('h3', 'atividade__secao-titulo', TEXT.cards);
      pileTitle.id = uid('atividade-cartoes');
      pileSection.setAttribute('aria-labelledby', pileTitle.id);
      const pileList = el('ul', 'atividade__pilha');
      const hint = textEl('p', 'atividade__dica', '');
      pileSection.append(pileTitle, pileList);

      const columns = el('div', 'atividade__colunas');
      columns.style.setProperty('--colunas', String(grupos.length));
      const columnLists = grupos.map((grupo) => {
        const section = el('section', 'atividade__secao atividade__secao--destino atividade__coluna');
        const title = textEl('h3', 'atividade__secao-titulo', grupo);
        title.id = uid('atividade-coluna');
        section.setAttribute('aria-labelledby', title.id);
        const list = el('ul', 'atividade__pilha atividade__pilha--coluna');
        const empty = textEl('p', 'atividade__vazia', TEXT.emptyColumn);
        section.append(title, list, empty);
        columns.append(section);
        return { list, empty };
      });

      // Os botões das colunas ficam no rodapé fixo: sempre à vista, mesmo com a lista de cartões rolando.
      const footerHint = textEl('p', 'atividade__dica atividade__rodape-dica', '');
      const targets = el('div', 'atividade__destinos');
      targets.style.setProperty('--colunas', String(grupos.length));
      const targetButtons = grupos.map((grupo, g) => {
        const put = button(grupo, 'botao atividade__por');
        put.setAttribute('aria-label', TEXT.putLabel(grupo));
        put.addEventListener('click', () => putIn(g));
        targets.append(put);
        return put;
      });
      const check = button(PANEL_TEXT.check, 'botao botao--primario');
      check.addEventListener('click', () => showResult());
      const footer = panel.footer(footerHint, targets, check, panel.notice);

      /** Um botão por cartão, criado de novo a cada mudança (ele troca de lista). */
      const cardButtons = new Map<number, HTMLButtonElement>();
      const cardButton = (index: number): HTMLLIElement => {
        const b = button(cartoes[index].texto, 'atividade__cartao');
        b.setAttribute('aria-pressed', String(selected === index));
        b.addEventListener('click', () => select(index));
        cardButtons.set(index, b);
        const li = document.createElement('li');
        li.append(b);
        return li;
      };

      const render = (): void => {
        cardButtons.clear();
        pileList.replaceChildren(...order.filter((i) => where[i] === null).map(cardButton));
        columnLists.forEach(({ list, empty }, g) => {
          const inside = order.filter((i) => where[i] === g);
          list.replaceChildren(...inside.map(cardButton));
          empty.hidden = inside.length > 0;
        });
        const done = where.every((g) => g !== null);
        pileList.hidden = done;
        hint.textContent = done ? TEXT.allPlaced : '';
        hint.hidden = !done;
        // Rodapé: com cartão escolhido, as colunas; sem, a dica (ou só "Conferir", com tudo nas colunas).
        targets.hidden = selected === null;
        footerHint.textContent = selected === null ? TEXT.pickFirst : TEXT.putIn;
        footerHint.hidden = selected === null && done;
        check.hidden = !done;
      };

      const select = (index: number): void => {
        selected = selected === index ? null : index;
        render();
        if (selected === null) {
          panel.say(TEXT.unpicked(cartoes[index].texto));
          cardButtons.get(index)?.focus();
          return;
        }
        panel.say(TEXT.picked(cartoes[index].texto));
        // Quem usa o teclado vai direto para as colunas, sem passar por todos os cartões.
        targetButtons[0]?.focus();
      };

      const putIn = (g: number): void => {
        if (selected === null) return;
        const index = selected;
        where[index] = g;
        selected = null;
        render();
        panel.say(TEXT.moved(cartoes[index].texto, grupos[g]));
        // Próximo cartão da pilha; sem pilha, "Conferir".
        const next = order.find((i) => where[i] === null);
        (next !== undefined ? cardButtons.get(next) : check)?.focus();
      };

      const showEdit = (): void => {
        selected = null;
        panel.say('');
        render();
        pileSection.append(hint);
        panel.show(panel.instruction, pileSection, columns, footer);
        const first = order.find((i) => where[i] === null);
        (first !== undefined ? cardButtons.get(first) : check)?.focus();
      };

      const showResult = (): void => {
        attempts += 1;
        const right = cartoes.every((card, i) => where[i] === card.grupo);
        if (right) this.onRight();
        // Os cartões fora do lugar vêm primeiro, para serem vistos sem rolar.
        const byResult = [...order].sort((a, b) => Number(where[a] === cartoes[a].grupo) - Number(where[b] === cartoes[b].grupo));
        const items = byResult.map((i) => {
          const card = cartoes[i];
          const ok = where[i] === card.grupo;
          return {
            title: card.texto,
            note: ok ? TEXT.isIn(grupos[card.grupo]) : TEXT.youPut(grupos[where[i] ?? 0], grupos[card.grupo]),
            // Certo: mostra todas as explicações. Errado: só as dos cartões fora do lugar.
            explanation: right || !ok ? card.explicacao : null,
            right: ok,
          };
        });
        panel.showResult(right, right ? TEXT.rightText : TEXT.wrongText, [resultList(items, false)], () => {
          if (right) {
            panel.close();
            resolve({ firstTry: attempts === 1 });
            return;
          }
          cartoes.forEach((card, i) => {
            if (where[i] !== card.grupo) where[i] = null;
          });
          showEdit();
        });
      };

      showEdit();
    });
  }
}
