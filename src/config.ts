// Configurações gerais do jogo. Texto educativo NÃO entra aqui: ele mora em content/.

/** Nome exibido no título da aba e nas telas do jogo. */
export const GAME_NAME = 'Missão Clima — Caminhos da Prevenção';

export const RENDER = {
  /** Limite do devicePixelRatio, para não pesar em telas de alta densidade. */
  maxPixelRatio: 2,
  /** Cor de fundo da cena (céu). */
  skyColor: 0xbfe3f5,
} as const;

export const CAMERA = {
  /**
   * Quantas unidades do mundo cabem no menor lado da tela com zoom 1.
   * Usar o menor lado deixa a escala parecida em celular de pé e deitado.
   */
  viewSize: 22,
  /** Rotação em torno do eixo vertical (graus). 45° = vista isométrica clássica. */
  yawDeg: 45,
  /** Inclinação para baixo (graus). ~35,26° = isométrica verdadeira. */
  pitchDeg: 35.264,
  /** Distância da câmera até o ponto que ela olha. Não muda o tamanho na tela. */
  distance: 60,
  minZoom: 0.6,
  maxZoom: 2.5,
  initialZoom: 1,
  /** Quanto o zoom muda a cada "clique" da roda do mouse (~100px de rolagem). */
  wheelZoomStep: 0.1,
  /** Velocidade do movimento livre com WASD/setas, em unidades por segundo com zoom 1. */
  panSpeed: 18,
  /** Suavização ao seguir um alvo (maior = mais rápido). */
  followSharpness: 8,
} as const;

export const WORLD = {
  /** Tamanho do chão provisório da Fase 1 (unidades do mundo). */
  groundSize: 64,
} as const;
