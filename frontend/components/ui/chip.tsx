// Chips de status — fundo `--reading-<st>-soft`, texto `--color-reading-<st>`
// (DESIGN.md: nunca cor ad-hoc). Dois mapas de rótulo: leitura (ST do
// protótipo) e lotes/projetos (STL).

import type { ReadingStatus } from "@/lib/domain/types";
import { LOTE_LABELS, READING_LABELS } from "@/lib/domain/status";

// Classes literais para o Tailwind enxergar cada par no build.
const CHIP_CLASSES: Record<ReadingStatus, string> = {
  pending: "bg-reading-pending-soft text-reading-pending",
  processing: "bg-reading-processing-soft text-reading-processing",
  success: "bg-reading-success-soft text-reading-success",
  lowconf: "bg-reading-lowconf-soft text-reading-lowconf",
  mismatch: "bg-reading-mismatch-soft text-reading-mismatch",
  validated: "bg-reading-validated-soft text-reading-validated",
};

const BASE =
  "inline-flex items-center whitespace-nowrap rounded-[var(--radius-pill)] px-2 py-0.5 text-xs font-semibold";

export function StatusChip({
  status,
  context = "reading",
  label,
}: {
  status: ReadingStatus;
  /** "lote" usa o mapa Aguardando/Em produção/Atenção/Concluído. */
  context?: "reading" | "lote";
  /** Sobrescreve o rótulo (ex.: chips da timeline: "Concluído"/"Previsto"). */
  label?: string;
}) {
  const texto =
    label ??
    (context === "lote"
      ? (LOTE_LABELS[status] ?? READING_LABELS[status])
      : READING_LABELS[status]);
  return <span className={`${BASE} ${CHIP_CLASSES[status]}`}>{texto}</span>;
}

/** Chip neutro (etapa na listagem, "Previsto" na timeline). */
export function NeutralChip({ children }: { children: React.ReactNode }) {
  return (
    <span className={`${BASE} bg-surface-2 text-text-2`}>{children}</span>
  );
}
