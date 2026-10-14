// Aparência de cada instituição no mapa (cor, ícone e formato do prédio).
// Nomes, personagens e textos NÃO ficam aqui: vão para content/institutions.json (Fase 4),
// usando estes mesmos ids.

import type { IconId } from './icons';

export const INSTITUTION_IDS = [
  'defesa-civil',
  'bombeiros',
  'escola',
  'ubs',
  'abrigo',
  'radio',
  'mercado',
  'cras',
  'casa',
] as const;

export type InstitutionId = (typeof INSTITUTION_IDS)[number];

export type BuildingShape =
  | 'office' // prédio com marquise na porta
  | 'firehouse' // portões de garagem e torre
  | 'school' // prédio comprido com telhado de duas águas
  | 'clinic' // prédio claro com faixa colorida
  | 'gym' // ginásio com telhado curvo
  | 'radio' // prédio pequeno com antena alta
  | 'market' // loja com toldo
  | 'house'; // casa com telhado de duas águas e chaminé

export interface InstitutionStyle {
  /** Cor marcante, usada no prédio e na placa (e nos pins, na Fase 4). */
  color: number;
  icon: IconId;
  shape: BuildingShape;
  /** Número de andares (altura do corpo do prédio). */
  floors: number;
}

export const INSTITUTION_STYLES: Readonly<Record<InstitutionId, InstitutionStyle>> = {
  'defesa-civil': { color: 0xf08a24, icon: 'alerta', shape: 'office', floors: 2 },
  bombeiros: { color: 0xd64541, icon: 'chama', shape: 'firehouse', floors: 2 },
  escola: { color: 0xf2c12e, icon: 'livro', shape: 'school', floors: 2 },
  ubs: { color: 0x1fa39a, icon: 'cruz', shape: 'clinic', floors: 1 },
  abrigo: { color: 0x2f7fe0, icon: 'abrigo', shape: 'gym', floors: 2 },
  radio: { color: 0x8a5cd6, icon: 'radio', shape: 'radio', floors: 1 },
  mercado: { color: 0xe2559a, icon: 'sacola', shape: 'market', floors: 1 },
  cras: { color: 0x4256b8, icon: 'pessoas', shape: 'school', floors: 1 },
  casa: { color: 0xff7a59, icon: 'casa', shape: 'house', floors: 1 },
};
