"use client";

// Listagem de transformadores — API REAL. Filtros (busca/status/etapa) vivem
// na URL (back-button e reload preservam); a filtragem é useMemo sobre a
// lista completa (a query key não muda por tecla). Veredito e etapa chegam
// PRONTOS da API (`vereditoVigente`/`etapaAtual`) — nada é derivado aqui.

import { useMemo } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import type { TransformadorComSituacaoApi } from "@/lib/domain/transformador-api";
import { VEREDITO_LABELS } from "@/lib/domain/transformador-api";
import type { Veredito } from "@/lib/domain/types";
import {
  useEtapasLinha,
  useTransformadoresApi,
} from "@/lib/data/use-transformadores-api";
import { DataTable, type Column } from "@/components/ui/data-table";
import { EmptyState } from "@/components/ui/empty-state";
import { NeutralChip } from "@/components/ui/chip";
import { VereditoChip } from "@/components/vision/veredito-chip";
import { Select } from "@/components/ui/select";
import { Icon } from "@/components/ui/icon";
import { SkeletonListagem } from "@/components/ui/skeleton";

const STATUS_OPTIONS = [
  { value: "all", label: "Todos os status" },
  ...(Object.entries(VEREDITO_LABELS) as [Veredito, string][]).map(
    ([value, label]) => ({ value, label }),
  ),
  { value: "sem", label: "Sem conferência" },
];

function fmtData(iso: string): string {
  return new Date(iso).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
  });
}

