"use client";

import type { Cliente } from "@/lib/domain/types";
import { useClientes } from "@/lib/data/use-listagens";
import { Avatar } from "@/components/ui/avatar";
import { DataTable, type Column } from "@/components/ui/data-table";
import { SkeletonListagem } from "@/components/ui/skeleton";

const columns: Column<Cliente>[] = [
  {
    id: "nome",
    header: "Cliente",
    width: "1fr",
    truncate: true,
    cell: (c) => (
      <span className="flex min-w-0 items-center gap-3">
        <Avatar iniciais={c.iniciais} size={34} />
        <span className="min-w-0">
          <span className="block truncate text-sm font-medium text-text-1">
            {c.nome}
          </span>
          <span className="block truncate text-xs text-text-3">
            {c.cidadeUf}
          </span>
        </span>
      </span>
    ),
  },
  {
    id: "email",
    header: "E-mail",
    width: "220px",
    truncate: true,
    cell: (c) => <span className="t-mono text-xs text-text-2">{c.email}</span>,
  },
  {
    id: "producao",
    header: "Em produção",
    width: "110px",
    cell: (c) => <span className="t-mono text-sm">{c.emProducao}</span>,
  },
  {
    id: "entregues",
    header: "Entregues",
    width: "110px",
    cell: (c) => (
      <span className="t-mono text-sm text-text-2">{c.entregues}</span>
    ),
  },
];

export default function ClientesPage() {
  const { data: clientes, isPending } = useClientes();
  if (isPending) return <SkeletonListagem />;

  return (
    <DataTable
      rows={clientes ?? []}
      columns={columns}
      rowKey={(c) => c.id}
      label="Clientes"
      renderCard={(c) => (
        <div className="flex items-center gap-3">
          <Avatar iniciais={c.iniciais} size={40} />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-text-1">{c.nome}</p>
            <p className="truncate text-xs text-text-3">{c.cidadeUf}</p>
          </div>
          <div className="text-right">
            <p className="t-mono text-base font-semibold text-text-1">
              {c.emProducao}
            </p>
            <p className="t-caps text-2xs text-text-3">ativos</p>
          </div>
        </div>
      )}
    />
  );
}
