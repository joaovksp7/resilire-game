import { openModal, screenTitle, textEl, uiButton } from './cards';

// Textos da interface: como o jogo funciona e os controles.
// Não é conteúdo educativo (esse fica em content/); os nomes dos eixos vêm de content/missions.json.
const TEXT = {
  title: 'Como jogar',
  goalTitle: 'O objetivo',
  goal: 'Cumpra as missões visitando as instituições da cidade. Em cada visita, converse com quem trabalha lá, responda a uma pergunta e ganhe um pin. Junte todos os pins para completar o jogo.',
  diceTitle: 'Ande com o dado',
  dice: [
    'Jogue o dado. Ele mostra até quantas casas você pode andar.',
    'As casas que dá para alcançar ficam destacadas no chão. A porta da missão aparece em amarelo.',
    'Escolha uma casa destacada. Não precisa usar todos os passos.',
    'Pare na porta da instituição da missão para começar a visita.',
  ],
  cityTitle: 'A cidade muda',
  city: (eixos: string) =>
    `O jogo é dividido em eixos: ${eixos}. A cada eixo, a chuva aumenta e o rio sobe. Ruas alagadas não aparecem entre as casas destacadas: o caminho é pela parte alta da cidade.`,
  mistakeTitle: 'Errar faz parte',
  mistake: 'Se errar uma pergunta, você vê a explicação e tenta de novo. Não tem tempo nem penalidade.',
  computerTitle: 'No computador',
  computer: [
    'Jogar o dado: botão “Jogar dado”, Enter ou Espaço.',
    'Escolher a casa: clique numa casa destacada ou no prédio da missão.',
    'Mover a câmera: W, A, S, D ou as setas.',
    'Zoom: roda do mouse.',
    'Só com o teclado: depois de jogar o dado, aperte Tab até “Ir rumo ao objetivo”.',
    'Pausar: botão de pausa ou Esc.',
  ],
  phoneTitle: 'No celular',
  phone: [
    'Toque em “Jogar dado” e depois numa casa destacada ou no prédio da missão.',
    'Zoom: pinça com dois dedos.',
    'Pausar: botão de pausa, no alto da tela.',
  ],
  close: 'Fechar',
} as const;

/** "Alerta, Preparação e Durante o evento". */
function joinNames(names: readonly string[]): string {
  if (names.length <= 1) return names.join('');
  return `${names.slice(0, -1).join(', ')} e ${names[names.length - 1]}`;
}

function section(title: string, ...body: HTMLElement[]): HTMLElement {
  const el = document.createElement('section');
  el.className = 'painel__secao';
  el.append(textEl('h3', 'painel__subtitulo', title), ...body);
  return el;
}

function list(tag: 'ol' | 'ul', items: readonly string[]): HTMLElement {
  const el = document.createElement(tag);
  el.className = 'painel__lista';
  for (const item of items) el.append(textEl('li', '', item));
  return el;
}

/** Abre a janela "Como jogar". Resolve quando ela é fechada (botão ou Esc). */
export function showHowToPlay(root: HTMLElement, eixoNames: readonly string[]): Promise<void> {
  return new Promise((resolve) => {
    const panel = document.createElement('div');
    panel.className = 'painel painel--largo';
    const title = screenTitle('h2', 'painel__titulo', TEXT.title);

    const close = uiButton(TEXT.close, 'botao botao--primario');
    const footer = document.createElement('div');
    footer.className = 'painel__rodape';
    footer.append(close);

    panel.append(
      title,
      section(TEXT.goalTitle, textEl('p', '', TEXT.goal)),
      section(TEXT.diceTitle, list('ol', TEXT.dice)),
      section(TEXT.cityTitle, textEl('p', '', TEXT.city(joinNames(eixoNames)))),
      section(TEXT.mistakeTitle, textEl('p', '', TEXT.mistake)),
      section(TEXT.computerTitle, list('ul', TEXT.computer)),
      section(TEXT.phoneTitle, list('ul', TEXT.phone)),
      footer,
    );

    const finish = (): void => {
      modal.close();
      resolve();
    };
    const modal = openModal(root, panel, { labelledBy: title.id, variant: 'panel', onEscape: finish });
    close.addEventListener('click', finish);
  });
}
