"use client";

// Listagem de transformadores. Filtros (busca/status/etapa) vivem na URL —
// back-button e reload preservam; a filtragem é useMemo sobre a lista
// completa (a query key não muda por tecla).

import { useMemo } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import type { ReadingStatus, Transformador } from "@/lib/domain/types";
import { READING_LABELS, fmtKva } from "@/lib/domain/status";
import { useTransformadores } from "@/lib/data/use-transformadores";
import { useCheckpoints } from "@/lib/data/use-checkpoints";
import { DataTable, type Column } from "@/components/ui/data-table";
import { EmptyState } from "@/components/ui/empty-state";
import { NeutralChip, StatusChip } from "@/components/ui/chip";
import { Select } from "@/components/ui/select";
import { Icon } from "@/components/ui/icon";
import { SkeletonListagem } from "@/components/ui/skeleton";
import { AlertasTransformadores } from "@/components/vision/alertas-transformadores";

const STATUS_OPTIONS = [
  { value: "all", label: "Todos os status" },
  ...(
    ["pending", "processing", "success", "lowconf", "mismatch"] as const
  ).map((s) => ({ value: s, label: READING_LABELS[s] })),
];

export default function TransformadoresPage() {
  const { data: transformadores, isPending } = useTransformadores();
  const { data: checkpoints = [] } = useCheckpoints();
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

  const nomes = checkpoints.map((c) => c.nome);
  const etapaOptions = [
    { value: "all", label: "Todas as etapas" },
    ...checkpoints.map((c, i) => ({ value: String(i), label: c.nome })),
  ];

  const filtrados = useMemo(() => {
    const busca = q.trim().toLowerCase();
    return (transformadores ?? []).filter(
      (t) =>
        (!busca ||
          t.serie.toLowerCase().includes(busca) ||
          t.clienteNome.toLowerCase().includes(busca)) &&
        (fStatus === "all" || t.status === (fStatus as ReadingStatus)) &&
        (fEtapa === "all" || t.etapaIndex === Number(fEtapa)),
    );
  }, [transformadores, q, fStatus, fEtapa]);

  const columns: Column<Transformador>[] = [
    {
      id: "serie",
      header: "Série",
      width: "105px",
      cell: (t) => <span className="t-mono text-sm">{t.serie}</span>,
    },
    {
      id: "cliente",
      header: "Cliente",
      width: "minmax(160px,1fr)",
      truncate: true,
      cell: (t) => (
        <span className="text-sm text-text-2">
          {t.clienteNome} ·{" "}
          <span className="t-mono text-xs">{fmtKva(t.kva)} kVA</span>
        </span>
      ),
    },
    {
      id: "etapa",
      header: "Etapa",
      width: "110px",
      alignStart: true,
      cell: (t) => <NeutralChip>{nomes[t.etapaIndex] ?? "—"}</NeutralChip>,
    },
    {
      id: "status",
      header: "Status",
      width: "110px",
      alignStart: true,
      cell: (t) => <StatusChip status={t.status} />,
    },
    {
      id: "entrega",
      header: "Entrega",
      width: "90px",
      cell: (t) => (
        <span className="t-mono text-xs text-text-2">{t.entregaPrevista}</span>
      ),
    },
  ];

  if (isPending) return <SkeletonListagem />;

  return (
    <div className="grid gap-4">
      <AlertasTransformadores />

      <div className="flex flex-wrap items-center gap-2">
        <label className="relative min-w-0 flex-1 basis-56">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-text-3">
            <Icon name="search" size={15} />
          </span>
          <input
            value={q}
            onChange={(e) => setParam("q", e.target.value)}
            placeholder="Buscar por série ou cliente"
            aria-label="Buscar por série ou cliente"
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
        rowKey={(t) => t.serie}
        rowHref={(t) => `/transformadores/${t.serie}`}
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
                {t.serie}
              </span>
              <StatusChip status={t.status} />
            </div>
            <span className="text-sm text-text-2">
              {t.clienteNome} ·{" "}
              <span className="t-mono text-xs">{fmtKva(t.kva)} kVA</span>
            </span>
            <div className="flex items-center justify-between gap-2">
              <NeutralChip>{nomes[t.etapaIndex] ?? "—"}</NeutralChip>
              <span className="t-mono text-xs text-text-3">
                {t.entregaPrevista}
              </span>
            </div>
          </div>
        )}
      />
    </div>
  );
}
