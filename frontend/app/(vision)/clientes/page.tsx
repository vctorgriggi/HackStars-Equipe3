"use client";

// Listagem de clientes — API REAL. Os contadores (totalPecas,
// pecasDivergentes) chegam PRONTOS do servidor; a única conta aqui é
// apresentação (iniciais do avatar derivadas do nome no render). Cidade e
// e-mail do mock saíram: o domínio real do cliente é só o nome vindo do QR.

import type { ClienteComContadoresApi } from "@/lib/domain/cliente-api";
import { useClientesApi } from "@/lib/data/use-clientes-api";
import { Avatar } from "@/components/ui/avatar";
import { DataTable, type Column } from "@/components/ui/data-table";
import { EmptyState } from "@/components/ui/empty-state";
import { SkeletonListagem } from "@/components/ui/skeleton";

function iniciaisDoNome(nome: string): string {
  const partes = nome.trim().split(/\s+/).filter(Boolean);
  if (partes.length === 0) return "?";
  return partes
    .slice(0, 2)
    .map((parte) => parte[0]!.toUpperCase())
    .join("");
}

function fmtData(iso: string): string {
  return new Date(iso).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "2-digit",
  });
}

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

const columns: Column<ClienteComContadoresApi>[] = [
  {
    id: "nome",
    header: "Cliente",
    width: "1fr",
    truncate: true,
    cell: (c) => (
      <span className="flex min-w-0 items-center gap-3">
        <Avatar iniciais={iniciaisDoNome(c.nome)} size={34} />
        <span className="block truncate text-sm font-medium text-text-1">
          {c.nome}
        </span>
      </span>
    ),
  },
  {
    id: "pecas",
    header: "Peças",
    width: "90px",
    cell: (c) => <span className="t-mono text-sm">{c.totalPecas}</span>,
  },
  {
    id: "divergentes",
    header: "Divergentes",
    width: "110px",
    cell: (c) => <Divergentes total={c.pecasDivergentes} />,
  },
  {
    id: "cadastro",
    header: "Cadastro",
    width: "90px",
    cell: (c) => (
      <span className="t-mono text-xs text-text-2">{fmtData(c.createdAt)}</span>
    ),
  },
];

export default function ClientesPage() {
  const { data: clientes, isPending, isError, refetch } = useClientesApi();

  if (isPending) return <SkeletonListagem />;

  if (isError) {
    return (
      <EmptyState
        title="Não foi possível carregar os clientes"
        description="A API não respondeu. Verifique a conexão e tente de novo."
        action={{ label: "Tentar novamente", onClick: () => void refetch() }}
      />
    );
  }

  return (
    <DataTable
      rows={clientes ?? []}
      columns={columns}
      rowKey={(c) => c.id}
      label="Clientes"
      empty={
        <EmptyState
          title="Nenhum cliente cadastrado"
          description="O cadastro de cliente nasce automaticamente do QR na primeira conferência ou scan da peça — não há cadastro manual."
        />
      }
      renderCard={(c) => (
        <div className="flex items-center gap-3">
          <Avatar iniciais={iniciaisDoNome(c.nome)} size={40} />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-text-1">{c.nome}</p>
            <p className="truncate text-xs text-text-3">
              Cadastro {fmtData(c.createdAt)}
            </p>
          </div>
          <div className="text-right">
            <p className="t-mono text-base font-semibold text-text-1">
              {c.totalPecas}
            </p>
            <p className="t-caps text-2xs text-text-3">peças</p>
          </div>
          <div className="text-right">
            <p className="t-mono text-base font-semibold">
              <Divergentes total={c.pecasDivergentes} />
            </p>
            <p className="t-caps text-2xs text-text-3">diverg.</p>
          </div>
        </div>
      )}
    />
  );
}
