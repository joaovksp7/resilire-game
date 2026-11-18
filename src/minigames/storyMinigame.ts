import type { ChamadaActivity, HistoriaActivity, StoryMoment } from '../missions/content';
import { shuffled } from '../ui/dialogue';
import { textEl } from '../ui/cards';
import type { ActivityResult, ActivityTheme } from './activities';
import { button, el, openActivityPanel, PANEL_TEXT, resultList } from './activityPanel';

// Textos da interface (não são conteúdo educativo: esse fica em content/atividades.json).
const TEXT = {
  moment: (n: number, total: number) => `Momento ${n} de ${total}`,
  right: 'Resposta certa!',
  wrong: 'Não foi a melhor escolha',
  next: 'Continuar',
  phoneLabel: 'Tela do celular',
  calling: 'Ligação',
  dialing: 'Escolha o número',
  inCall: 'Em ligação',
  conversation: 'Conversa',
  you: 'Você',
  said: (who: string, texto: string) => `${who}: ${texto}`,
  answered: (titulo: string, explicacao: string) => `${titulo}${/[.!?]$/.test(titulo) ? '' : '.'} ${explicacao}`,
  storyDone: 'Você passou por todos os momentos da história.',
  callDone: 'Você terminou a ligação.',
} as const;

/** Um passo da atividade: um momento, e se as alternativas aparecem embaralhadas. */
interface Step {
  readonly moment: StoryMoment;
  readonly shuffle: boolean;
  /** `discagem`: a escolha do número da `chamada`. */
  readonly dial: boolean;
}

/**
 * Atividades `historia` e `chamada`: momentos seguidos de "O que você faz?", com a mesma lógica da
 * pergunta (alternativas embaralhadas; errar mostra a explicação e deixa tentar de novo, com a errada
 * bloqueada). A `chamada` tem cara de celular: primeiro a escolha do número (na ordem do arquivo, como
 * num teclado), depois a conversa com o atendente, em balões. Acerto de primeira = todos os momentos
 * certos na primeira tentativa.
 */
export class StoryMinigame {
  private readonly root: HTMLElement;
  private readonly onRight: () => void;

  constructor(root: HTMLElement, onRight: () => void = () => {}) {
    this.root = root;
    this.onRight = onRight;
  }

