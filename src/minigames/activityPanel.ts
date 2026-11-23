import { badge, openModal, textEl, uid } from '../ui/cards';
import { cssColor } from '../world/icons';
import type { ActivityTheme } from './activities';

// O que as telas das atividades dividem: a janela com a cor e o ícone da instituição, o título,
// a instrução, o rodapé, o aviso para o leitor de tela e o resumo do resultado.
// Textos da interface (não são conteúdo educativo: esse fica em content/atividades.json).
export const PANEL_TEXT = {
  check: 'Conferir',
  rightTitle: 'Tudo certo!',
  wrongTitle: 'Quase lá!',
  retry: 'Tentar de novo',
  done: 'Continuar',
} as const;

export function el<K extends keyof HTMLElementTagNameMap>(tag: K, className: string): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  node.className = className;
  return node;
}

export function button(label: string, className: string): HTMLButtonElement {
  const b = textEl('button', className, label);
  b.type = 'button';
  return b;
}

export interface ActivityPanel {
  /** A instrução da atividade, para pôr no começo da tela de montagem. */
  readonly instruction: HTMLElement;
  /** Troca o que aparece embaixo do título e volta a rolagem para o topo. */
  show(...nodes: HTMLElement[]): void;
  /** Rodapé fixo com os botões (e o aviso, se houver). */
  footer(...nodes: HTMLElement[]): HTMLElement;
  /**
   * Aviso de uma linha. `visible`: aparece na tela (ex.: "escolha um cartão primeiro");
   * senão é só para o leitor de tela (a tela já mostra o que mudou).
   */
  readonly notice: HTMLElement;
  say(text: string, visible?: boolean): void;
  /**
   * Mostra o resultado: o resumo (certo ou não), o que vier em `details` e o botão
   * "Continuar" (certo) ou "Tentar de novo". O foco vai para o resumo, para ler antes do botão.
   */
  showResult(right: boolean, text: string, details: HTMLElement[], onButton: () => void): void;
  close(): void;
}

/**
 * Abre a janela de uma atividade, já no tema da instituição.
 * `wide`: janela mais larga, para atividade em duas colunas na tela larga (o caça-palavras).
 */
export function openActivityPanel(
  root: HTMLElement,
  theme: ActivityTheme,
  title: string,
  instruction: string,
  options: { wide?: boolean } = {},
): ActivityPanel {
  const box = el('div', options.wide ? 'atividade atividade--larga' : 'atividade');
  box.style.setProperty('--cor-inst', cssColor(theme.color));
  const titleId = uid('atividade-titulo');
  const header = el('div', 'atividade__cabecalho');
  const heading = textEl('h2', 'atividade__titulo', title);
  heading.id = titleId;
  header.append(badge(theme.icon, theme.color), heading);
  const body = el('div', 'atividade__corpo');
  box.append(header, body);

  const notice = el('p', 'atividade__aviso');
  notice.setAttribute('role', 'status');
  notice.setAttribute('aria-live', 'polite');

  const modal = openModal(root, box, { labelledBy: titleId, variant: 'panel' });

  return {
    instruction: textEl('p', 'atividade__instrucao', instruction),
    notice,
    show(...nodes) {
      body.replaceChildren(...nodes);
      box.scrollTop = 0;
    },
    footer(...nodes) {
      const f = el('div', 'atividade__rodape');
      f.append(...nodes);
      return f;
    },
    say(text, visible = false) {
      notice.textContent = text;
      notice.classList.toggle('atividade__aviso--visivel', visible);
    },
    showResult(right, text, details, onButton) {
      const summary = el('div', `dialogo__retorno ${right ? 'dialogo__retorno--certo' : 'dialogo__retorno--errado'}`);
      const summaryTitle = textEl('p', 'dialogo__retorno-titulo', right ? PANEL_TEXT.rightTitle : PANEL_TEXT.wrongTitle);
      summaryTitle.tabIndex = -1;
      summary.append(summaryTitle, textEl('p', 'dialogo__retorno-texto', text));
      const after = button(right ? PANEL_TEXT.done : PANEL_TEXT.retry, 'botao botao--primario');
      after.addEventListener('click', onButton);
      const f = el('div', 'atividade__rodape');
      f.append(after);
      body.replaceChildren(summary, ...details, f);
      box.scrollTop = 0;
      summaryTitle.focus();
    },
    close: () => modal.close(),
  };
}

/** Lista do resultado: um item por passo ou cartão, marcado como certo ou fora do lugar. */
export function resultList(
  items: readonly { title: string; note: string | null; explanation: string | null; right: boolean }[],
  ordered: boolean,
): HTMLElement {
  const list = el(ordered ? 'ol' : 'ul', 'atividade__resultado');
  for (const item of items) {
    const li = el('li', item.right ? 'atividade__resultado--certo' : 'atividade__resultado--errado');
    const mark = textEl('span', 'atividade__resultado-marca', item.right ? '✓' : '!');
    mark.setAttribute('aria-hidden', 'true');
    const texts = el('div', 'atividade__resultado-texto');
    texts.append(textEl('p', 'atividade__resultado-nome', item.title));
    if (item.note) texts.append(textEl('p', 'atividade__resultado-nota', item.note));
    if (item.explanation) texts.append(textEl('p', 'atividade__resultado-explicacao', item.explanation));
    li.append(mark, texts);
    list.append(li);
  }
  return list;
}

/** Embaralha sem deixar na ordem original (quando dá): assim a atividade nunca começa resolvida. */
export function shuffledIndexes(length: number): number[] {
  const order = Array.from({ length }, (_, i) => i);
  for (let tries = 0; tries < 10; tries++) {
    for (let i = order.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [order[i], order[j]] = [order[j], order[i]];
    }
    if (length < 2 || order.some((v, i) => v !== i)) break;
  }
  return order;
}
