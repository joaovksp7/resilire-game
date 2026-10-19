import type { KitContent, KitItem } from '../missions/content';
import { badge, openModal, textEl, uid } from '../ui/cards';
import { shuffled } from '../ui/dialogue';
import { cssColor, type IconId } from '../world/icons';
import { kitIconSvg } from './kitIcons';

// Textos da interface do minijogo (não são conteúdo educativo: esse fica em content/kit-items.json).
const TEXT = {
  backpack: 'Sua mochila',
  shelf: 'Prateleira',
  empty: 'A mochila está vazia.',
  space: (used: number, total: number) => `Espaço usado: ${used} de ${total}`,
  takes: (n: number) => (n === 1 ? '1 espaço' : `${n} espaços`),
  inBackpack: 'Na mochila',
  removeLabel: (nome: string) => `Tirar “${nome}” da mochila`,
  added: (nome: string, used: number, total: number) => `“${nome}” foi para a mochila. Espaço usado: ${used} de ${total}.`,
  removed: (nome: string, used: number, total: number) => `“${nome}” saiu da mochila. Espaço usado: ${used} de ${total}.`,
  full: (nome: string) => `Não cabe: a mochila está cheia. Tire alguma coisa para caber “${nome}”.`,
  close: 'Fechar a mochila',
  rightTitle: 'Mochila pronta!',
  rightText: 'Tudo o que ajuda numa emergência está na mochila.',
  wrongTitle: 'Quase lá!',
  wrongText: 'Veja o que mudar e arrume a mochila de novo.',
  missing: 'Faltou',
  extra: 'Não precisava levar',
  good: 'Ficou bom',
  retry: 'Arrumar de novo',
  done: 'Continuar',
} as const;

export interface KitTheme {
  /** Cor e ícone da instituição onde o minijogo acontece. */
  color: number;
  icon: IconId;
}

function el<K extends keyof HTMLElementTagNameMap>(tag: K, className: string): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  node.className = className;
  return node;
}

function button(label: string, className: string): HTMLButtonElement {
  const b = textEl('button', className, label);
  b.type = 'button';
  return b;
}

/** Título de seção com um desenho na frente. */
function sectionTitle(text: string, iconId: string | null): HTMLHeadingElement {
  const h = el('h3', 'kit__secao-titulo');
  if (iconId) h.innerHTML = kitIconSvg(iconId);
  h.append(document.createTextNode(text));
  return h;
}

/**
 * Minijogo da mochila de emergência: o jogador toca nos itens da prateleira para pôr ou tirar da
 * mochila, que tem espaço limitado. Ao fechar, vê o que faltou, o que não precisava e o que ficou bom,
 * com a explicação de cada item. Errar não reprova: dá para arrumar de novo até ficar certo.
 * Tudo funciona por toque, mouse ou só teclado (os itens são botões com aria-pressed).
 */
export class KitMinigame {
  private readonly root: HTMLElement;
  private readonly kit: KitContent;

  constructor(root: HTMLElement, kit: KitContent) {
    this.root = root;
    this.kit = kit;
  }

