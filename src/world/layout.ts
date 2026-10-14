// Mapa fixo da cidade. Editar aqui muda onde fica cada coisa.
//
// Cada mapa é uma lista de linhas com o MESMO número de caracteres.
// Linha 0 = norte (fundo da tela), coluna 0 = oeste. A câmera vê a cidade girada 45°.
//
// TIPOS — o que tem em cada quadradinho (tile):
//   .  grama            #  rua               *  rua na porta de uma instituição
//   +  praça            ~  rio               =  ponte
//   :  margem do rio    h  casa              p  prédio
//   t  árvore
//   Letras maiúsculas = prédio de instituição (o bloco de letras iguais vira um prédio só):
//   D  Defesa Civil     B  Bombeiros         E  Escola
//   U  UBS              A  Abrigo            R  Rádio comunitária
//   M  Mercado          C  CRAS              J  casa do jogador
//
//   Cada bloco de instituição precisa ser um retângulo e ter exatamente um "*" encostado (a porta).
//   Só rua (#, *), praça (+) e ponte (=) são caminháveis.
//
// NÍVEIS — altura do terreno em cada tile (0 = fundo do rio):
//   0 rio   1 parte baixa (beira-rio, baixada, outro lado)   2 centro   3 parte alta   4–9 morro
//   Na fase "Durante o evento", a água vai cobrir o nível 1.

import type { InstitutionId } from './institutions';

export type TileKind =
  | 'grass'
  | 'street'
  | 'plaza'
  | 'river'
  | 'bridge'
  | 'bank'
  | 'house'
  | 'building'
  | 'tree'
  | 'institution';

export interface LegendEntry {
  kind: TileKind;
  /** Rua em frente à porta de uma instituição. */
  door?: boolean;
  institution?: InstitutionId;
}

export const LEGEND: Readonly<Record<string, LegendEntry>> = {
  '.': { kind: 'grass' },
  '#': { kind: 'street' },
  '*': { kind: 'street', door: true },
  '+': { kind: 'plaza' },
  '~': { kind: 'river' },
  '=': { kind: 'bridge' },
  ':': { kind: 'bank' },
  h: { kind: 'house' },
  p: { kind: 'building' },
  t: { kind: 'tree' },
  D: { kind: 'institution', institution: 'defesa-civil' },
  B: { kind: 'institution', institution: 'bombeiros' },
  E: { kind: 'institution', institution: 'escola' },
  U: { kind: 'institution', institution: 'ubs' },
  A: { kind: 'institution', institution: 'abrigo' },
  R: { kind: 'institution', institution: 'radio' },
  M: { kind: 'institution', institution: 'mercado' },
  C: { kind: 'institution', institution: 'cras' },
  J: { kind: 'institution', institution: 'casa' },
};

// prettier-ignore
export const LAYOUT_TYPES: readonly string[] = [
// 0         1         2
// 012345678901234567890123456789
  't.t.tt.t..tt.t.t.tttttt.t.tt.t', //  0  parte alta | mata | morro
  'th.hh.hh.th.hh.hhtttt.h.t.h.tt', //  1
  '.#################tttt.h.t.h.t', //  2
  '.#hh.th.h#t.h.t.h#ttth.t.h.th.', //  3
  '.#t.h.h.t#DD.tCC.#ttt.h.th.t.h', //  4
  '.#h.tt.hh#DD.tCC.#tttt.h.t.h.t', //  5
  '.#########*###*###ttth.t.h.t.h', //  6
  '.#hh.hh.t.hh.h.hh#tttt.h.tt.h.', //  7
  '.#t.t.tttt.ttttt.#ttt.tt.t.tt.', //  8
  '.#.AAAAth.t.ht.t.############.', //  9  parte alta (oeste) | centro | baixada | centro
  '.#.AAAAt.EEE.h.hh#.BBh.hh.h.h.', // 10
  '.#.AAAAt.EEE..t.h#.BBhh.hJ.th.', // 11
  '.###*#####*########*#####*###.', // 12  rua principal (corta a baixada)
  '.#h.tt.hhp.phh#hh#+++++#hh.hh.', // 13
  '.#t.h.tth.t.ht#th#+++++#UU.th.', // 14
  '.#tt.h.th.h.th#hh#+++++#UU.hh.', // 15
  '.#t.hh.th.t.ht#t.#######*####.', // 16
  '.#hph.hhp.hph.#h.#hp.hhp.hph..', // 17  beira-rio (parte baixa)
  '.####*###################*###.', // 18
  '.h.hMMM.hph.hp.h.#hph.h.hRRh..', // 19
  '.t.tMMM.t.h.t.h.t#t.h.t.tRRt.t', // 20
  ':::::::::::::::::=::::::::::::', // 21
  '~~~~~~~~~~~~~~~~~=~~~~~~~~~~~~', // 22  rio
  '~~~~~~~~~~~~~~~~~=~~~~~~~~~~~~', // 23
  '~~~~~~~~~~~~~~~~~=~~~~~~~~~~~~', // 24
  '~~~~~~~~~~~~~~~~~=~~~~~~~~~~~~', // 25
  ':::::::::::::::::=::::::::::::', // 26
  '.############################.', // 27  outro lado do rio (parte baixa)
  '.hh.hph.hh.h.hph.h.hh.hph.hh.t', // 28
  't.tt.t.tt.t.tt.tt.t.tt.t.tt.t.', // 29
];

// prettier-ignore
export const LAYOUT_LEVELS: readonly string[] = [
// 0         1         2
// 012345678901234567890123456789
  '333333333333333333455678999987', //  0
  '333333333333333333445567899887', //  1
  '333333333333333333344556788876', //  2
  '333333333333333333334455677766', //  3
  '333333333333333333333445566655', //  4
  '333333333333333333333344555554', //  5
  '333333333333333333333334444444', //  6
  '333333333333333333333333333333', //  7
  '333333333333322233333333333333', //  8
  '333333332222211122222222222222', //  9
  '333333332222211122222222222222', // 10
  '333333332222211122222222222222', // 11
  '333333332222211122222222222222', // 12
  '333333332222211122222222222222', // 13
  '333333332222211122222222222222', // 14
  '333333332222211122222222222222', // 15
  '222222222222211122222222222222', // 16
  '111111111111111111111111111111', // 17
  '111111111111111111111111111111', // 18
  '111111111111111111111111111111', // 19
  '111111111111111111111111111111', // 20
  '111111111111111111111111111111', // 21
  '000000000000000000000000000000', // 22
  '000000000000000000000000000000', // 23
  '000000000000000000000000000000', // 24
  '000000000000000000000000000000', // 25
  '111111111111111111111111111111', // 26
  '111111111111111111111111111111', // 27
  '111111111111111111111111111111', // 28
  '111111111111111111111111111111', // 29
];
