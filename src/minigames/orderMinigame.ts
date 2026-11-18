import type { OrdenarActivity } from '../missions/content';
import { textEl, uid } from '../ui/cards';
import type { ActivityResult, ActivityTheme } from './activities';
import { button, el, openActivityPanel, PANEL_TEXT, resultList, shuffledIndexes } from './activityPanel';

// Textos da interface (não são conteúdo educativo: esse fica em content/atividades.json).
const TEXT = {
  yourOrder: 'Sua ordem',
  steps: 'Passos',
  next: (n: number) => `Toque no passo ${n}.`,
  allPlaced: 'Todos os passos estão na lista. Confira!',
  placedLabel: (n: number, texto: string) => `Passo ${n}: ${texto}. Tocar tira da lista.`,
  added: (texto: string, n: number) => `“${texto}” é o passo ${n}.`,
  removed: (texto: string) => `“${texto}” voltou para os passos.`,
  rightText: 'Os passos estão na ordem certa.',
  wrongText: 'Alguns passos ficaram fora do lugar. Veja e tente de novo: os que estavam certos no começo da lista continuam lá.',
  shouldBe: (n: number) => `Este é o passo ${n}.`,
} as const;

/**
 * Atividade `ordenar`: os passos aparecem embaralhados e o aluno toca neles na ordem certa.
 * Tocar num passo da lista devolve ele (e os seguintes sobem). Ao conferir, mostra o que ficou fora do
 * lugar, com a explicação. Errar não reprova: ao tentar de novo, o começo certo da lista fica.
 */
export class OrderMinigame {
  private readonly root: HTMLElement;
  private readonly onRight: () => void;

  constructor(root: HTMLElement, onRight: () => void = () => {}) {
    this.root = root;
    this.onRight = onRight;
  }

  run(activity: OrdenarActivity, theme: ActivityTheme): Promise<ActivityResult> {
    return new Promise((resolve) => {
      const { passos } = activity;
      const panel = openActivityPanel(this.root, theme, activity.titulo, activity.instrucao);
      /** Ordem dos passos que ainda não foram escolhidos (embaralhada uma vez). */
      const pileOrder = shuffledIndexes(passos.length);
      /** Passos escolhidos, na ordem do aluno (índices em `passos`). */
      let placed: number[] = [];
      let attempts = 0;

      const orderSection = el('section', 'atividade__secao atividade__secao--destino');
      const orderTitle = textEl('h3', 'atividade__secao-titulo', TEXT.yourOrder);
      orderTitle.id = uid('atividade-ordem');
      orderSection.setAttribute('aria-labelledby', orderTitle.id);
      const orderList = el('ol', 'atividade__ordem');
      const hint = textEl('p', 'atividade__dica', '');
      orderSection.append(orderTitle, orderList, hint);

      const pileSection = el('section', 'atividade__secao');
      const pileTitle = textEl('h3', 'atividade__secao-titulo', TEXT.steps);
      pileTitle.id = uid('atividade-passos');
      pileSection.setAttribute('aria-labelledby', pileTitle.id);
      const pileList = el('ul', 'atividade__pilha');
      pileSection.append(pileTitle, pileList);

      const check = button(PANEL_TEXT.check, 'botao botao--primario');
      check.addEventListener('click', () => showResult());
      const footer = panel.footer(check, panel.notice);

      const pileButtons = new Map<number, HTMLButtonElement>();
      for (const index of pileOrder) {
        const b = button(passos[index].texto, 'atividade__cartao');
        b.addEventListener('click', () => place(index));
        pileButtons.set(index, b);
        const li = document.createElement('li');
        li.append(b);
        pileList.append(li);
      }

      const render = (): void => {
        orderList.replaceChildren(
          ...placed.map((index, position) => {
            const b = el('button', 'atividade__cartao atividade__cartao--escolhido');
            b.type = 'button';
            b.setAttribute('aria-label', TEXT.placedLabel(position + 1, passos[index].texto));
            b.append(textEl('span', 'atividade__numero', String(position + 1)), textEl('span', '', passos[index].texto));
            b.addEventListener('click', () => remove(index));
            const li = document.createElement('li');
            li.append(b);
            return li;
          }),
        );
        for (const [index, b] of pileButtons) (b.parentElement as HTMLElement).hidden = placed.includes(index);
        const done = placed.length === passos.length;
        pileSection.hidden = done;
        check.hidden = !done;
        hint.textContent = done ? TEXT.allPlaced : TEXT.next(placed.length + 1);
      };

      /** Próximo passo da pilha a receber o foco: o seguinte ao tocado, ou o anterior, ou "Conferir". */
      const focusAfter = (index: number): void => {
        const remaining = pileOrder.filter((i) => !placed.includes(i));
        if (remaining.length === 0) {
          check.focus();
          return;
        }
        const from = pileOrder.indexOf(index);
        const next = remaining.find((i) => pileOrder.indexOf(i) > from) ?? remaining[remaining.length - 1];
        pileButtons.get(next)?.focus();
      };

      const place = (index: number): void => {
        placed.push(index);
        render();
        panel.say(TEXT.added(passos[index].texto, placed.length));
        focusAfter(index);
      };

      const remove = (index: number): void => {
        placed = placed.filter((i) => i !== index);
        render();
        panel.say(TEXT.removed(passos[index].texto));
        pileButtons.get(index)?.focus();
      };

      const showEdit = (): void => {
        panel.say('');
        render();
        panel.show(panel.instruction, orderSection, pileSection, footer);
        const first = pileOrder.find((i) => !placed.includes(i));
        (first !== undefined ? pileButtons.get(first) : check)?.focus();
      };

      const showResult = (): void => {
        attempts += 1;
        const right = placed.every((index, position) => index === position);
        if (right) this.onRight();
        const items = placed.map((index, position) => {
          const ok = index === position;
          return {
            title: passos[index].texto,
            note: ok ? null : TEXT.shouldBe(index + 1),
            // Certo: mostra todas as explicações. Errado: só as dos passos fora do lugar.
            explanation: right || !ok ? passos[index].explicacao : null,
            right: ok,
          };
        });
        panel.showResult(right, right ? TEXT.rightText : TEXT.wrongText, [resultList(items, true)], () => {
          if (right) {
            panel.close();
            resolve({ firstTry: attempts === 1 });
            return;
          }
          // O começo da lista que já estava certo fica; o resto volta para os passos.
          const keep = placed.findIndex((index, position) => index !== position);
          placed = placed.slice(0, keep);
          showEdit();
        });
      };

      showEdit();
    });
  }
}