  /** Abre o minijogo. Resolve com `firstTry` = a primeira mochila fechada já estava certa. */
  run(theme: KitTheme): Promise<{ firstTry: boolean }> {
    return new Promise((resolve) => {
      const { kit } = this;
      const shelfOrder = shuffled(kit.itens);
      const chosen = new Set<string>();
      let attempts = 0;
      const used = (): number => kit.itens.reduce((sum, item) => sum + (chosen.has(item.id) ? item.espaco : 0), 0);

      const box = el('div', 'kit');
      box.style.setProperty('--cor-inst', cssColor(theme.color));
      const titleId = uid('kit-titulo');
      const header = el('div', 'kit__cabecalho');
      const title = textEl('h2', 'kit__titulo', kit.titulo);
      title.id = titleId;
      header.append(badge(theme.icon, theme.color), title);
      const body = el('div', 'kit__corpo');
      box.append(header, body);

      // ---- Montagem da mochila ----
      const instruction = textEl('p', 'kit__instrucao', kit.instrucao);
      const table = el('div', 'kit__mesa');

      const bag = el('section', 'kit__secao kit__mochila');
      const bagTitle = sectionTitle(TEXT.backpack, 'mochila');
      bagTitle.id = uid('kit-mochila');
      bag.setAttribute('aria-labelledby', bagTitle.id);
      const chips = el('ul', 'kit__chips');
      const empty = textEl('p', 'kit__vazia', TEXT.empty);
      bag.append(bagTitle, chips, empty);

      const shelf = el('section', 'kit__secao kit__prateleira');
      const shelfTitle = sectionTitle(TEXT.shelf, null);
      shelfTitle.id = uid('kit-prateleira');
      shelf.setAttribute('aria-labelledby', shelfTitle.id);
      const shelfList = el('ul', 'kit__itens');
      const shelfButtons = new Map<string, HTMLButtonElement>();
      for (const item of shelfOrder) {
        const b = el('button', 'kit__item');
        b.type = 'button';
        b.setAttribute('aria-pressed', 'false');
        b.innerHTML = kitIconSvg(item.id);
        const texts = el('span', 'kit__item-texto');
        texts.append(textEl('span', 'kit__item-nome', item.nome), textEl('span', 'kit__item-espaco', TEXT.takes(item.espaco)));
        const mark = textEl('span', 'kit__item-marca', `✓ ${TEXT.inBackpack}`);
        mark.setAttribute('aria-hidden', 'true');
        b.append(texts, mark);
        b.addEventListener('click', () => toggle(item, false));
        shelfButtons.set(item.id, b);
        const li = document.createElement('li');
        li.append(b);
        shelfList.append(li);
      }
      shelf.append(shelfTitle, shelfList);
      table.append(bag, shelf);

      const footer = el('div', 'kit__rodape');
      const meter = el('div', 'kit__espaco');
      const spaceText = textEl('p', 'kit__espaco-texto', '');
      const bar = el('div', 'kit__barra');
      bar.setAttribute('aria-hidden', 'true');
      const fill = el('div', 'kit__barra-cheio');
      bar.append(fill);
      meter.append(spaceText, bar);
      const notice = el('p', 'kit__aviso');
      notice.setAttribute('role', 'status');
      notice.setAttribute('aria-live', 'polite');
      const closeButton = button(TEXT.close, 'botao botao--primario');
      closeButton.addEventListener('click', () => showResult());
      footer.append(meter, closeButton, notice);

      const say = (text: string, warning: boolean): void => {
        notice.textContent = text;
        notice.classList.toggle('kit__aviso--alerta', warning);
      };

      const render = (): void => {
        const total = used();
        for (const [id, b] of shelfButtons) b.setAttribute('aria-pressed', String(chosen.has(id)));
        const inside = [...chosen].map((id) => kit.itens.find((i) => i.id === id)).filter((i): i is KitItem => !!i);
        chips.replaceChildren(
          ...inside.map((item) => {
            const chip = el('button', 'kit__chip');
            chip.type = 'button';
            chip.setAttribute('aria-label', TEXT.removeLabel(item.nome));
            chip.innerHTML = kitIconSvg(item.id);
            chip.append(textEl('span', 'kit__chip-nome', item.nome));
            chip.addEventListener('click', () => toggle(item, true));
            const li = document.createElement('li');
            li.append(chip);
            return li;
          }),
        );
        empty.hidden = inside.length > 0;
        spaceText.textContent = TEXT.space(total, kit.capacidade);
        fill.style.width = `${Math.min(100, (total / kit.capacidade) * 100)}%`;
      };

      // `fromBag`: tocado na mochila. O botão some, então o foco vai para o item na prateleira.
      const toggle = (item: KitItem, fromBag: boolean): void => {
        if (chosen.has(item.id)) {
          chosen.delete(item.id);
          render();
          say(TEXT.removed(item.nome, used(), kit.capacidade), false);
        } else if (used() + item.espaco > kit.capacidade) {
          say(TEXT.full(item.nome), true);
          // Chacoalha a barra (o CSS desliga com prefers-reduced-motion).
          bar.classList.remove('kit__barra--cheia');
          void bar.offsetWidth;
          bar.classList.add('kit__barra--cheia');
          return;
        } else {
          chosen.add(item.id);
          render();
          say(TEXT.added(item.nome, used(), kit.capacidade), false);
        }
        if (fromBag) shelfButtons.get(item.id)?.focus();
      };

      const showEdit = (): void => {
        say('', false);
        render();
        body.replaceChildren(instruction, table, footer);
        box.scrollTop = 0;
        shelfButtons.get(shelfOrder[0].id)?.focus();
      };

      // ---- Resultado ----
      const resultGroup = (heading: string, items: readonly KitItem[], kind: 'faltou' | 'sobrou' | 'bom'): HTMLElement => {
        const section = el('section', 'kit__grupo');
        const list = el('ul', `kit__lista kit__lista--${kind}`);
        for (const item of items) {
          const li = document.createElement('li');
          li.innerHTML = kitIconSvg(item.id);
          const texts = el('div', 'kit__lista-texto');
          texts.append(textEl('p', 'kit__lista-nome', item.nome), textEl('p', 'kit__lista-explicacao', item.explicacao));
          li.append(texts);
          list.append(li);
        }
        section.append(textEl('h3', 'kit__secao-titulo', heading), list);
        return section;
      };

      const showResult = (): void => {
        attempts += 1;
        const missing = kit.itens.filter((i) => i.levar && !chosen.has(i.id));
        const extra = kit.itens.filter((i) => !i.levar && chosen.has(i.id));
        const good = kit.itens.filter((i) => i.levar && chosen.has(i.id));
        const right = missing.length === 0 && extra.length === 0;

        const summary = el('div', `dialogo__retorno ${right ? 'dialogo__retorno--certo' : 'dialogo__retorno--errado'}`);
        const summaryTitle = textEl('p', 'dialogo__retorno-titulo', right ? TEXT.rightTitle : TEXT.wrongTitle);
        summaryTitle.tabIndex = -1;
        summary.append(summaryTitle, textEl('p', 'dialogo__retorno-texto', right ? TEXT.rightText : TEXT.wrongText));

        const groups: HTMLElement[] = [];
        if (missing.length > 0) groups.push(resultGroup(TEXT.missing, missing, 'faltou'));
        if (extra.length > 0) groups.push(resultGroup(TEXT.extra, extra, 'sobrou'));
        if (good.length > 0) groups.push(resultGroup(TEXT.good, good, 'bom'));

        const after = button(right ? TEXT.done : TEXT.retry, 'botao botao--primario');
        after.addEventListener('click', () => {
          if (!right) {
            showEdit();
            return;
          }
          modal.close();
          resolve({ firstTry: attempts === 1 });
        });
        const resultFooter = el('div', 'kit__rodape');
        resultFooter.append(after);

        body.replaceChildren(summary, ...groups, resultFooter);
        box.scrollTop = 0;
        // Foco no começo do resultado, para ler as explicações antes do botão.
        summaryTitle.focus();
      };

      render();
      body.replaceChildren(instruction, table, footer);
      const modal = openModal(this.root, box, { labelledBy: titleId, variant: 'panel' });
      showEdit();
    });
  }
}
