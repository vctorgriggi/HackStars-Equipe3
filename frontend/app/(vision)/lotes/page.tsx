"use client";

import type { Lote } from "@/lib/domain/types";
import { useLotes } from "@/lib/data/use-listagens";
import { DataTable, type Column } from "@/components/ui/data-table";
import { ProgressBar } from "@/components/ui/progress-bar";
import { StatusChip } from "@/components/ui/chip";
import { SkeletonListagem } from "@/components/ui/skeleton";

const columns: Column<Lote>[] = [
  {
    id: "lote",
    header: "Lote",
    width: "100px",
    cell: (l) => <span className="t-mono text-sm">{l.id}</span>,
  },
  {
    id: "projeto",
    header: "Projeto",
    width: "minmax(110px,1fr)",
    truncate: true,
    cell: (l) => (
      <span className="text-sm text-text-2">{l.projetoNome}</span>
    ),
  },
  {
    id: "unidades",
    header: "Unid.",
    width: "62px",
    cell: (l) => <span className="t-mono text-sm">{l.unidades}</span>,
  },
  {
    id: "progresso",
    header: "Progresso",
    width: "minmax(90px,1fr)",
    cell: (l) => (
      <span className="flex items-center gap-2">
        <span className="min-w-0 flex-1">
          <ProgressBar value={l.progresso} label={`Progresso do ${l.id}`} />
        </span>
        <span className="t-mono text-xs text-text-2">{l.progresso}%</span>
      </span>
    ),
  },
  {
    id: "status",
    header: "Status",
    width: "100px",
    alignStart: true,
    cell: (l) => <StatusChip status={l.status} context="lote" />,
  },
  {
    id: "previsao",
    header: "Previsão",
    width: "78px",
    cell: (l) => (
      <span className="t-mono text-xs text-text-2">{l.previsao}</span>
    ),
  },
];

export default function LotesPage() {
  const { data: lotes, isPending } = useLotes();
  if (isPending) return <SkeletonListagem />;

  return (
    <DataTable
      rows={lotes ?? []}
      columns={columns}
      rowKey={(l) => l.id}
      label="Lotes"
      renderCard={(l) => (
        <div className="grid gap-2">
          <div className="flex items-center justify-between gap-2">
            <span className="t-mono text-sm font-medium text-text-1">
              {l.id}
            </span>
            <StatusChip status={l.status} context="lote" />
          </div>
          <p className="text-sm text-text-2">
            {l.projetoNome} ·{" "}
            <span className="t-mono text-xs">{l.unidades} unid.</span>
          </p>
          <div className="flex items-center gap-2">
            <span className="min-w-0 flex-1">
              <ProgressBar value={l.progresso} label={`Progresso do ${l.id}`} />
            </span>
            <span className="t-mono text-xs text-text-2">{l.progresso}%</span>
          </div>
          <p className="t-mono text-xs text-text-3">Previsão: {l.previsao}</p>
        </div>
      )}
    />
  );
}
