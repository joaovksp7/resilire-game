import type { LigarActivity } from '../missions/content';
import { textEl, uid } from '../ui/cards';
import type { ActivityResult, ActivityTheme } from './activities';
import { button, el, openActivityPanel, PANEL_TEXT, resultList, shuffledIndexes } from './activityPanel';

/** O texto como frase, com ponto no fim (sem repetir o ponto que o conteúdo já tem). */
const sentence = (texto: string): string => (/[.!?]$/.test(texto.trim()) ? texto.trim() : `${texto.trim()}.`);

// Textos da interface (não são conteúdo educativo: esse fica em content/atividades.json).
const TEXT = {
  numbers: 'Números',
  letters: 'Letras',
  pickFirst: 'Arraste de um card até o outro, ou toque num número e depois na letra.',
  pickLetter: 'Agora toque na letra.',
  pickNumber: 'Agora toque no número.',
  allLinked: 'Tudo ligado. Confira!',
  linkedTo: (letter: string) => `→ ${letter}`,
  numberLabel: (n: number, texto: string, letter: string | null) =>
    `${n}: ${sentence(texto)} ${letter === null ? 'Ainda sem ligação.' : `Ligado à letra ${letter}.`}`,
  letterLabel: (letter: string, texto: string, n: number | null) =>
    `${letter}: ${sentence(texto)} ${n === null ? 'Ainda sem ligação.' : `Ligado ao número ${n}.`}`,
  pickedNumber: (n: number) => `Número ${n} escolhido. Agora escolha a letra.`,
  pickedLetter: (letter: string) => `Letra ${letter} escolhida. Agora escolha o número.`,
  unpicked: 'Nada escolhido.',
  dragCancelled: 'Solte em cima de um card do outro lado para ligar.',
  dropHere: 'Solte em cima de um card do outro lado.',
  linked: (n: number, letter: string, texto: string) => `${n} ligado a ${letter}: ${texto}.`,
  rightText: 'Cada número está ligado à letra certa.',
  wrongText: 'Algumas ligações estão erradas. Elas foram desfeitas: tente de novo.',
  isLinked: (letter: string, texto: string) => `Ligado a ${letter}: ${texto}`,
  youLinked: (letter: string, texto: string, rightLetter: string, rightText: string) =>
    `Você ligou a ${letter} (${texto}), mas o certo é ${rightLetter} (${rightText}).`,
} as const;

const LETTERS = 'ABCDEF';
const SVG_NS = 'http://www.w3.org/2000/svg';
/** Quanto o dedo (ou o mouse) anda até virar arraste; menos que isso é um toque. */
const DRAG_START_PX = 8;
/** Perto da borda de cima ou de baixo da janela, o arraste rola a tela sozinho. */
const EDGE_PX = 56;
const EDGE_SPEED_PX = 10;
/** Depois de um arraste, o clique que o navegador manda em seguida não conta como toque. */
const CLICK_AFTER_DRAG_MS = 500;

type Side = 'number' | 'letter';
/** Um lado escolhido: número (índice da situação) ou letra (índice do par da resposta). */
interface End {
  readonly side: Side;
  readonly index: number;
}
/** O que está escolhido, esperando o outro lado. */
type Picked = End | null;

/** Um arraste em andamento: de onde saiu, onde está o dedo e o card do outro lado embaixo dele. */
interface Drag {
  readonly from: End;
  readonly pointerId: number;
  readonly startX: number;
  readonly startY: number;
  x: number;
  y: number;
  active: boolean;
  target: End | null;
}

/** O ancestral que rola (a janela da atividade), para rolar sozinho durante o arraste. */
function scrollParent(node: HTMLElement): HTMLElement | null {
  for (let p = node.parentElement; p; p = p.parentElement) {
    const { overflowY } = getComputedStyle(p);
    if ((overflowY === 'auto' || overflowY === 'scroll') && p.scrollHeight > p.clientHeight) return p;
  }
  return null;
}

