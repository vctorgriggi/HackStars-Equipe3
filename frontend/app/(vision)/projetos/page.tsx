"use client";

import type { Projeto } from "@/lib/domain/types";
import { useProjetos } from "@/lib/data/use-listagens";
import { READING_VAR } from "@/lib/domain/status";
import { DataTable, type Column } from "@/components/ui/data-table";
import { ProgressBar } from "@/components/ui/progress-bar";
import { SkeletonListagem } from "@/components/ui/skeleton";

const columns: Column<Projeto>[] = [
  {
    id: "projeto",
    header: "Projeto",
    width: "minmax(120px,1.2fr)",
    truncate: true,
    cell: (p) => (
      <span className="text-sm font-medium text-text-1">{p.nome}</span>
    ),
  },
  {
    id: "cliente",
    header: "Cliente",
    width: "minmax(100px,1fr)",
    truncate: true,
    cell: (p) => <span className="text-sm text-text-2">{p.clienteNome}</span>,
  },
  {
    id: "lotes",
    header: "Lotes",
    width: "44px",
    cell: (p) => <span className="t-mono text-sm">{p.lotes}</span>,
  },
  {
    id: "unidades",
    header: "Unid.",
    width: "62px",
    cell: (p) => <span className="t-mono text-sm">{p.unidades}</span>,
  },
  {
    id: "progresso",
    header: "Progresso",
    width: "minmax(84px,1fr)",
    cell: (p) => (
      <span className="flex items-center gap-2">
        <span className="min-w-0 flex-1">
          <ProgressBar
            value={p.progresso}
            color={READING_VAR[p.status]}
            label={`Progresso de ${p.nome}`}
          />
        </span>
        <span className="t-mono text-xs text-text-2">{p.progresso}%</span>
      </span>
    ),
  },
  {
    id: "entrega",
    header: "Entrega",
    width: "66px",
    cell: (p) => (
      <span className="t-mono text-xs text-text-2">{p.entrega}</span>
    ),
  },
];

export default function ProjetosPage() {
  const { data: projetos, isPending } = useProjetos();
  if (isPending) return <SkeletonListagem />;

  return (
    <DataTable
      rows={projetos ?? []}
      columns={columns}
      rowKey={(p) => p.id}
      label="Projetos"
      renderCard={(p) => (
        <div className="grid gap-2">
          <div className="flex items-center justify-between gap-2">
            <span className="truncate text-sm font-medium text-text-1">
              {p.nome}
            </span>
            <span className="t-mono flex-none text-xs text-text-3">
              {p.entrega}
            </span>
          </div>
          <p className="text-sm text-text-2">
            {p.clienteNome} ·{" "}
            <span className="t-mono text-xs">
              {p.lotes} {p.lotes === 1 ? "lote" : "lotes"} · {p.unidades} unid.
            </span>
          </p>
          <div className="flex items-center gap-2">
            <span className="min-w-0 flex-1">
              <ProgressBar
                value={p.progresso}
                color={READING_VAR[p.status]}
                label={`Progresso de ${p.nome}`}
              />
            </span>
            <span className="t-mono text-xs text-text-2">{p.progresso}%</span>
          </div>
        </div>
      )}
    />
  );
}
