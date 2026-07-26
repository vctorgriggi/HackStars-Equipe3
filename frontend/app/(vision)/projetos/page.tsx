"use client";

// Listagem de projetos-modelo — API REAL. Os contadores (totalPecas,
// totalCampos) chegam PRONTOS do servidor. Lotes/progresso/entrega do mock
// saíram: não existem no domínio real (ProjetoModelo = código do desenho +
// checklist que a engine consome).

import type { ProjetoModeloComContadoresApi } from "@/lib/domain/projeto-api";
import { useProjetosApi } from "@/lib/data/use-projetos-api";
import { DataTable, type Column } from "@/components/ui/data-table";
import { EmptyState } from "@/components/ui/empty-state";
import { SkeletonListagem } from "@/components/ui/skeleton";

const columns: Column<ProjetoModeloComContadoresApi>[] = [
  {
    id: "codigo",
    header: "Projeto",
    width: "minmax(140px,0.8fr)",
    truncate: true,
    cell: (p) => (
      <span className="t-mono text-sm font-medium text-text-1">{p.codigo}</span>
    ),
  },
  {
    id: "descricao",
    header: "Descrição",
    width: "minmax(160px,1.4fr)",
    truncate: true,
    cell: (p) => (
      <span className="text-sm text-text-2">{p.descricao ?? "—"}</span>
    ),
  },
  {
    id: "pecas",
    header: "Peças",
    width: "80px",
    cell: (p) => <span className="t-mono text-sm">{p.totalPecas}</span>,
  },
  {
    id: "campos",
    header: "Campos na checklist",
    width: "150px",
    cell: (p) => (
      <span className="t-mono text-sm text-text-2">{p.totalCampos}</span>
    ),
  },
];

export default function ProjetosPage() {
  const { data: projetos, isPending, isError, refetch } = useProjetosApi();

  if (isPending) return <SkeletonListagem />;

  if (isError) {
    return (
      <EmptyState
        title="Não foi possível carregar os projetos"
        description="A API não respondeu. Verifique a conexão e tente de novo."
        action={{ label: "Tentar novamente", onClick: () => void refetch() }}
      />
    );
  }

  return (
    <DataTable
      rows={projetos ?? []}
      columns={columns}
      rowKey={(p) => p.id}
      label="Projetos"
      empty={
        <EmptyState
          title="Nenhum projeto cadastrado"
          description="O projeto-modelo entra por seed (e, no futuro, pela ingestão do PDF com revisão) — não há cadastro manual."
        />
      }
      renderCard={(p) => (
        <div className="grid gap-2">
          <div className="flex items-center justify-between gap-2">
            <span className="t-mono truncate text-sm font-medium text-text-1">
              {p.codigo}
            </span>
            <span className="t-mono flex-none text-xs text-text-3">
              {p.totalPecas} {p.totalPecas === 1 ? "peça" : "peças"}
            </span>
          </div>
          <p className="truncate text-sm text-text-2">{p.descricao ?? "—"}</p>
          <p className="t-mono text-xs text-text-3">
            {p.totalCampos} campos na checklist
          </p>
        </div>
      )}
    />
  );
}