  run(activity: HistoriaActivity | ChamadaActivity, theme: ActivityTheme): Promise<ActivityResult> {
    return new Promise((resolve) => {
      const call = activity.tipo === 'chamada' ? activity : null;
      const isCall = call !== null;
      const steps: Step[] = [
        ...(call ? [{ moment: call.discagem, shuffle: false, dial: true }] : []),
        ...activity.momentos.map((moment) => ({ moment, shuffle: true, dial: false })),
      ];
      const panel = openActivityPanel(this.root, theme, activity.titulo, activity.instrucao);
      let current = 0;
      let allFirstTry = true;

      // Rodapé fixo: o botão "Continuar" ou "Tentar de novo" (escondido enquanto o aluno escolhe).
      const action = button(TEXT.next, 'botao botao--primario');
      action.hidden = true;
      const footer = panel.footer(action, panel.notice);
      let onAction: () => void = () => {};
      action.addEventListener('click', () => onAction());

      // Onde aparecem as alternativas e a explicação (nas duas caras).
      const options = el('div', 'dialogo__alternativas');
      const feedback = el('div', 'dialogo__retorno');
      feedback.hidden = true;

      // História: um cartão por momento. Ligação: a tela do celular, que fica a mesma do começo ao fim.
      // As alternativas e a explicação entram só na tela que a atividade usa.
      const kicker = textEl('p', 'dialogo__kicker', '');
      const situation = textEl('p', 'atividade__situacao', '');
      const storyStage = el('section', 'atividade__secao');
      if (!isCall) storyStage.append(kicker, situation, options, feedback);

      const phone = el('section', 'atividade__celular');
      phone.setAttribute('aria-label', TEXT.phoneLabel);
      const phoneTop = el('div', 'atividade__celular-topo');
      const phoneName = textEl('p', 'atividade__celular-nome', TEXT.calling);
      const phoneState = textEl('p', 'atividade__celular-estado', TEXT.dialing);
      phoneTop.append(phoneName, phoneState);
      const log = el('ol', 'atividade__conversa');
      log.setAttribute('aria-label', TEXT.conversation);
      log.hidden = true;
      const dialText = textEl('p', 'atividade__situacao atividade__celular-pergunta', '');
      if (isCall) phone.append(phoneTop, log, dialText, options, feedback);

      const bubble = (who: string, texto: string, mine: boolean): void => {
        const li = el('li', `atividade__balao ${mine ? 'atividade__balao--voce' : 'atividade__balao--atendente'}`);
        li.append(textEl('span', 'atividade__balao-quem', who), textEl('span', '', texto));
        log.append(li);
      };

      const showStep = (): void => {
        const { moment, shuffle, dial } = steps[current];
        let attempts = 0;
        feedback.hidden = true;
        action.hidden = true;
        options.hidden = false;
        options.classList.toggle('atividade__teclas', dial);

        if (!call) {
          kicker.textContent = TEXT.moment(current + 1, steps.length);
          situation.textContent = moment.situacao;
          // Cada momento da história começa no alto da janela.
          panel.show(panel.instruction, storyStage, footer);
          panel.say(moment.situacao);
        } else if (dial) {
          dialText.textContent = moment.situacao;
          panel.say(moment.situacao);
        } else {
          dialText.hidden = true;
          log.hidden = false;
          bubble(call.atendente, moment.situacao, false);
          panel.say(TEXT.said(call.atendente, moment.situacao));
        }

        const list = moment.alternativas.map((alt, index) => ({ alt, index }));
        const buttons: HTMLButtonElement[] = [];
        for (const { alt, index } of shuffle ? shuffled(list) : list) {
          const b = button(alt.texto, dial ? 'botao atividade__tecla' : 'botao botao--alternativa');
          buttons.push(b);
          b.addEventListener('click', () => {
            attempts += 1;
            const right = index === moment.correta;
            for (const other of buttons) other.disabled = true;
            b.classList.add(right ? 'botao--certa' : 'botao--errada');
            if (!right) b.dataset.tried = '';
            const title = right ? TEXT.right : TEXT.wrong;
            feedback.className = `dialogo__retorno ${right ? 'dialogo__retorno--certo' : 'dialogo__retorno--errado'}`;
            feedback.replaceChildren(
              textEl('p', 'dialogo__retorno-titulo', title),
              textEl('p', 'dialogo__retorno-texto', alt.explicacao),
            );
            feedback.hidden = false;
            panel.say(TEXT.answered(title, alt.explicacao));

            if (right) {
              if (attempts > 1) allFirstTry = false;
              // Na ligação, a resposta certa vira o balão do aluno, e as alternativas saem da tela.
              if (call && !dial) {
                bubble(TEXT.you, alt.texto, true);
                options.hidden = true;
              }
              if (call && dial) {
                phoneName.textContent = call.atendente;
                phoneState.textContent = TEXT.inCall;
              }
            }
            action.textContent = right ? TEXT.next : PANEL_TEXT.retry;
            action.hidden = false;
            onAction = right ? nextStep : retry;
            action.focus();
            // A explicação fica à vista, acima do rodapé fixo (sem rolar a tela à mão).
            feedback.scrollIntoView({ block: 'nearest' });
          });
        }
        options.replaceChildren(...buttons);

        // Tenta de novo: a alternativa errada continua bloqueada.
        const retry = (): void => {
          feedback.hidden = true;
          action.hidden = true;
          panel.say('');
          for (const b of buttons) b.disabled = b.dataset.tried !== undefined;
          buttons.find((b) => !b.disabled)?.focus();
        };

        buttons[0]?.focus();
      };

      const nextStep = (): void => {
        current += 1;
        if (current < steps.length) {
          showStep();
          return;
        }
        this.onRight();
        const items = steps.map(({ moment }) => {
          const alt = moment.alternativas[moment.correta];
          return { title: moment.situacao, note: alt.texto, explanation: alt.explicacao, right: true };
        });
        panel.showResult(true, isCall ? TEXT.callDone : TEXT.storyDone, [resultList(items, true)], () => {
          panel.close();
          resolve({ firstTry: allFirstTry });
        });
      };

      if (isCall) panel.show(panel.instruction, phone, footer);
      showStep();
    });
  }
}
