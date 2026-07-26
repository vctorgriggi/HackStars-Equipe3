// Geometria do mapa da esteira — 4 checkpoints REAIS da linha (adesivação →
// serigrafia → óleo/conferência → fixação da placa), serpentina de 2 linhas
// no desktop e coluna no compacto. Medidas de box/belt herdadas do protótipo;
// todas as bordas dos segmentos são flush com os boxes.

export type Ponto = readonly [x: number, y: number];
export type BeltAnim = "tvBelt" | "tvBeltR" | "tvBeltV";
export type BeltSeg = readonly [
  l: number,
  t: number,
  w: number,
  h: number,
  deg: number,
  anim: BeltAnim,
];

export const POS_D: readonly Ponto[] = [
  [20, 20],
  [610, 20],
  [610, 180],
  [20, 180],
];
export const POS_V: readonly Ponto[] = [
  [95, 16],
  [95, 156],
  [95, 296],
  [95, 436],
];

export const BELTS_D: readonly BeltSeg[] = [
  [150, 52, 460, 28, 90, "tvBelt"],
  [661, 112, 28, 68, 180, "tvBeltV"],
  [150, 212, 460, 28, 90, "tvBeltR"],
];
export const BELTS_V: readonly BeltSeg[] = [0, 1, 2].map(
  (i) => [146, 108 + 140 * i, 28, 48, 180, "tvBeltV"] as const,
);

export const BOX_W = 130;
export const BOX_H = 92;

export const CANVAS = {
  desktop: { w: 760, h: 292, pos: POS_D, belts: BELTS_D },
  compact: { w: 320, h: 544, pos: POS_V, belts: BELTS_V },
} as const;

export const VELOCIDADE_PX_S = 240;
export const LIMIAR_COMPACT = 600;

/** Centro do box do checkpoint `i` no canvas lógico. */
export const centro = (pos: readonly Ponto[], i: number): Ponto => [
  pos[i][0] + BOX_W / 2,
  pos[i][1] + BOX_H / 2,
];

/** Destino de uma viagem entre checkpoints. */
export function destino(pos: readonly Ponto[], para: number): Ponto {
  return centro(pos, para);
}
