import type { MensagensActivity } from '../missions/content';
import { textEl } from '../ui/cards';
import type { ActivityResult, ActivityTheme } from './activities';
import { button, el, openActivityPanel, PANEL_TEXT, resultList } from './activityPanel';

// Textos da interface (não são conteúdo educativo: esse fica em content/atividades.json).
const TEXT = {
  phoneLabel: 'Tela do celular',
  title: 'Mensagens',
  count: (n: number, total: number) => `Mensagem ${n} de ${total}`,
  conversation: 'Mensagens recebidas',
  right: 'Resposta certa!',
  wrong: 'Não foi a melhor escolha',
  next: 'Continuar',
  arrived: (de: string, texto: string) => `Mensagem de ${de}: ${texto}`,
  answered: (titulo: string, explicacao: string) => `${titulo}${/[.!?]$/.test(titulo) ? '' : '.'} ${explicacao}`,
  done: 'Você conferiu todas as mensagens.',
  from: (de: string, texto: string) => `${de}: “${texto}”`,
} as const;

/**
 * Atividade `mensagens` (confiável ou boato): as mensagens chegam uma por vez num celular, com quem
 * mandou, e o aluno escolhe um dos dois botões (`respostas`). Errar mostra a explicação e deixa tentar
 * de novo. As já respondidas ficam na conversa, com a resposta certa embaixo. Acerto de primeira =
 * todas certas na primeira tentativa.
 */
export class MessagesMinigame {
  private readonly root: HTMLElement;
  private readonly onRight: () => void;

  constructor(root: HTMLElement, onRight: () => void = () => {}) {
    this.root = root;
    this.onRight = onRight;
  }

  run(activity: MensagensActivity, theme: ActivityTheme): Promise<ActivityResult> {
    return new Promise((resolve) => {
      const { mensagens, respostas } = activity;
      const panel = openActivityPanel(this.root, theme, activity.titulo, activity.instrucao);
      let current = 0;
      let allFirstTry = true;
      const answerText = (confiavel: boolean): string => (confiavel ? respostas.confiar : respostas.conferir);

      // A tela do celular: topo, conversa, os dois botões e a explicação.
      const phone = el('section', 'atividade__celular');
      phone.setAttribute('aria-label', TEXT.phoneLabel);
      const top = el('div', 'atividade__celular-topo');
      const state = textEl('p', 'atividade__celular-estado', '');
      top.append(textEl('p', 'atividade__celular-nome', TEXT.title), state);
      const log = el('ol', 'atividade__conversa');
      log.setAttribute('aria-label', TEXT.conversation);
      const options = el('div', 'dialogo__alternativas');
      const feedback = el('div', 'dialogo__retorno');
      feedback.hidden = true;
      phone.append(top, log, options, feedback);

      // Rodapé fixo: "Continuar" ou "Tentar de novo" (escondido enquanto o aluno escolhe).
      const action = button(TEXT.next, 'botao botao--primario');
      action.hidden = true;
      let onAction: () => void = () => {};
      action.addEventListener('click', () => onAction());
      const footer = panel.footer(action, panel.notice);

      const showMessage = (): void => {
        const msg = mensagens[current];
        let attempts = 0;
        state.textContent = TEXT.count(current + 1, mensagens.length);
        feedback.hidden = true;
        action.hidden = true;
        options.hidden = false;

        const bubble = el('li', 'atividade__balao atividade__balao--atendente');
        bubble.append(textEl('span', 'atividade__balao-quem', msg.de), textEl('span', '', msg.texto));
        log.append(bubble);
        panel.say(TEXT.arrived(msg.de, msg.texto));

        // Os dois botões, sempre na mesma ordem.
        const buttons = [true, false].map((confiavel) => {
          const b = button(answerText(confiavel), 'botao botao--alternativa');
          b.addEventListener('click', () => {
            attempts += 1;
            const right = confiavel === msg.confiavel;
            for (const other of buttons) other.disabled = true;
            b.classList.add(right ? 'botao--certa' : 'botao--errada');
            if (!right) b.dataset.tried = '';
            const title = right ? TEXT.right : TEXT.wrong;
            feedback.className = `dialogo__retorno ${right ? 'dialogo__retorno--certo' : 'dialogo__retorno--errado'}`;
            feedback.replaceChildren(textEl('p', 'dialogo__retorno-titulo', title), textEl('p', 'dialogo__retorno-texto', msg.explicacao));
            feedback.hidden = false;
            panel.say(TEXT.answered(title, msg.explicacao));
            if (right) {
              if (attempts > 1) allFirstTry = false;
              // A resposta certa fica marcada embaixo da mensagem, e os botões saem da tela.
              const mark = el('span', `atividade__balao-marca ${msg.confiavel ? 'atividade__balao-marca--confiar' : 'atividade__balao-marca--conferir'}`);
              mark.textContent = answerText(msg.confiavel);
              bubble.append(mark);
              options.hidden = true;
            }
            action.textContent = right ? TEXT.next : PANEL_TEXT.retry;
            action.hidden = false;
            onAction = right ? nextMessage : retry;
            action.focus();
            // A explicação fica à vista, acima do rodapé fixo (sem rolar a tela à mão).
            feedback.scrollIntoView({ block: 'nearest' });
          });
          return b;
        });
        options.replaceChildren(...buttons);

        // Tenta de novo: o botão errado continua bloqueado.
        const retry = (): void => {
          feedback.hidden = true;
          action.hidden = true;
          panel.say('');
          for (const b of buttons) b.disabled = b.dataset.tried !== undefined;
          buttons.find((b) => !b.disabled)?.focus();
        };

        buttons[0].focus();
      };

      const nextMessage = (): void => {
        current += 1;
        if (current < mensagens.length) {
          showMessage();
          return;
        }
        this.onRight();
        const items = mensagens.map((msg) => ({
          title: TEXT.from(msg.de, msg.texto),
          note: answerText(msg.confiavel),
          explanation: msg.explicacao,
          right: true,
        }));
        panel.showResult(true, TEXT.done, [resultList(items, false)], () => {
          panel.close();
          resolve({ firstTry: allFirstTry });
        });
      };

      panel.show(panel.instruction, phone, footer);
      showMessage();
    });
  }
}
