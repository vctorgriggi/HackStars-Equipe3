"use client";

// Dashboard: filtro de período (URL), 4 KPIs, 4 gráficos, banner de alertas.
// Nomes de etapa vêm de useCheckpoints (funil segue rename sem reload).

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import type { PeriodoDashboard } from "@/lib/domain/types";
import { useDashboard } from "@/lib/data/use-dashboard";
import { useCheckpoints } from "@/lib/data/use-checkpoints";
import { BarChart } from "@/components/charts/bar-chart";
import { DonutChart } from "@/components/charts/donut-chart";
import { HBarsChart } from "@/components/charts/hbars-chart";
import { KpiCard } from "@/components/ui/kpi-card";
import { PillSwitcher } from "@/components/ui/pill-switcher";
import { SectionCard } from "@/components/ui/section-card";
import { SkeletonCharts, SkeletonKpis } from "@/components/ui/skeleton";
import { AlertasTransformadores } from "@/components/vision/alertas-transformadores";

const PERIODOS = [
  { value: "hoje", label: "Hoje" },
  { value: "7d", label: "7 dias" },
  { value: "30d", label: "30 dias" },
  { value: "custom", label: "Personalizado" },
];

function ehPeriodo(v: string | null): v is PeriodoDashboard {
  return v === "hoje" || v === "7d" || v === "30d" || v === "custom";
}

export default function DashboardPage() {
  const router = useRouter();
  const pathname = usePathname();
  const sp = useSearchParams();

  const periodo: PeriodoDashboard = ehPeriodo(sp.get("periodo"))
    ? (sp.get("periodo") as PeriodoDashboard)
    : "7d";
  const de = sp.get("de") ?? "2026-07-19";
  const ate = sp.get("ate") ?? "2026-07-26";

  const setParam = (key: string, value: string) => {
    const params = new URLSearchParams(sp);
    params.set(key, value);
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  };

  const { data, isPending } = useDashboard(periodo, de, ate);
  const { data: checkpoints = [] } = useCheckpoints();
  const nomes = checkpoints.map((c) => c.nome);

  return (
    <div className="grid gap-4">
      <AlertasTransformadores />

      <div className="flex flex-wrap items-center gap-2">
        <PillSwitcher
          value={periodo}
          onValueChange={(v) => setParam("periodo", v)}
          options={PERIODOS}
          ariaLabel="Período do dashboard"
        />
        {periodo === "custom" && (
          <div className="flex items-center gap-2">
            <input
              type="date"
              value={de}
              onChange={(e) => setParam("de", e.target.value)}
              aria-label="Data inicial"
              className="t-mono h-8 rounded-md border border-line bg-surface-2 px-2 text-xs text-text-1 outline-none focus-visible:[box-shadow:var(--ring-focus)]"
            />
            <span className="text-xs text-text-3">–</span>
            <input
              type="date"
              value={ate}
              onChange={(e) => setParam("ate", e.target.value)}
              aria-label="Data final"
              className="t-mono h-8 rounded-md border border-line bg-surface-2 px-2 text-xs text-text-1 outline-none focus-visible:[box-shadow:var(--ring-focus)]"
            />
          </div>
        )}
      </div>

      {isPending || !data ? (
        <>
          <SkeletonKpis />
          <SkeletonCharts />
        </>
      ) : (
        <>
          <div className="grid grid-cols-[repeat(auto-fit,minmax(150px,1fr))] gap-3">
            <KpiCard label="Em produção" valor={String(data.emProducao)} />
            <KpiCard
              label={data.prodLabel}
              valor={data.prodValor}
              sub={data.prodSub}
              subPositivo={periodo !== "custom"}
            />
            <KpiCard
              label="Aprovação em ensaios"
              valor={`${data.aprovacaoPct.toLocaleString("pt-BR", { minimumFractionDigits: 1 })}%`}
            />
            <KpiCard
              label="Tempo médio total"
              valor={`${data.tempoMedioTotalDias.toLocaleString("pt-BR", { minimumFractionDigits: 1 })} d`}
            />
          </div>

          <div className="grid grid-cols-[repeat(auto-fit,minmax(290px,1fr))] gap-3">
            <SectionCard title={data.prodTitulo}>
              <BarChart
                dados={data.prodSerie.map((p) => ({
                  rotulo: p.label,
                  valor: p.valor,
                }))}
                remountKey={periodo}
              />
            </SectionCard>

            <SectionCard title="Status por etapa">
              <HBarsChart
                cor="sequencia"
                larguraValor={26}
                linhas={data.funilPorEtapa.map((n, i) => ({
                  rotulo: nomes[i] ?? `Etapa ${i + 1}`,
                  valor: n,
                  texto: String(n),
                }))}
              />
            </SectionCard>

            <SectionCard title="Taxa de aprovação em ensaios">
              <DonutChart
                pct={data.aprovacaoPct}
                aprovados={data.nAprovados}
                reprovados={data.nReprovados}
              />
            </SectionCard>

            <SectionCard title="Tempo médio por checkpoint">
              <HBarsChart
                cor="bg-viz-2"
                larguraValor={44}
                linhas={data.tempoPorEtapa.map((t, i) => ({
                  rotulo: nomes[i] ?? `Etapa ${i + 1}`,
                  valor: t,
                  texto: `${t.toLocaleString("pt-BR", { minimumFractionDigits: 1 })} d`,
                }))}
              />
            </SectionCard>
          </div>
        </>
      )}
    </div>
  );
}