/**
 * Atividade `ligar`: ligar os pontos. À esquerda, as situações numeradas (na ordem do arquivo); à
 * direita, as respostas com letras, em ordem sorteada a cada vez (o 1 não liga sempre no A). O aluno
 * arrasta de um card até o do outro lado, ou toca num e depois no outro (arrastar nunca é obrigatório:
 * o toque e o teclado fazem tudo), e uma linha liga os dois. Cada letra liga com um número só. Ao conferir, as ligações erradas mostram a explicação e são
 * desfeitas; as certas ficam. Errar não reprova.
 */
export class MatchMinigame {
  private readonly root: HTMLElement;
  private readonly onRight: () => void;

  constructor(root: HTMLElement, onRight: () => void = () => {}) {
    this.root = root;
    this.onRight = onRight;
  }

  run(activity: LigarActivity, theme: ActivityTheme): Promise<ActivityResult> {
    return new Promise((resolve) => {
      const { pares } = activity;
      const panel = openActivityPanel(this.root, theme, activity.titulo, activity.instrucao);
      /** Ordem das respostas na coluna das letras (sorteada; nunca a ordem do arquivo). */
      const order = shuffledIndexes(pares.length);
      /** Letra de cada resposta (pelo índice do par). */
      const letterOf = (pair: number): string => LETTERS[order.indexOf(pair)];
      /** A qual resposta cada número está ligado (índice do par; null = sem ligação). Certo: link[i] === i. */
      const link: (number | null)[] = pares.map(() => null);
      let picked: Picked = null;
      let drag: Drag | null = null;
      /** Até quando ignorar o clique que vem logo depois de um arraste. */
      let ignoreClickUntil = 0;
      let attempts = 0;

      const numberOfLetter = (pair: number): number | null => {
        const i = link.indexOf(pair);
        return i >= 0 ? i : null;
      };

      const board = el('div', 'ligar');
      const lines = document.createElementNS(SVG_NS, 'svg');
      lines.setAttribute('class', 'ligar__linhas');
      lines.setAttribute('aria-hidden', 'true');

      const column = (title: string): { section: HTMLElement; list: HTMLElement } => {
        const section = el('section', 'ligar__coluna');
        const heading = textEl('h3', 'ligar__coluna-titulo', title);
        heading.id = uid('ligar-coluna');
        section.setAttribute('aria-labelledby', heading.id);
        const list = el('ul', 'ligar__lista');
        section.append(heading, list);
        return { section, list };
      };
      const left = column(TEXT.numbers);
      const right = column(TEXT.letters);
      board.append(left.section, right.section, lines);

      /** De qual lado e qual índice é cada botão (para achar o card embaixo do dedo). */
      const endOf = new Map<Element, End>();

      /** Botão de um lado: a marca (número ou letra), o texto e o ponto de onde sai a linha. */
      const item = (mark: string, texto: string, side: Side) => {
        const b = button('', `ligar__item ligar__item--${side === 'number' ? 'numero' : 'letra'}`);
        const badge = textEl('span', 'ligar__marca', mark);
        const label = textEl('span', 'ligar__texto', texto);
        const chip = textEl('span', 'ligar__ligado', '');
        const dot = el('span', 'ligar__ponto');
        for (const part of [badge, chip, dot]) part.setAttribute('aria-hidden', 'true');
        label.append(chip);
        if (side === 'number') b.append(badge, label, dot);
        else b.append(dot, badge, label);
        const li = document.createElement('li');
        li.append(b);
        return { li, b, chip, dot };
      };

      const clickedAfterDrag = (): boolean => performance.now() < ignoreClickUntil;
      const numberItems = pares.map((par, i) => {
        const it = item(String(i + 1), par.situacao, 'number');
        it.b.addEventListener('click', () => {
          if (!clickedAfterDrag()) pickNumber(i);
        });
        it.b.addEventListener('pointerdown', (e) => startDrag(e, { side: 'number', index: i }));
        endOf.set(it.b, { side: 'number', index: i });
        left.list.append(it.li);
        return it;
      });
      const letterItems = new Map<number, ReturnType<typeof item>>();
      order.forEach((pair, pos) => {
        const it = item(LETTERS[pos], pares[pair].resposta, 'letter');
        it.b.addEventListener('click', () => {
          if (!clickedAfterDrag()) pickLetter(pair);
        });
        it.b.addEventListener('pointerdown', (e) => startDrag(e, { side: 'letter', index: pair }));
        endOf.set(it.b, { side: 'letter', index: pair });
        right.list.append(it.li);
        letterItems.set(pair, it);
      });
      const buttonOf = (end: End): HTMLButtonElement | undefined =>
        end.side === 'number' ? numberItems[end.index]?.b : letterItems.get(end.index)?.b;
      const dotOf = (end: End): HTMLElement | undefined =>
        end.side === 'number' ? numberItems[end.index]?.dot : letterItems.get(end.index)?.dot;

      const hint = textEl('p', 'atividade__dica atividade__rodape-dica', '');
      const check = button(PANEL_TEXT.check, 'botao botao--primario');
      check.addEventListener('click', () => showResult());
      const footer = panel.footer(hint, check, panel.notice);

      /** Desenha uma linha entre o ponto de cada número e o da letra ligada a ele. */
      const drawLines = (): void => {
        const box = board.getBoundingClientRect();
        lines.setAttribute('viewBox', `0 0 ${box.width} ${box.height}`);
        const center = (node: HTMLElement): [number, number] => {
          const r = node.getBoundingClientRect();
          return [r.left + r.width / 2 - box.left, r.top + r.height / 2 - box.top];
        };
        const dragging = drag?.active ? drag.from : null;
        const segments = link.flatMap((pair, i) => {
          if (pair === null) return [];
          // A ligação antiga do card que está sendo arrastado some: soltar vai trocar por outra.
          if (dragging && (dragging.side === 'number' ? dragging.index === i : dragging.index === pair)) return [];
          const target = letterItems.get(pair);
          if (!target) return [];
          const [x1, y1] = center(numberItems[i].dot);
          const [x2, y2] = center(target.dot);
          const line = document.createElementNS(SVG_NS, 'line');
          line.setAttribute('x1', String(x1));
          line.setAttribute('y1', String(y1));
          line.setAttribute('x2', String(x2));
          line.setAttribute('y2', String(y2));
          const isPicked =
            (picked?.side === 'number' && picked.index === i) || (picked?.side === 'letter' && picked.index === pair);
          line.setAttribute('class', isPicked ? 'ligar__linha ligar__linha--escolhida' : 'ligar__linha');
          return [line];
        });
        // Durante o arraste: a linha tracejada do card até o dedo (ou até o card do outro lado, se estiver em cima dele).
        if (drag?.active) {
          const fromDot = dotOf(drag.from);
          const targetDot = drag.target ? dotOf(drag.target) : undefined;
          if (fromDot) {
            const [x1, y1] = center(fromDot);
            const [x2, y2] = targetDot ? center(targetDot) : [drag.x - box.left, drag.y - box.top];
            const line = document.createElementNS(SVG_NS, 'line');
            line.setAttribute('x1', String(x1));
            line.setAttribute('y1', String(y1));
            line.setAttribute('x2', String(x2));
            line.setAttribute('y2', String(y2));
            line.setAttribute('class', 'ligar__linha ligar__linha--arraste');
            segments.push(line);
          }
        }
        lines.replaceChildren(...segments);
      };
      // O tamanho das colunas muda com a tela (girar o celular, janela, fonte): a linha acompanha.
      const resize = new ResizeObserver(() => drawLines());
      resize.observe(board);

      const render = (): void => {
        numberItems.forEach((it, i) => {
          const pair = link[i];
          const letter = pair === null ? null : letterOf(pair);
          it.b.setAttribute('aria-pressed', String(picked?.side === 'number' && picked.index === i));
          it.b.setAttribute('aria-label', TEXT.numberLabel(i + 1, pares[i].situacao, letter));
          it.b.classList.toggle('ligar__item--ligado', letter !== null);
          it.chip.textContent = letter === null ? '' : TEXT.linkedTo(letter);
          it.chip.hidden = letter === null;
        });
        letterItems.forEach((it, pair) => {
          const n = numberOfLetter(pair);
          it.b.setAttribute('aria-pressed', String(picked?.side === 'letter' && picked.index === pair));
          it.b.setAttribute('aria-label', TEXT.letterLabel(letterOf(pair), pares[pair].resposta, n === null ? null : n + 1));
          it.b.classList.toggle('ligar__item--ligado', n !== null);
          it.chip.hidden = true;
        });
        const done = link.every((pair) => pair !== null);
        hint.textContent = drag?.active
          ? TEXT.dropHere
          : picked?.side === 'number'
            ? TEXT.pickLetter
            : picked?.side === 'letter'
              ? TEXT.pickNumber
              : done
                ? TEXT.allLinked
                : TEXT.pickFirst;
        check.hidden = !done;
        drawLines();
      };

      /** Liga o número `i` à resposta `pair`. Se a letra já estava ligada a outro número, ele fica sem ligação. */
      const connect = (i: number, pair: number): void => {
        link.forEach((p, k) => {
          if (p === pair) link[k] = null;
        });
        link[i] = pair;
        picked = null;
        render();
        panel.say(TEXT.linked(i + 1, letterOf(pair), pares[pair].resposta));
        // Próximo número sem ligação; com tudo ligado, "Conferir".
        const next = link.indexOf(null);
        (next >= 0 ? numberItems[next].b : check).focus();
      };

      const pickNumber = (i: number): void => {
        if (picked?.side === 'letter') {
          connect(i, picked.index);
          return;
        }
        picked = picked?.side === 'number' && picked.index === i ? null : { side: 'number', index: i };
        render();
        if (picked === null) {
          panel.say(TEXT.unpicked);
          return;
        }
        panel.say(TEXT.pickedNumber(i + 1));
        // Quem usa o teclado vai direto para as letras (a primeira ainda sem ligação).
        const free = order.find((pair) => numberOfLetter(pair) === null) ?? order[0];
        letterItems.get(free)?.b.focus();
      };

      const pickLetter = (pair: number): void => {
        if (picked?.side === 'number') {
          connect(picked.index, pair);
          return;
        }
        picked = picked?.side === 'letter' && picked.index === pair ? null : { side: 'letter', index: pair };
        render();
        if (picked === null) {
          panel.say(TEXT.unpicked);
          return;
        }
        panel.say(TEXT.pickedLetter(letterOf(pair)));
        const free = link.indexOf(null);
        numberItems[free >= 0 ? free : 0].b.focus();
      };

      /** O card do outro lado que está embaixo do ponto (x, y), se houver. */
      const targetAt = (x: number, y: number, from: End): End | null => {
        const under = document.elementFromPoint(x, y)?.closest('.ligar__item');
        const end = under ? endOf.get(under) : undefined;
        return end && end.side !== from.side ? end : null;
      };

      const setTarget = (target: End | null): void => {
        if (!drag) return;
        if (drag.target) buttonOf(drag.target)?.classList.remove('ligar__item--alvo');
        drag.target = target;
        if (target) buttonOf(target)?.classList.add('ligar__item--alvo');
      };

      // Rola a janela sozinho enquanto o dedo está perto da borda (o card de destino pode estar fora da vista).
      let scroller: HTMLElement | null = null;
      let frame = 0;
      const tick = (): void => {
        frame = 0;
        if (!drag?.active) return;
        if (scroller) {
          const area = scroller.getBoundingClientRect();
          // O rodapé fixo cobre o fim da janela: a borda de baixo é o topo dele.
          const footerTop = footer.getBoundingClientRect().top;
          const bottom = footerTop > area.top && footerTop < area.bottom ? footerTop : area.bottom;
          const before = scroller.scrollTop;
          if (drag.y < area.top + EDGE_PX) scroller.scrollTop -= EDGE_SPEED_PX;
          else if (drag.y > bottom - EDGE_PX) scroller.scrollTop += EDGE_SPEED_PX;
          if (scroller.scrollTop !== before) setTarget(targetAt(drag.x, drag.y, drag.from));
        }
        drawLines();
        frame = requestAnimationFrame(tick);
      };

      const onMove = (e: PointerEvent): void => {
        if (!drag || e.pointerId !== drag.pointerId) return;
        drag.x = e.clientX;
        drag.y = e.clientY;
        if (!drag.active) {
          if (Math.hypot(drag.x - drag.startX, drag.y - drag.startY) < DRAG_START_PX) return;
          drag.active = true;
          picked = drag.from;
          board.classList.add('ligar--arrastando');
          scroller = scrollParent(board);
          render();
          if (!frame) frame = requestAnimationFrame(tick);
        }
        e.preventDefault();
        setTarget(targetAt(drag.x, drag.y, drag.from));
        drawLines();
      };

      const stopDrag = (): Drag | null => {
        const ended = drag;
        window.removeEventListener('pointermove', onMove);
        window.removeEventListener('pointerup', onUp);
        window.removeEventListener('pointercancel', onCancel);
        if (frame) cancelAnimationFrame(frame);
        frame = 0;
        setTarget(null);
        drag = null;
        board.classList.remove('ligar--arrastando');
        return ended;
      };

      const onUp = (e: PointerEvent): void => {
        if (!drag || e.pointerId !== drag.pointerId) return;
        const target = drag.active ? targetAt(e.clientX, e.clientY, drag.from) : null;
        const ended = stopDrag();
        if (!ended?.active) return; // Foi um toque: o clique cuida.
        ignoreClickUntil = performance.now() + CLICK_AFTER_DRAG_MS;
        if (target) {
          const [i, pair] =
            ended.from.side === 'number' ? [ended.from.index, target.index] : [target.index, ended.from.index];
          connect(i, pair);
          return;
        }
        picked = null;
        render();
        panel.say(TEXT.dragCancelled, true);
      };

      const onCancel = (e: PointerEvent): void => {
        if (!drag || e.pointerId !== drag.pointerId) return;
        const ended = stopDrag();
        if (ended?.active) {
          picked = null;
          render();
        }
      };

      const startDrag = (e: PointerEvent, from: End): void => {
        if (drag || !e.isPrimary || (e.pointerType === 'mouse' && e.button !== 0)) return;
        ignoreClickUntil = 0;
        drag = {
          from,
          pointerId: e.pointerId,
          startX: e.clientX,
          startY: e.clientY,
          x: e.clientX,
          y: e.clientY,
          active: false,
          target: null,
        };
        // No toque, o navegador prende o dedo ao card onde ele começou: solta, para as mensagens irem à janela.
        const source = e.currentTarget as HTMLElement;
        if (source.hasPointerCapture(e.pointerId)) source.releasePointerCapture(e.pointerId);
        window.addEventListener('pointermove', onMove, { passive: false });
        window.addEventListener('pointerup', onUp);
        window.addEventListener('pointercancel', onCancel);
      };

      const showEdit = (): void => {
        picked = null;
        panel.say('');
        panel.show(panel.instruction, board, footer);
        render();
        const first = link.indexOf(null);
        (first >= 0 ? numberItems[first].b : check).focus();
      };

      const showResult = (): void => {
        stopDrag();
        attempts += 1;
        const right = link.every((pair, i) => pair === i);
        if (right) this.onRight();
        // As ligações erradas vêm primeiro, para serem vistas sem rolar.
        const byResult = pares
          .map((_, i) => i)
          .sort((a, b) => Number(link[a] === a) - Number(link[b] === b));
        const items = byResult.map((i) => {
          const pair = link[i] ?? i;
          const ok = pair === i;
          return {
            title: `${i + 1}. ${pares[i].situacao}`,
            note: ok
              ? TEXT.isLinked(letterOf(i), pares[i].resposta)
              : TEXT.youLinked(letterOf(pair), pares[pair].resposta, letterOf(i), pares[i].resposta),
            // Certo: mostra todas as explicações. Errado: só as das ligações erradas.
            explanation: right || !ok ? pares[i].explicacao : null,
            right: ok,
          };
        });
        panel.showResult(right, right ? TEXT.rightText : TEXT.wrongText, [resultList(items, false)], () => {
          if (right) {
            resize.disconnect();
            panel.close();
            resolve({ firstTry: attempts === 1 });
            return;
          }
          link.forEach((pair, i) => {
            if (pair !== i) link[i] = null;
          });
          showEdit();
        });
      };

      showEdit();
    });
  }
}
