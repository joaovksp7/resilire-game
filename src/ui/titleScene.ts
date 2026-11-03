import { TEAM } from '../config';
import { cssColor } from '../world/icons';

// Cena da tela inicial: uma cidadezinha desenhada com SVG e animada com CSS (ver style.css).
// É só enfeite: não tem texto, não recebe foco e fica escondida do leitor de tela.

const SUN = `<svg class="cena__sol" viewBox="0 0 120 120" focusable="false">
  <g class="cena__raios" fill="#ffc23d">
    ${Array.from({ length: 8 }, (_, i) => `<rect x="55" y="2" width="10" height="22" rx="5" transform="rotate(${i * 45} 60 60)"/>`).join('')}
  </g>
  <circle cx="60" cy="60" r="30" fill="#ffd766"/>
</svg>`;

const CLOUD = `<svg viewBox="0 0 160 70" focusable="false">
  <polygon fill="#ffffff" points="10,62 24,36 52,30 70,10 104,14 120,34 146,40 154,62"/>
  <polygon fill="#dfeaf1" points="10,62 154,62 146,50 96,54 40,50"/>
</svg>`;

/** Uma casinha na cena dos morros. */
function house(x: number, y: number, wall: string, roof: string): string {
  return `<g transform="translate(${x} ${y})">
    <rect x="-24" y="-34" width="48" height="34" fill="${wall}"/>
    <polygon points="-30,-34 0,-58 30,-34" fill="${roof}"/>
    <rect x="-7" y="-20" width="14" height="20" fill="#5a4636"/>
    <rect x="-19" y="-27" width="9" height="9" fill="#bfe3f5"/>
    <rect x="10" y="-27" width="9" height="9" fill="#bfe3f5"/>
  </g>`;
}

/** Uma árvore low-poly na cena dos morros. */
function tree(x: number, y: number): string {
  return `<g transform="translate(${x} ${y})">
    <rect x="-4" y="-16" width="8" height="16" fill="#7a5a3c"/>
    <polygon points="-20,-14 0,-52 20,-14" fill="#4f8f4a"/>
    <polygon points="0,-52 20,-14 4,-14" fill="#3f7a3f"/>
  </g>`;
}

const HILLS = `<svg class="cena__morros" viewBox="0 0 1200 320" preserveAspectRatio="xMidYMax slice" focusable="false">
  <polygon fill="#86b873" points="0,320 0,190 150,120 300,175 460,90 640,165 800,105 980,170 1200,110 1200,320"/>
  <polygon fill="#78a968" points="150,120 300,175 210,320 90,320"/>
  <polygon fill="#78a968" points="460,90 640,165 560,320 400,320"/>
  <polygon fill="#78a968" points="800,105 980,170 900,320 740,320"/>
  ${tree(120, 214)}${tree(520, 196)}${tree(1010, 206)}
  <polygon fill="#9ccc65" points="0,320 0,240 220,205 430,235 640,200 860,240 1040,210 1200,235 1200,320"/>
  ${house(90, 246, '#f4e3c1', '#c8553d')}
  ${house(250, 226, '#dfe9ef', '#34508a')}
  ${tree(345, 236)}
  ${house(440, 252, '#f7d9a8', '#7a4f9a')}
  ${house(760, 244, '#dfe9ef', '#c8553d')}
  ${tree(860, 256)}
  ${house(960, 246, '#f4e3c1', '#2e8b7a')}
  ${house(1120, 244, '#f7d9a8', '#34508a')}
</svg>`;

/** Onda que se repete: a animação anda exatamente metade da largura, então não dá emenda. */
const WAVE = `<svg class="cena__onda" viewBox="0 0 2400 40" preserveAspectRatio="none" focusable="false">
  <path fill="#7cc4ee" d="M0 16 ${'q 50 -16 100 0 t 100 0 '.repeat(12)} V40 H0 Z"/>
</svg>`;

/** O mesmo personagem do jogo, em caixinhas. A jaqueta vem de --cor-peao. */
const PAWN = `<svg viewBox="0 0 44 64" focusable="false">
  <rect x="11" y="56" width="9" height="6" fill="#3a3a3a"/>
  <rect x="24" y="56" width="9" height="6" fill="#3a3a3a"/>
  <rect x="12" y="40" width="8" height="17" fill="#34508a"/>
  <rect x="24" y="40" width="8" height="17" fill="#34508a"/>
  <rect x="3" y="23" width="6" height="16" fill="var(--cor-peao)"/>
  <rect x="35" y="23" width="6" height="16" fill="var(--cor-peao)"/>
  <rect x="9" y="22" width="26" height="20" fill="var(--cor-peao)"/>
  <rect x="11" y="4" width="22" height="18" fill="#b07a4f"/>
  <rect x="10" y="1" width="24" height="8" fill="#2e2019"/>
  <rect x="16" y="12" width="3" height="4" fill="#2e2019"/>
  <rect x="25" y="12" width="3" height="4" fill="#2e2019"/>
</svg>`;

const DIE = `<svg class="cena__dado" viewBox="0 0 40 40" focusable="false">
  <rect x="3" y="3" width="34" height="34" rx="7" fill="#ffffff" stroke="#1b2a35" stroke-width="3"/>
  <circle cx="13" cy="13" r="3.2" fill="#1b2a35"/><circle cx="27" cy="13" r="3.2" fill="#1b2a35"/>
  <circle cx="20" cy="20" r="3.2" fill="#1b2a35"/>
  <circle cx="13" cy="27" r="3.2" fill="#1b2a35"/><circle cx="27" cy="27" r="3.2" fill="#1b2a35"/>
</svg>`;

export interface TitleScene {
  readonly element: HTMLElement;
  /** Quantos peões aparecem na cena (acompanha o seletor de jogadores). */
  setPlayers(count: number): void;
}

export function createTitleScene(players: number): TitleScene {
  const scene = document.createElement('div');
  scene.className = 'cena';
  scene.setAttribute('aria-hidden', 'true');
  scene.innerHTML = `${SUN}
    <div class="cena__nuvem cena__nuvem--1">${CLOUD}</div>
    <div class="cena__nuvem cena__nuvem--2">${CLOUD}</div>
    <div class="cena__nuvem cena__nuvem--3">${CLOUD}</div>
    <div class="cena__garoa"></div>
    ${HILLS}
    <div class="cena__rio">${WAVE}</div>`;

  const row = document.createElement('div');
  row.className = 'cena__peoes';
  const pawns = TEAM.colors.map((color, index) => {
    const pawn = document.createElement('div');
    pawn.className = 'cena__peao';
    pawn.style.setProperty('--cor-peao', cssColor(color));
    pawn.style.setProperty('--ordem', String(index));
    pawn.innerHTML = PAWN;
    row.append(pawn);
    return pawn;
  });
  row.insertAdjacentHTML('beforeend', DIE);
  scene.append(row);

  const setPlayers = (count: number): void => {
    pawns.forEach((pawn, index) => {
      pawn.hidden = index >= count;
    });
  };
  setPlayers(players);
  return { element: scene, setPlayers };
}
