import type { FonteFisica } from '../extracao/ports/extractor.port';

// Valores canônicos de `fonteFisica` (CLAUDE.md). Fonte única em código:
// a união literal `FonteFisica` de extracao/ports/extractor.port.ts — o
// `satisfies` abaixo quebra a compilação se as duas listas divergirem.
// Objeto as-const (não enum — convenção do repo: uniões literais); o nome
// FonteFisicaEnum é mantido por compatibilidade com DTO/controller/service.
export const FonteFisicaEnum = {
  placa: 'placa',
  serigrafia: 'serigrafia',
  chumbado1: 'chumbado-1',
  chumbado2: 'chumbado-2',
  chumbado3: 'chumbado-3',
  geral: 'geral',
} as const satisfies Record<string, FonteFisica>;

export type FonteFisicaEnum = FonteFisica;
