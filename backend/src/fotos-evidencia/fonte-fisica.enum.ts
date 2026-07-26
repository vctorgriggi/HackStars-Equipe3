import type { FonteFisica } from '../extracao/ports/extractor.port';

// Valores canônicos de `fonteFisica` (CLAUDE.md). Fonte única em código:
// a união literal `FonteFisica` de extracao/ports/extractor.port.ts — o
// `satisfies` abaixo quebra a compilação se as duas listas divergirem.
// Objeto as-const (não enum — convenção do repo: uniões literais); o nome
// FonteFisicaEnum é mantido por compatibilidade com DTO/controller/service.
// Chaves = as VISTAS da peça (eixo novo, 2026-07-25) + os dois closes de zoom
// (placa, etiqueta) + o escape `geral`. O porquê da mudança de eixo está na
// união literal, em extracao/ports/extractor.port.ts.
export const FonteFisicaEnum = {
  base: 'base',
  topo: 'topo',
  frente: 'frente',
  traseira: 'traseira',
  lateralEsquerda: 'lateral-esquerda',
  lateralDireita: 'lateral-direita',
  placa: 'placa',
  etiqueta: 'etiqueta',
  geral: 'geral',
} as const satisfies Record<string, FonteFisica>;

export type FonteFisicaEnum = FonteFisica;
