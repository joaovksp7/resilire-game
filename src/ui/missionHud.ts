import type { GameContent } from '../missions/content';
import type { MissionManager } from '../missions/missionManager';
import { INSTITUTION_STYLES } from '../world/institutions';
import { badge, modals, openModal, type SoundSwitch, soundButton, textEl, uid } from './cards';

// Textos da interface (não são conteúdo educativo).
const TEXT = {
  missionOf: (n: number, total: number, eixo: string) => `Missão ${n} de ${total} · ${eixo}`,
  destination: (name: string) => `Destino: ${name}`,
  allDone: 'Todas as missões concluídas!',
  pinsButton: (n: number, total: number) => `Pins: ${n} de ${total}. Abrir painel de pins`,
  panelTitle: 'Seus pins',
  firstTry: (n: number, done: number) => `Acertos de primeira: ${n} de ${done}`,
  locked: (n: number) => `Missão ${n}`,
  lockedLabel: (n: number) => `Missão ${n}: ainda não conquistado`,
  close: 'Fechar',
} as const;

/** Desenho de pin (alfinete) para o botão do painel. */
const PIN_ICON =
  '<svg class="icone" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path fill="currentColor" fill-rule="evenodd" d="M12 2a7 7 0 0 1 7 7c0 5-7 13-7 13S5 14 5 9a7 7 0 0 1 7-7Z M12 6a3 3 0 1 0 0 6a3 3 0 1 0 0-6Z"/></svg>';

/**
 * Barra da missão no topo (missão, eixo, destino), o botão/painel de pins e o botão de som.
 * O "Começar de novo" fica no menu de pausa e na tela inicial.
 */
export class MissionHud {
  private readonly root: HTMLElement;
  private readonly content: GameContent;
  private readonly manager: MissionManager;
  private readonly top: HTMLElement;
  private readonly bar: HTMLElement;
  private readonly pinsButton: HTMLButtonElement;
  private readonly pinsCount: HTMLSpanElement;
  /** Pins já mostrados no botão (para saber quando chegou um novo). */
  private shownCount = 0;
  private pulsePending = false;

  constructor(root: HTMLElement, content: GameContent, manager: MissionManager, sound: SoundSwitch) {
    this.root = root;
    this.content = content;
    this.manager = manager;

    this.bar = document.createElement('section');
    this.bar.className = 'hud-missao';

    this.pinsButton = document.createElement('button');
    this.pinsButton.type = 'button';
    this.pinsButton.className = 'botao-pins';
    this.pinsButton.setAttribute('aria-haspopup', 'dialog');
    this.pinsButton.innerHTML = PIN_ICON;
    this.pinsCount = document.createElement('span');
    this.pinsButton.append(this.pinsCount);
    this.pinsButton.addEventListener('click', () => this.openPanel());
    this.pinsButton.addEventListener('animationend', () => this.pinsButton.classList.remove('botao-pins--novo'));

    this.top = document.createElement('div');
    this.top.className = 'hud-topo';
    this.top.append(this.bar, this.pinsButton, soundButton(sound, 'botao-som', true).button);
    root.append(this.top);

    this.shownCount = manager.completedCount;
    manager.onChange(() => this.render());
    modals.onChange((open) => {
      if (!open) this.schedulePulse();
    });
    this.render();
  }

  /** A barra do topo inteira (usada para a seta da borda não ficar por baixo e para o botão de pausa). */
  get element(): HTMLElement {
    return this.top;
  }

  /** Esconde a barra do topo (ex.: na tela inicial). */
  setVisible(visible: boolean): void {
    this.top.hidden = !visible;
  }

  render(): void {
    const { manager, content } = this;
    const mission = manager.current;
    const eixo = manager.currentEixo;
    if (!mission || !eixo) {
      this.bar.replaceChildren(textEl('p', 'hud-missao__titulo', TEXT.allDone));
    } else {
      const inst = content.institutions.get(mission.instituicao);
      const style = INSTITUTION_STYLES[mission.instituicao];
      const dest = document.createElement('p');
      dest.className = 'hud-missao__destino';
      dest.append(badge(style.icon, style.color, 'selo selo--pequeno'), document.createTextNode(TEXT.destination(inst?.nome ?? '')));
      this.bar.replaceChildren(
        textEl('p', 'hud-missao__kicker', TEXT.missionOf(manager.index + 1, manager.total, eixo.nome)),
        textEl('p', 'hud-missao__titulo', mission.titulo),
        dest,
      );
    }
    const count = manager.completedCount;
    if (count > this.shownCount) {
      this.pulsePending = true;
      this.schedulePulse();
    } else if (count < this.shownCount) {
      this.pulsePending = false;
    }
    this.shownCount = count;
    this.pinsCount.textContent = `${manager.completedCount}/${manager.total}`;
    this.pinsButton.setAttribute('aria-label', TEXT.pinsButton(manager.completedCount, manager.total));
  }

  /**
   * Pin novo: o botão de pins dá um pulinho, mas só com todas as janelas fechadas. Depois do cartão
   * do pin vêm outros cartões (eixo, missão), então o pulo fica para a volta à cidade.
   */
  private schedulePulse(): void {
    if (!this.pulsePending) return;
    // Espera a próxima janela abrir, se for abrir logo em seguida.
    window.setTimeout(() => {
      if (!this.pulsePending || modals.isOpen) return;
      this.pulsePending = false;
      this.pinsButton.classList.remove('botao-pins--novo');
      void this.pinsButton.offsetWidth; // reinicia a animação
      this.pinsButton.classList.add('botao-pins--novo');
    }, 0);
  }

  private openPanel(): void {
    const { manager } = this;
    const panel = document.createElement('div');
    panel.className = 'painel';
    const titleId = uid('painel-titulo');
    const title = textEl('h2', 'painel__titulo', TEXT.panelTitle);
    title.id = titleId;

    const list = document.createElement('ul');
    list.className = 'painel__pins';
    for (const [i, mission] of manager.missions.entries()) {
      const item = document.createElement('li');
      const done = manager.isCompleted(mission.id);
      item.className = `pin ${done ? 'pin--ganho' : 'pin--falta'}`;
      if (done) {
        const style = INSTITUTION_STYLES[mission.instituicao];
        item.append(
          badge(style.icon, style.color),
          textEl('span', 'pin__nome', mission.titulo),
        );
      } else {
        const empty = document.createElement('span');
        empty.className = 'selo selo--vazio';
        empty.textContent = '?';
        empty.setAttribute('aria-hidden', 'true');
        const label = textEl('span', 'pin__nome', TEXT.locked(i + 1));
        label.setAttribute('aria-label', TEXT.lockedLabel(i + 1));
        item.append(empty, label);
      }
      list.append(item);
    }

    const stats = textEl('p', 'painel__resumo', TEXT.firstTry(manager.firstTryCount, manager.completedCount));
    const actions = document.createElement('div');
    actions.className = 'painel__acoes';
    const close = textEl('button', 'botao botao--primario', TEXT.close);
    close.type = 'button';
    close.dataset.autofocus = '';
    actions.append(close);
    panel.append(title, list, stats, actions);

    const modal = openModal(this.root, panel, { labelledBy: titleId, variant: 'panel', onEscape: () => modal.close() });
    close.addEventListener('click', () => modal.close());
  }
}
