// Geometria do mapa da esteira — constantes do protótipo (linhas 923–926),
// verificadas: todas as bordas dos segmentos são flush com os boxes.

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
  [170, 180],
  [170, 336],
  [610, 336],
];
export const POS_V: readonly Ponto[] = [
  [95, 16],
  [95, 156],
  [95, 296],
  [95, 436],
  [95, 576],
  [95, 716],
];

export const BELTS_D: readonly BeltSeg[] = [
  [150, 52, 460, 28, 90, "tvBelt"],
  [661, 112, 28, 68, 180, "tvBeltV"],
  [300, 212, 310, 28, 90, "tvBeltR"],
  [221, 272, 28, 64, 180, "tvBeltV"],
  [300, 368, 310, 28, 90, "tvBelt"],
];
export const BELTS_V: readonly BeltSeg[] = [0, 1, 2, 3, 4].map(
  (i) => [146, 108 + 140 * i, 28, 48, 180, "tvBeltV"] as const,
);

export const BOX_W = 130;
export const BOX_H = 92;

export const CANVAS = {
  desktop: { w: 760, h: 448, pos: POS_D, belts: BELTS_D },
  compact: { w: 320, h: 824, pos: POS_V, belts: BELTS_V },
} as const;

export const VELOCIDADE_PX_S = 240;
export const LIMIAR_COMPACT = 600;

/** Centro do box do checkpoint `i` no canvas lógico. */
export const centro = (pos: readonly Ponto[], i: number): Ponto => [
  pos[i][0] + BOX_W / 2,
  pos[i][1] + BOX_H / 2,
];

/** Destino de uma viagem; `para === null` = expedição (sai da moldura — os
 *  alvos são propositalmente FORA do canvas; o overflow:hidden faz o sprite
 *  deslizar para fora de quadro). */
export function destino(
  pos: readonly Ponto[],
  para: number | null,
  compact: boolean,
): Ponto {
  if (para != null) return centro(pos, para);
  const [x, y] = centro(pos, 5);
  return compact ? [x, y + 130] : [x + 180, y];
}
