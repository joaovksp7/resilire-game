import { openModal, screenTitle, textEl, uiButton } from './cards';

// Textos da interface: como o jogo funciona e os controles.
// Não é conteúdo educativo (esse fica em content/); os nomes dos eixos vêm de content/missions.json.
const TEXT = {
  title: 'Como jogar',
  goalTitle: 'O objetivo',
  goal: 'Cumpra as missões visitando os lugares da cidade. Em cada visita, você lê uma carta sobre o que aquele lugar faz, conversa com quem trabalha lá, faz uma atividade (ou responde a uma pergunta) e ganha um pin. Junte todos os pins para completar o jogo.',
  diceTitle: 'Ande com o dado',
  dice: [
    'Jogue o dado. Ele mostra até quantas casas você pode andar.',
    'As casas que dá para alcançar ficam destacadas no chão. A porta da missão aparece em amarelo.',
    'Escolha uma casa destacada. Não precisa usar todos os passos.',
    'Pare na porta da instituição da missão para começar a visita.',
  ],
  cityTitle: 'A cidade muda',
  city: (eixos: string) =>
    `O jogo é dividido em eixos: ${eixos}. A cada eixo, o tempo muda: a chuva aumenta e o rio sobe, até a chuva parar e a água baixar. Ruas alagadas não aparecem entre as casas destacadas: o caminho é pela parte alta da cidade.`,
  groupTitle: 'Jogando em grupo',
  group: [
    'De 1 a 4 pessoas jogam no mesmo aparelho, passando a vez. Cada uma tem um peão com uma cor e um número, e o peão da vez tem um anel no chão.',
    'Uma vez é uma jogada do dado. Quando o peão chega, a vez passa para o próximo, na ordem da tela inicial.',
    'Cada jogador cuida de uma missão diferente, ao mesmo tempo. Quem termina a sua recebe a próxima livre. A barra do topo mostra a missão de quem está na vez.',
    'No fim, quando não sobra missão livre, quem fica sem missão ajuda a equipe: pode ir até a missão de um colega. Vale combinar quem vai para onde.',
    'Quem parar na porta de qualquer missão em andamento faz a visita. Todos acompanham na mesma tela e podem conversar antes de responder.',
    'Os pins são da equipe e mostram quem buscou cada um. Não tem vencedor: a equipe completa as missões junta.',
  ],
  activitiesTitle: 'As atividades',
  activities: [
    'Cada lugar tem uma atividade diferente: pôr passos em ordem, separar cartões, montar a mochila, escolher o que fazer numa história, fazer uma ligação, achar áreas de risco num mapa, conferir mensagens, jogo da memória e caça-palavras.',
    'Nada precisa ser arrastado: toque no cartão e depois no lugar onde ele vai.',
    'Com o teclado: Tab para andar entre os botões e Enter para escolher. No caça-palavras, as setas andam pela grade de letras.',
    'Não tem tempo: cada um faz no seu ritmo.',
  ],
  mistakeTitle: 'Errar faz parte',
  mistake: 'Se errar numa pergunta ou atividade, você vê a explicação e tenta de novo. Não tem tempo nem penalidade.',
  computerTitle: 'No computador',
  computer: [
    'Jogar o dado: botão “Jogar dado”, Enter ou Espaço.',
    'Escolher a casa: clique numa casa destacada ou no prédio da missão.',
    'Mover a câmera: W, A, S, D ou as setas.',
    'Zoom: roda do mouse.',
    'Só com o teclado: depois de jogar o dado, aperte Tab até “Ir rumo ao objetivo”.',
    'Pausar: botão de pausa ou Esc.',
    'Ligar ou desligar o som: botão de som (alto-falante) ou tecla M.',
  ],
  phoneTitle: 'No celular',
  phone: [
    'Toque em “Jogar dado” e depois numa casa destacada ou no prédio da missão.',
    'Zoom: pinça com dois dedos.',
    'Pausar: botão de pausa, no alto da tela.',
    'Ligar ou desligar o som: botão de som (alto-falante), no alto da tela.',
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
      section(TEXT.groupTitle, list('ul', TEXT.group)),
      section(TEXT.activitiesTitle, list('ul', TEXT.activities)),
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
