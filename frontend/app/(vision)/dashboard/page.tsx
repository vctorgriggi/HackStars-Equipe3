"use client";

// Dashboard com dados REAIS: GET /conferencias/indicadores (totais, por
// etapa, por campo) + snapshot da esteira (ocupação). Nada é derivado aqui
// além de razão de contagens que a API entregou prontas — rotulada como
// "conferências com veredito", nunca "peças aprovadas" (gap 14). Toda linha
// de gráfico nasce do OBJETO da API — join por índice é proibido.

import { useEsteiraSnapshot } from "@/lib/data/use-esteira-api";
import { useIndicadoresApi } from "@/lib/data/use-indicadores-api";
import { VEREDITO_LABELS } from "@/lib/domain/transformador-api";
import { DonutChart } from "@/components/charts/donut-chart";
import { HBarsChart } from "@/components/charts/hbars-chart";
import { EmptyState } from "@/components/ui/empty-state";
import { KpiCard } from "@/components/ui/kpi-card";
import { SectionCard } from "@/components/ui/section-card";
import { SkeletonCharts, SkeletonKpis } from "@/components/ui/skeleton";
import { AlertasTransformadores } from "@/components/vision/alertas-transformadores";

const fmtInt = (n: number) => n.toLocaleString("pt-BR");

function SemConferencias() {
  return (
    <p className="flex flex-1 items-center justify-center py-8 text-sm text-text-3">
      Nenhuma conferência com veredito ainda
    </p>
  );
}

export default function DashboardPage() {
  const {
    data: indicadores,
    isPending: indicadoresPending,
    isError: indicadoresError,
    refetch: refetchIndicadores,
  } = useIndicadoresApi();
  const {
    data: esteira,
    isPending: esteiraPending,
    isError: esteiraError,
    refetch: refetchEsteira,
  } = useEsteiraSnapshot();

  if (indicadoresError || esteiraError) {
    return (
      <div className="grid gap-4">
        <EmptyState
          title="Não foi possível carregar os indicadores"
          description="A API não respondeu. Verifique a conexão e tente de novo."
          action={{
            label: "Tentar novamente",
            onClick: () => {
              void refetchIndicadores();
              void refetchEsteira();
            },
          }}
        />
      </div>
    );
  }

  if (indicadoresPending || esteiraPending || !indicadores || !esteira) {
    return (
      <div className="grid gap-4">
        <SkeletonKpis />
        <SkeletonCharts />
      </div>
    );
  }

  const { totais, porEtapa, porCampo } = indicadores;
  // Denominador honesto: só conferências COM veredito — linha crua do CRUD
  // não entra (a soma dos 3 pode ser menor que totais.conferencias).
  const avaliadas = totais.divergentes + totais.naoConferiveis + totais.conformes;
  const conformidadePct =
    avaliadas > 0 ? (totais.conformes / avaliadas) * 100 : null;

  return (
    <div className="grid gap-4">
      <AlertasTransformadores />

      <div className="grid grid-cols-[repeat(auto-fit,minmax(150px,1fr))] gap-3">
        <KpiCard label="Na linha agora" valor={fmtInt(esteira.totalNaLinha)} />
        <KpiCard label="Peças cadastradas" valor={fmtInt(totais.pecas)} />
        <KpiCard
          label="Conformidade · conferências"
          valor={
            conformidadePct === null
              ? "—"
              : `${conformidadePct.toLocaleString("pt-BR", {
                  minimumFractionDigits: 1,
                  maximumFractionDigits: 1,
                })}%`
          }
          sub={`${fmtInt(avaliadas)} conferências com veredito`}
        />
        <KpiCard
          label="Divergentes"
          valor={fmtInt(totais.divergentes)}
          valorCor={
            totais.divergentes > 0
              ? "var(--color-reading-mismatch)"
              : undefined
          }
        />
      </div>

      <div className="grid grid-cols-[repeat(auto-fit,minmax(290px,1fr))] gap-3">
        <SectionCard title="Ocupação da esteira">
          <HBarsChart
            cor="sequencia"
            larguraValor={26}
            linhas={esteira.checkpoints.map((c) => ({
              rotulo: c.nome,
              valor: c.total,
              texto: fmtInt(c.total),
            }))}
          />
        </SectionCard>

        <SectionCard title="Divergências por etapa">
          {porEtapa.length === 0 ? (
            <SemConferencias />
          ) : (
            <HBarsChart
              cor="bg-viz-2"
              larguraValor={26}
              linhas={porEtapa.map((g) => ({
                // `etapa: null` = conferência da peça inteira (sem gate);
                // a API já o manda por último.
                rotulo: g.etapa?.nome ?? "Peça inteira",
                valor: g.divergentes,
                texto: fmtInt(g.divergentes),
              }))}
            />
          )}
        </SectionCard>

        <SectionCard title="Divergências por campo">
          {porCampo.length === 0 ? (
            <SemConferencias />
          ) : (
            // A ordem da API é contrato (divergentes desc) — o topo é onde
            // investigar primeiro; o front não reordena.
            <HBarsChart
              cor="bg-viz-4"
              larguraValor={26}
              linhas={porCampo.slice(0, 6).map((c) => ({
                rotulo: c.campo,
                valor: c.divergentes,
                texto: fmtInt(c.divergentes),
              }))}
            />
          )}
        </SectionCard>

        <SectionCard title="Conformidade das conferências">
          {conformidadePct === null ? (
            <SemConferencias />
          ) : (
            <DonutChart
              pct={conformidadePct}
              ariaLabel="Conformidade das conferências com veredito"
              rotuloCentro="conformes"
              legenda={[
                {
                  corClasse: "bg-reading-success",
                  label: VEREDITO_LABELS.conforme,
                  valor: fmtInt(totais.conformes),
                },
                {
                  corClasse: "bg-reading-mismatch",
                  label: VEREDITO_LABELS.divergente,
                  valor: fmtInt(totais.divergentes),
                },
                {
                  corClasse: "bg-reading-lowconf",
                  label: VEREDITO_LABELS.nao_conferivel,
                  valor: fmtInt(totais.naoConferiveis),
                },
              ]}
            />
          )}
        </SectionCard>
      </div>
    </div>
  );
}
