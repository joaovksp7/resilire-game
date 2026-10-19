import { ICONS } from '../world/icons';

// Desenhos dos itens do kit, no mesmo formato dos ícones das instituições (src/world/icons.ts):
// caminhos SVG numa área de 24×24, preenchidos com a regra "evenodd" (partes internas viram furos).
// A chave é o `id` do item em content/kit-items.json. Item sem desenho aparece como uma caixa.

/** Círculo como caminho SVG. */
function circle(cx: number, cy: number, r: number): string {
  return `M${cx - r} ${cy}a${r} ${r} 0 1 0 ${2 * r} 0a${r} ${r} 0 1 0 ${-2 * r} 0Z`;
}

const KIT_ICONS: Readonly<Record<string, string>> = {
  // Mochila (título da área da mochila)
  mochila:
    'M9 6V4.5a3 3 0 0 1 6 0V6H13.5V4.5a1.5 1.5 0 0 0-3 0V6Z M5 9a3 3 0 0 1 3-3H16a3 3 0 0 1 3 3V21H5Z M8 13H16V18.5H8Z M11 14.5H13V15.7H11Z',
  // Saco plástico com fecho e um documento dentro
  documentos: 'M3 3H21V21H3Z M5 7H19V19H5Z M8 9H16V17H8Z M9.5 11H14.5V12.2H9.5Z M9.5 13.6H14.5V14.8H9.5Z',
  // Lanterna com facho de luz
  lanterna:
    'M2 10H11V14H2Z M4.5 11.2H6.5V12.8H4.5Z M11 8L16 6V18L11 16Z M18 11H22V13H18Z M17.6 7.4L20.6 5.4L21.7 7L18.7 9Z M17.6 16.6L20.6 18.6L21.7 17L18.7 15Z',
  // Duas pilhas em pé
  pilhas: 'M4 7H10V21H4Z M5.8 4.5H8.2V7H5.8Z M5.5 10H8.5V11.4H5.5Z M14 7H20V21H14Z M15.8 4.5H18.2V7H15.8Z M15.5 10H18.5V11.4H15.5Z',
  // Rádio (o mesmo desenho da rádio comunitária)
  radio: ICONS.radio,
  // Garrafa de água com uma gota no rótulo
  agua: 'M10 2H14V4.5H10Z M9.5 4.5H14.5V7C17 8 17.5 9.5 17.5 11V20.5a1.5 1.5 0 0 1-1.5 1.5H8a1.5 1.5 0 0 1-1.5-1.5V11C6.5 9.5 7 8 9.5 7Z M8.5 12.5H15.5V18H8.5Z M12 13.4C10.9 15 10.6 15.6 10.6 16.2a1.4 1.4 0 0 0 2.8 0C13.4 15.6 13.1 15 12 13.4Z',
  // Lata de comida com rótulo
  comida: 'M5 6C5 4.9 8.1 4 12 4S19 4.9 19 6V19C19 20.1 15.9 21 12 21S5 20.1 5 19Z M6.5 9.5H17.5V15.5H6.5Z',
  // Caixa de remédios com cruz
  remedios: 'M6 3.5H18V7H6Z M3 7H21V20.5H3Z M10.5 9.5H13.5V12.25H16.25V15.25H13.5V18H10.5V15.25H7.75V12.25H10.5Z',
  // Carregador portátil com raio
  carregador: 'M10 1.5H14V3H10Z M6 3H18V22H6Z M13.3 5.5L9 13.5H11.8L10.7 19.5L15 11.5H12.2Z',
  // Apito
  apito: `M9 8H22V12.5H14.8A6 6 0 1 1 9 8Z ${circle(9, 14, 2)}`,
  // Capa de chuva com capuz e zíper
  'capa-de-chuva': 'M9 2H15L17 5L21 8L19.5 12L17 11V22H7V11L4.5 12L3 8L7 5Z M11.4 8H12.6V22H11.4Z',
  // Camiseta
  'roupa-extra': 'M8 3L4 5L2 10L5.5 11.5L6 10V21H18V10L18.5 11.5L22 10L20 5L16 3C15.5 4.5 14 5.5 12 5.5S8.5 4.5 8 3Z',
  // Controle de videogame
  videogame: `M7 7H17C20 7 22 10 22 14S21 19 19 19C17 19 16 16 14 16H10C8 16 7 19 5 19S2 18 2 14S4 7 7 7Z M6 10H8V11.5H9.5V13.5H8V15H6V13.5H4.5V11.5H6Z ${circle(16, 11.5, 1.1)} ${circle(18.5, 13.5, 1.1)}`,
  // Haltere
  haltere: 'M1 10H3V14H1Z M3 7H7V17H3Z M7 11H17V13H7Z M17 7H21V17H17Z M21 10H23V14H21Z',
  // Liquidificador
  liquidificador: `M7 1.5H17V3H7Z M6 3H18L16 13H8Z M8.2 5H15.8L14.4 11H9.6Z M7 14H17L18 21.5H6Z ${circle(12, 17.8, 1.6)}`,
  // Vaso de vidro com brilho
  'vaso-de-vidro':
    'M8 2H16V4C16 5 15 6 15 7C18 9 19 12 19 15C19 19 16 22 12 22S5 19 5 15C5 12 6 9 9 7C9 6 8 5 8 4Z M8.4 14C8.4 12.4 9.1 10.9 10.4 9.8L11.2 10.8C10.2 11.8 9.9 12.8 9.9 14Z',
};

/** Caixa: desenho de quem não tem desenho próprio. */
const GENERIC = 'M3 7L12 3L21 7V17L12 21L3 17Z M4.5 8.6L11.2 11.5V19L4.5 16.1Z';

/** Desenho de um item como <svg> (pinta com a cor do texto, `currentColor`). */
export function kitIconSvg(id: string, className = 'icone'): string {
  const path = Object.hasOwn(KIT_ICONS, id) ? KIT_ICONS[id] : GENERIC;
  return `<svg class="${className}" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path fill="currentColor" fill-rule="evenodd" d="${path}"/></svg>`;
}
