// Mapas status → rótulo/token. ÚNICA fonte do pareamento cor↔status no app
// (DESIGN.md: nunca cor ad-hoc em componente).

import type { ReadingStatus } from "./types";

/** Labels de status de transformador (mapa ST do protótipo). */
export const READING_LABELS: Record<ReadingStatus, string> = {
  pending: "Aguardando",
  processing: "Em processo",
  success: "Aprovado",
  lowconf: "Atenção",
  mismatch: "Reprovado",
  validated: "Validado",
};

/** Labels no contexto de Lotes/Projetos (mapa STL do protótipo). */
export const LOTE_LABELS: Partial<Record<ReadingStatus, string>> = {
  pending: "Aguardando",
  processing: "Em produção",
  lowconf: "Atenção",
  success: "Concluído",
};

/** Vars CSS por status — para style inline quando a utility não cobre
 *  (ex.: cor calculada, stroke de SVG). Em className, preferir
 *  text-reading-* / bg-reading-*-soft. */
export const READING_VAR: Record<ReadingStatus, string> = {
  pending: "var(--color-reading-pending)",
  processing: "var(--color-reading-processing)",
  success: "var(--color-reading-success)",
  lowconf: "var(--color-reading-lowconf)",
  mismatch: "var(--color-reading-mismatch)",
  validated: "var(--color-reading-validated)",
};

export const READING_SOFT_VAR: Record<ReadingStatus, string> = {
  pending: "var(--reading-pending-soft)",
  processing: "var(--reading-processing-soft)",
  success: "var(--reading-success-soft)",
  lowconf: "var(--reading-lowconf-soft)",
  mismatch: "var(--reading-mismatch-soft)",
  validated: "var(--reading-validated-soft)",
};

/** Alto contraste p/ overlays sobre vídeo (bounding box, chips de feed). */
export const READING_HC_VAR: Record<ReadingStatus, string> = {
  pending: "var(--color-reading-pending-hc)",
  processing: "var(--color-reading-processing-hc)",
  success: "var(--color-reading-success-hc)",
  lowconf: "var(--color-reading-lowconf-hc)",
  mismatch: "var(--color-reading-mismatch-hc)",
  validated: "var(--color-reading-validated-hc)",
};

/** Formata kVA no padrão pt-BR do protótipo (112.5 → "112,5"). */
export function fmtKva(kva: number): string {
  return String(kva).replace(".", ",");
}
