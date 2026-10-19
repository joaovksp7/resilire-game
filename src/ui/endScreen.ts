import type { GameContent } from '../missions/content';
import type { MissionManager } from '../missions/missionManager';
import { INSTITUTION_STYLES } from '../world/institutions';
import { badge, confirmRestart, openModal, screenTitle, textEl, uiButton } from './cards';

// Textos da interface (não são conteúdo educativo: o resumo vem do "aprendizado" de cada missão).
const TEXT = {
  title: 'Você completou todas as missões!',
  pins: (n: number, total: number) => `Pins: ${n} de ${total}`,
  firstTry: (n: number, total: number) => `Acertos de primeira: ${n} de ${total}`,
  pinsTitle: 'Seus pins',
  learnedTitle: 'O que você aprendeu',
  playAgain: 'Jogar de novo',
  close: 'Fechar',
} as const;

/** O que o jogador escolheu na tela final. */
export type EndChoice = 'fechar' | 'jogar-de-novo';

/**
 * Tela final: os pins, os acertos de primeira e um resumo em tópicos do que foi aprendido
 * em cada eixo. "Jogar de novo" pede confirmação antes de apagar o progresso.
 */
export class EndScreen {
  private readonly root: HTMLElement;
  private readonly content: GameContent;
  private readonly manager: MissionManager;

  constructor(root: HTMLElement, content: GameContent, manager: MissionManager) {
    this.root = root;
    this.content = content;
    this.manager = manager;
  }

  /** Abre a tela. Resolve com a escolha: fechar (voltar à cidade) ou jogar de novo (já confirmado). */
  open(): Promise<EndChoice> {
    return new Promise((resolve) => {
      const { manager, content } = this;
      const panel = document.createElement('div');
      panel.className = 'painel painel--largo fim';
      const title = screenTitle('h2', 'painel__titulo', TEXT.title);

      const stats = document.createElement('p');
      stats.className = 'fim__numeros';
      stats.append(
        textEl('span', '', TEXT.pins(manager.completedCount, manager.total)),
        textEl('span', '', TEXT.firstTry(manager.firstTryCount, manager.total)),
      );

      // Pins conquistados (a tela só abre com todas as missões concluídas).
      const pins = document.createElement('ul');
      pins.className = 'painel__pins';
      for (const mission of manager.missions) {
        if (!manager.isCompleted(mission.id)) continue;
        const style = INSTITUTION_STYLES[mission.instituicao];
        const item = document.createElement('li');
        item.className = 'pin pin--ganho';
        item.append(badge(style.icon, style.color), textEl('span', 'pin__nome', mission.titulo));
        pins.append(item);
      }

      // Resumo por eixo, na ordem fixa dos eixos.
      const learned = document.createElement('div');
      learned.className = 'fim__resumo';
      for (const eixo of content.eixos) {
        const topics = manager.missions.filter((m) => m.eixo === eixo.id && manager.isCompleted(m.id));
        if (topics.length === 0) continue;
        const block = document.createElement('section');
        block.className = 'fim__eixo';
        const items = document.createElement('ul');
        items.className = 'painel__lista';
        for (const mission of topics) items.append(textEl('li', '', mission.aprendizado));
        block.append(textEl('h4', 'fim__eixo-nome', eixo.nome), items);
        learned.append(block);
      }

      const again = uiButton(TEXT.playAgain, 'botao botao--secundario');
      const close = uiButton(TEXT.close, 'botao botao--primario');
      const footer = document.createElement('div');
      footer.className = 'painel__rodape';
      footer.append(again, close);

      panel.append(
        title,
        stats,
        textEl('h3', 'painel__subtitulo', TEXT.pinsTitle),
        pins,
        textEl('h3', 'painel__subtitulo', TEXT.learnedTitle),
        learned,
        footer,
      );

      const finish = (choice: EndChoice): void => {
        modal.close();
        resolve(choice);
      };
      const modal = openModal(this.root, panel, { labelledBy: title.id, variant: 'tela', onEscape: () => finish('fechar') });
      close.addEventListener('click', () => finish('fechar'));
      again.addEventListener('click', () => {
        void confirmRestart(this.root).then((yes) => {
          if (yes) finish('jogar-de-novo');
        });
      });
    });
  }
}
