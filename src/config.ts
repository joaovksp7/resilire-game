// Configurações gerais do jogo. Texto educativo NÃO entra aqui: ele mora em content/.

/** Nome exibido no título da aba e nas telas do jogo. */
export const GAME_NAME = 'Resilire — Cidade Resiliente';

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
  initialZoom: 1.3,
  /** Quanto o zoom muda a cada "clique" da roda do mouse (~100px de rolagem). */
  wheelZoomStep: 0.1,
  /** Velocidade do movimento livre com WASD/setas, em unidades por segundo com zoom 1. */
  panSpeed: 18,
  /** Suavização ao seguir um alvo (maior = mais rápido). */
  followSharpness: 8,
} as const;

export const WORLD = {
  /** Lado de cada tile do mapa (unidades do mundo). */
  tileSize: 2,
  /** Altura de cada nível do terreno (unidades do mundo). Ver src/world/layout.ts. */
  levelHeight: 1,
  /** Quanto a "maquete" desce abaixo do fundo do rio. */
  baseDepth: 2,
  /** Nível da água antes de o clima do eixo ser aplicado (em níveis do terreno; 0 = fundo do rio). */
  initialWaterLevel: 0.55,
} as const;

/**
 * Clima de cada eixo: céu, luzes, rio e chuva. As chaves são os ids dos eixos (content/missions.json).
 * A rua, praça ou ponte cujo chão fica abaixo de `waterLevel` alaga e sai das casas destacadas pelo dado.
 */
export const CLIMATE = {
  /** Duração da mudança de clima ao trocar de eixo (segundos). Com prefers-reduced-motion, muda na hora. */
  transitionSeconds: 3,
  eixos: {
    // Céu nublado, chuva fraca.
    alerta: {
      /** Cor do céu (fundo da cena). */
      sky: 0xb4c7d4,
      /** Força da luz do céu (ambiente) e do sol. */
      ambient: 1.45,
      sun: 1.15,
      /** Nível da água, em níveis do terreno. O nível 1 é a parte baixa: acima de ~1,3 ela alaga. */
      waterLevel: 0.55,
      waterColor: 0x4aa3df,
      /** Quantidade de chuva, de 0 (nada) a 1 (o máximo de RAIN). */
      rain: 0.25,
    },
    // Chuva moderada, rio subindo um pouco.
    preparacao: {
      sky: 0x9fb3c2,
      ambient: 1.32,
      sun: 0.85,
      waterLevel: 0.85,
      waterColor: 0x4f94c2,
      rain: 0.55,
    },
    // Chuva forte, rio transbordando: a parte baixa (nível 1) e a ponte ficam embaixo d'água.
    durante: {
      sky: 0x8a9eae,
      ambient: 1.22,
      sun: 0.6,
      waterLevel: 1.35,
      waterColor: 0x6a90a6,
      rain: 1,
    },
  },
} as const;

export const RAIN = {
  /** Máximo de gotas com chuva forte, no computador. */
  maxDrops: 1200,
  /** Máximo de gotas no celular e no tablet (tela de toque), para não pesar. */
  maxDropsMobile: 500,
  /** Velocidade da queda com chuva fraca e com chuva forte (unidades por segundo com zoom 1). */
  speedMin: 22,
  speedMax: 34,
  /** Comprimento e largura de cada risco de chuva (unidades com zoom 1). */
  length: 0.9,
  width: 0.06,
  /** Inclinação pelo vento com chuva forte (quanto o risco anda para o lado a cada unidade de queda). */
  slant: 0.16,
  /** Com prefers-reduced-motion: fração das gotas e da velocidade (e sem inclinação). */
  reducedMotionFactor: 0.5,
  color: 0xeaf3fa,
  opacity: 0.55,
} as const;

/**
 * Som gerado por código (src/audio/sound.ts). Volumes de 0 a 1.
 * O som só começa depois do primeiro clique, toque ou tecla (regra dos navegadores).
 */
export const AUDIO = {
  /** Volume geral. */
  master: 0.8,
  /** Volume da chuva com chuva forte (com chuva fraca fica mais baixo). */
  rain: 0.35,
  /** Volume dos efeitos (pin, dado, acerto). */
  effects: 0.6,
} as const;

export const PLAYER = {
  /** Velocidade de caminhada (unidades do mundo por segundo; 1 tile = 2 unidades). */
  speed: 4,
  /** Rapidez para virar na direção do movimento (maior = mais rápido). */
  turnSharpness: 12,
  /** Tamanho do personagem (1 = cerca de 1,25 unidade de altura). */
  scale: 1,
  /** Passos por segundo na animação de andar. */
  stepRate: 2.4,
  /** Altura do pulinho a cada casa (desligado com prefers-reduced-motion). */
  hopHeight: 0.18,
  /** Tolerância do toque: aceita uma casa destacada a até esta distância (em tiles) do ponto tocado. */
  tapTolerance: 0.9,
} as const;

export const DICE = {
  /** Faces do dado (1 a 6). */
  sides: 6,
  /** Lado do dado 3D (unidades do mundo). */
  size: 0.8,
  /** Duração da queda rolando (segundos). Com prefers-reduced-motion fica bem mais curta. */
  rollDuration: 0.9,
  /** Distância do dado até o personagem (unidades do mundo). */
  offset: 1.1,
} as const;

/** Cores do terreno e da água. As cores das instituições ficam em src/world/institutions.ts. */
export const TERRAIN_COLORS = {
  grass: 0x9ccc65,
  grassHigh: 0xa7d36f,
  slope: 0xb3a46e,
  street: 0x8f969c,
  plaza: 0xe4d9bd,
  bank: 0xd8c690,
  riverBed: 0x8a7a5c,
  lot: 0xd6d1c4,
  side: 0x8d6e4f,
  water: 0x4aa3df,
} as const;