export default function TransformadoresPage() {
  const {
    data: transformadores,
    isPending,
    isError,
    refetch,
  } = useTransformadoresApi();
  const { data: etapas = [] } = useEtapasLinha();
  const router = useRouter();
  const pathname = usePathname();
  const sp = useSearchParams();

  const q = sp.get("q") ?? "";
  const fStatus = sp.get("status") ?? "all";
  const fEtapa = sp.get("etapa") ?? "all";

  const setParam = (key: string, value: string) => {
    const params = new URLSearchParams(sp);
    if (value === "" || value === "all") params.delete(key);
    else params.set(key, value);
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  };

  // Etapas REAIS da linha (seed do backend); o filtro casa por `codigo`, o
  // identificador estável — nunca por nome nem índice.
  const etapaOptions = [
    { value: "all", label: "Todas as etapas" },
    ...etapas.map((etapa) => ({ value: etapa.codigo, label: etapa.nome })),
  ];

  const filtrados = useMemo(() => {
    const busca = q.trim().toLowerCase();
    return (transformadores ?? []).filter((t) => {
      const veredito = t.vereditoVigente?.vereditoGeral ?? null;
      return (
        (!busca ||
          t.numeroSerie.toLowerCase().includes(busca) ||
          t.cliente.toLowerCase().includes(busca) ||
          t.patrimonio.toLowerCase().includes(busca)) &&
        (fStatus === "all" ||
          (fStatus === "sem" ? veredito === null : veredito === fStatus)) &&
        (fEtapa === "all" || t.etapaAtual?.checkpoint.codigo === fEtapa)
      );
    });
  }, [transformadores, q, fStatus, fEtapa]);

  const columns: Column<TransformadorComSituacaoApi>[] = [
    {
      id: "serie",
      header: "Série",
      width: "105px",
      cell: (t) => <span className="t-mono text-sm">{t.numeroSerie}</span>,
    },
    {
      id: "cliente",
      header: "Cliente",
      width: "minmax(160px,1fr)",
      truncate: true,
      cell: (t) => (
        <span className="text-sm text-text-2">{t.cliente || "—"}</span>
      ),
    },
    {
      id: "patrimonio",
      header: "Patrimônio",
      width: "110px",
      cell: (t) => <span className="t-mono text-sm">{t.patrimonio}</span>,
    },
    {
      id: "etapa",
      header: "Etapa",
      width: "130px",
      alignStart: true,
      cell: (t) => (
        <NeutralChip>{t.etapaAtual?.checkpoint.nome ?? "—"}</NeutralChip>
      ),
    },
    {
      id: "status",
      header: "Status",
      width: "150px",
      alignStart: true,
      cell: (t) => (
        <span className="inline-flex items-center gap-1.5">
          <VereditoChip
            veredito={t.vereditoVigente?.vereditoGeral ?? null}
          />
          {t.vereditoVigente?.checkpoint && (
            // Gate parcial: o veredito não atesta a peça inteira — a etapa
            // acompanha o chip (gap 14 do CLAUDE.md).
            <span className="text-2xs text-text-3">
              {t.vereditoVigente.checkpoint.nome}
            </span>
          )}
        </span>
      ),
    },
    {
      id: "cadastro",
      header: "Cadastro",
      width: "80px",
      cell: (t) => (
        <span className="t-mono text-xs text-text-2">
          {fmtData(t.createdAt)}
        </span>
      ),
    },
  ];

  if (isPending) return <SkeletonListagem />;

  if (isError) {
    return (
      <EmptyState
        title="Não foi possível carregar as peças"
        description="A API não respondeu. Verifique a conexão e tente de novo."
        action={{ label: "Tentar novamente", onClick: () => void refetch() }}
      />
    );
  }

  return (
    <div className="grid gap-4">
      <div className="flex flex-wrap items-center gap-2">
        <label className="relative min-w-0 flex-1 basis-56">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-text-3">
            <Icon name="search" size={15} />
          </span>
          <input
            value={q}
            onChange={(e) => setParam("q", e.target.value)}
            placeholder="Buscar por série, cliente ou patrimônio"
            aria-label="Buscar por série, cliente ou patrimônio"
            className="h-9 w-full rounded-md border border-line bg-surface-2 pl-9 pr-3 text-sm text-text-1 outline-none placeholder:text-text-3 focus-visible:[box-shadow:var(--ring-focus)]"
          />
        </label>
        <Select
          value={fStatus}
          onValueChange={(v) => setParam("status", v)}
          options={STATUS_OPTIONS}
          ariaLabel="Filtrar por status"
        />
        <Select
          value={fEtapa}
          onValueChange={(v) => setParam("etapa", v)}
          options={etapaOptions}
          ariaLabel="Filtrar por etapa"
        />
        <span className="t-mono ml-auto text-xs text-text-3">
          {filtrados.length}{" "}
          {filtrados.length === 1 ? "unidade" : "unidades"}
        </span>
      </div>

      <DataTable
        rows={filtrados}
        columns={columns}
        rowKey={(t) => t.numeroSerie}
        rowHref={(t) => `/transformadores/${t.numeroSerie}`}
        label="Transformadores"
        empty={
          <EmptyState
            title="Nenhum transformador encontrado"
            description="Nenhum resultado para os filtros atuais. Ajuste a busca, o status ou a etapa."
            action={{
              label: "Limpar filtros",
              onClick: () => router.replace(pathname, { scroll: false }),
            }}
          />
        }
        renderCard={(t) => (
          <div className="grid gap-2">
            <div className="flex items-center justify-between gap-2">
              <span className="t-mono text-sm font-medium text-text-1">
                {t.numeroSerie}
              </span>
              <VereditoChip
                veredito={t.vereditoVigente?.vereditoGeral ?? null}
              />
            </div>
            <span className="text-sm text-text-2">
              {t.cliente || "—"} ·{" "}
              <span className="t-mono text-xs">{t.patrimonio}</span>
            </span>
            <div className="flex items-center justify-between gap-2">
              <NeutralChip>{t.etapaAtual?.checkpoint.nome ?? "—"}</NeutralChip>
              <span className="t-mono text-xs text-text-3">
                {fmtData(t.createdAt)}
              </span>
            </div>
          </div>
        )}
      />
    </div>
  );
}
