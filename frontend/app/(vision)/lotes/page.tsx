"use client";

// Listagem de lotes — API REAL. Lote = peças agrupadas pelo `pedido` do QR;
// contadores e progresso chegam PRONTOS do servidor (regra de ouro: dado
// derivado nasce na API). Status/previsão do mock saíram: o domínio real não
// tem previsão de entrega, e conformidade aparece como contagem de
// divergentes (mesma leitura da tela de clientes), nunca como veredito
// recalculado aqui.

import type { LoteResumoApi } from "@/lib/domain/lote-api";
import { useLotesApi } from "@/lib/data/use-lotes-api";
import { DataTable, type Column } from "@/components/ui/data-table";
import { EmptyState } from "@/components/ui/empty-state";
import { ProgressBar } from "@/components/ui/progress-bar";
import { SkeletonListagem } from "@/components/ui/skeleton";

// Divergente usa o token do veredito — mapeamento de cor, não cálculo.
function Divergentes({ total }: { total: number }) {
  return (
    <span
      className="t-mono text-sm"
      style={total > 0 ? { color: "var(--color-divergente)" } : undefined}
    >
      {total}
    </span>
  );
}

const columns: Column<LoteResumoApi>[] = [
  {
    id: "lote",
    header: "Lote",
    width: "110px",
    truncate: true,
    cell: (l) => <span className="t-mono text-sm">{l.pedido}</span>,
  },
  {
    id: "cliente",
    header: "Cliente",
    width: "minmax(110px,1fr)",
    truncate: true,
    cell: (l) => (
      <span className="text-sm text-text-2">{l.cliente ?? "—"}</span>
    ),
  },
  {
    id: "projeto",
    header: "Projeto",
    width: "minmax(100px,1fr)",
    truncate: true,
    cell: (l) => (
      <span className="t-mono text-xs text-text-2">
        {l.projetoCodigo ?? "—"}
      </span>
    ),
  },
  {
    id: "unidades",
    header: "Unid.",
    width: "62px",
    cell: (l) => <span className="t-mono text-sm">{l.totalPecas}</span>,
  },
  {
    id: "progresso",
    header: "Progresso",
    width: "minmax(90px,1fr)",
    cell: (l) => (
      <span className="flex items-center gap-2">
        <span className="min-w-0 flex-1">
          <ProgressBar
            value={l.progressoPct}
            label={`Progresso do lote ${l.pedido}`}
          />
        </span>
        <span className="t-mono text-xs text-text-2">{l.progressoPct}%</span>
      </span>
    ),
  },
  {
    id: "divergentes",
    header: "Divergentes",
    width: "100px",
    cell: (l) => <Divergentes total={l.pecasDivergentes} />,
  },
];

export default function LotesPage() {
  const { data: lotes, isPending, isError, refetch } = useLotesApi();

  if (isPending) return <SkeletonListagem />;

  if (isError) {
    return (
      <EmptyState
        title="Não foi possível carregar os lotes"
        description="A API não respondeu. Verifique a conexão e tente de novo."
        action={{ label: "Tentar novamente", onClick: () => void refetch() }}
      />
    );
  }

  return (
    <DataTable
      rows={lotes ?? []}
      columns={columns}
      rowKey={(l) => l.pedido}
      label="Lotes"
      empty={
        <EmptyState
          title="Nenhum lote registrado"
          description="O lote nasce do campo pedido da identidade da peça (etiqueta digitada ou QR) — peças sem pedido não formam lote."
        />
      }
      renderCard={(l) => (
        <div className="grid gap-2">
          <div className="flex items-center justify-between gap-2">
            <span className="t-mono text-sm font-medium text-text-1">
              {l.pedido}
            </span>
            <span className="t-caps text-2xs text-text-3">
              <Divergentes total={l.pecasDivergentes} /> diverg.
            </span>
          </div>
          <p className="truncate text-sm text-text-2">
            {l.cliente ?? "—"} ·{" "}
            <span className="t-mono text-xs">{l.totalPecas} unid.</span>
          </p>
          <div className="flex items-center gap-2">
            <span className="min-w-0 flex-1">
              <ProgressBar
                value={l.progressoPct}
                label={`Progresso do lote ${l.pedido}`}
              />
            </span>
            <span className="t-mono text-xs text-text-2">
              {l.progressoPct}%
            </span>
          </div>
          {l.projetoCodigo ? (
            <p className="t-mono text-xs text-text-3">{l.projetoCodigo}</p>
          ) : null}
        </div>
      )}
    />
  );
}
