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
//   M  Mercado          H  Hospital          N  Abrigo de animais
//   J  casa do jogador
//   X  lugar do acidente (parada de missão fora de instituição: poste caído em cima de um carro)
//
//   Cada bloco de instituição (e cada lugar, como o X) precisa ser um retângulo e ter exatamente
//   um "*" encostado (a porta). Só rua (#, *), praça (+) e ponte (=) são caminháveis.
//   Toda rua (#, *, =) precisa estar num trecho de STREETS, lá embaixo, que dá o nome dela.
//
// NÍVEIS — altura do terreno em cada tile (0 = fundo do rio):
//   0 rio   1 parte baixa (beira-rio, baixada, outro lado)   2 centro   3 parte alta   4–9 morro
//   Na fase "Durante o evento", a água vai cobrir o nível 1.

import type { InstitutionId } from './institutions';

/**
 * Lugares do mapa que não são instituição, mas podem ser a parada de uma missão
 * (campo "local" em content/missions.json). Cada um tem o seu desenho (src/world/decor.ts).
 */
export const PLACE_IDS = ['acidente'] as const;
export type PlaceId = (typeof PLACE_IDS)[number];

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
  | 'institution'
  | 'place';

export interface LegendEntry {
  kind: TileKind;
  /** Rua em frente à porta de uma instituição. */
  door?: boolean;
  institution?: InstitutionId;
  place?: PlaceId;
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
  H: { kind: 'institution', institution: 'hospital' },
  N: { kind: 'institution', institution: 'abrigo-animais' },
  J: { kind: 'institution', institution: 'casa' },
  X: { kind: 'place', place: 'acidente' },
};

// prettier-ignore
export const LAYOUT_TYPES: readonly string[] = [
// 0         1         2
// 012345678901234567890123456789
  't.t.tt.t..tt.t.t.tttttt.t.tt.t', //  0  parte alta | mata | morro
  'th.hh.hhXth.hh.hhtttt.h.t.h.tt', //  1  X = acidente da missão dos Bombeiros
  '.#######*#########tttt.h.t.h.t', //  2
  '.#hAAAA.h#t.h.t.h#ttth.t.h.th.', //  3
  '.#tAAAA.t#DD.tNN.#ttt.h.th.t.h', //  4
  '.#hAAAAhh#DD.tNN.#tttt.h.t.h.t', //  5
  '.###*#####*###*###ttth.t.h.t.h', //  6
  '.#hh.hh.t.hh.h.hh#tttt.h.tt.h.', //  7
  '.#t.t.tttt.ttttt.#ttt.tt.t.tt.', //  8
  '.#.HHHHth.t.ht.t.############.', //  9  parte alta (oeste) | centro | baixada | centro
  '.#.HHHHt.EEE.h.hh#.BBh.hhRR.h.', // 10
  '.#.HHHHt.EEE..t.h#.BBhh.hRRth.', // 11
  '.###*#####*########*#####*###.', // 12  rua principal (corta a baixada)
  '.#h.tt.hhp.phh#hh#+++++#hh.hh.', // 13
  '.#t.h.tth.t.ht#th#+++++#UU.th.', // 14
  '.#tt.h.th.h.th#hh#+++++#UU.hh.', // 15
  '.#t.hh.th.t.ht#t.#######*####.', // 16
  '.#hph.hhp.hph.#h.#hp.hhp.hph..', // 17  beira-rio (parte baixa)
  '.####*###################*###.', // 18
  '.h.hMMM.hph.hp.h.#hph.h.hJJh..', // 19
  '.t.tMMM.t.h.t.h.t#t.h.t.tJJt.t', // 20
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

// RUAS — cada trecho reto de rua, com o id do nome dela (content/ruas.json).
// `row` = rua leste–oeste naquela linha; `col` = rua norte–sul naquela coluna; de `from` até `to`.
// Os números dos lugares saem da posição na rua: começam em 101/102 na ponta `from` e sobem de 20
// em 20 a cada casa. Andando de `from` para `to`, o lado esquerdo é ímpar e o direito, par
// (assim nenhum número dá 190, 192 ou 193, os telefones de emergência).
// `signs`: onde o nome aparece escrito no chão (colunas, numa rua de linha; linhas, numa rua de coluna).
// É o ponto preferido: o texto anda até 4 tiles para cada lado, para onde prédios e casas menos o tapam
// na tela (src/world/streetSigns.ts), e é empurrado para dentro do trecho se passar da ponta.

export interface StreetSegment {
  /** Id do nome em content/ruas.json. */
  readonly street: string;
  readonly row?: number;
  readonly col?: number;
  readonly from: number;
  readonly to: number;
  readonly signs: readonly number[];
}

export const STREETS: readonly StreetSegment[] = [
  { street: 'araucarias', row: 2, from: 1, to: 17, signs: [12] },
  { street: 'quero-queros', row: 6, from: 1, to: 17, signs: [7, 12] },
  { street: 'graxains', col: 1, from: 2, to: 18, signs: [5, 14] },
  { street: 'bugios', col: 9, from: 2, to: 6, signs: [4] },
  { street: 'figueiras', col: 17, from: 2, to: 27, signs: [5, 15, 24] },
  { street: 'bem-te-vis', row: 9, from: 17, to: 28, signs: [24] },
  { street: 'ipes', row: 12, from: 1, to: 28, signs: [7, 16, 22] },
  { street: 'sabias', col: 14, from: 12, to: 18, signs: [15] },
  { street: 'corticeiras', col: 23, from: 12, to: 16, signs: [14] },
  { street: 'joao-de-barro', row: 16, from: 17, to: 28, signs: [26] },
  { street: 'jerivas', row: 18, from: 1, to: 28, signs: [3, 11, 21] },
  { street: 'capivaras', row: 27, from: 1, to: 28, signs: [6, 20] },
];
