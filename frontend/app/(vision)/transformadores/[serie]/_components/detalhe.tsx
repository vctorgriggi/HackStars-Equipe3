"use client";

// Detalhe do transformador: card de info + timeline de 6 etapas com cartão
// de evidência nas etapas com conferência visual (protótipo: i 0 e 3).

import Image from "next/image";
import Link from "next/link";
import { fmtKva, READING_LABELS, READING_VAR } from "@/lib/domain/status";
import {
  useTimeline,
  useTransformador,
} from "@/lib/data/use-transformadores";
import { useCheckpoints } from "@/lib/data/use-checkpoints";
import { Icon } from "@/components/ui/icon";
import { NeutralChip, StatusChip } from "@/components/ui/chip";
import { ProgressBar } from "@/components/ui/progress-bar";
import { SectionCard } from "@/components/ui/section-card";
import { Skeleton } from "@/components/ui/skeleton";
import { TimelineItem } from "@/components/ui/timeline-item";
import { EmptyState } from "@/components/ui/empty-state";
import fotoTransformador from "@/public/transformador.png";

function EvidenciaCard({ serie, kva }: { serie: string; kva: string }) {
  return (
    <div className="mt-2 flex flex-wrap items-center gap-3 rounded-md border border-line bg-surface-2 px-3 py-2">
      <div className="flex h-[60px] w-[84px] flex-none items-center justify-center overflow-hidden rounded-sm bg-surface-inset">
        <Image
          src={fotoTransformador}
          alt={`Foto de evidência de ${serie}`}
          className="h-[52px] w-auto"
        />
      </div>
      <div className="grid min-w-0 gap-1">
        <span className="t-caps text-2xs text-text-3">
          Inscrições conferidas
        </span>
        <div className="flex flex-wrap gap-2">
          <NeutralChip>
            <span className="t-mono">{serie}</span>
          </NeutralChip>
          <NeutralChip>
            <span className="t-mono">{kva} kVA</span>
          </NeutralChip>
          <StatusChip status="success" label="Leitura confirmada" />
        </div>
      </div>
    </div>
  );
}

export function DetalheTransformador({ serie }: { serie: string }) {
  const { data: transformador, isPending } = useTransformador(serie);
  const { data: timeline = [] } = useTimeline(serie);
  const { data: checkpoints = [] } = useCheckpoints();
  const nomes = checkpoints.map((c) => c.nome);

  if (isPending) {
    return (
      <div className="grid gap-4">
        <Skeleton className="h-6 w-56 rounded-md" />
        <div className="flex flex-wrap gap-4">
          <Skeleton className="h-64 min-w-[260px] flex-1 rounded-lg" />
          <Skeleton className="h-64 min-w-[280px] flex-[2] rounded-lg" />
        </div>
      </div>
    );
  }

  if (!transformador) {
    return (
      <EmptyState
        title="Transformador não encontrado"
        description={`Nenhuma unidade com a série ${serie}.`}
      />
    );
  }

  const t = transformador;
  const progresso = Math.round(
    ((t.etapaIndex + (t.status === "success" ? 1 : 0)) / 6) * 100,
  );

  return (
    <div className="grid gap-4">
      <Link
        href="/transformadores"
        className="inline-flex w-fit items-center gap-1.5 text-sm text-text-3 hover:text-text-1"
      >
        <Icon name="chevron-left" size={15} /> Voltar para transformadores
      </Link>

      <div className="flex flex-wrap items-start gap-4">
        {/* info */}
        <SectionCard className="min-w-[260px] flex-[1_1_260px]">
          <div className="mb-4 flex items-center justify-between gap-2">
            <span className="t-mono text-2xl font-bold">{t.serie}</span>
            <StatusChip status={t.status} />
          </div>
          <dl className="grid gap-3">
            {(
              [
                ["Cliente", t.clienteNome],
                ["Potência", `${fmtKva(t.kva)} kVA`],
                ["Etapa atual", nomes[t.etapaIndex] ?? "—"],
                ["Entrega prevista", t.entregaPrevista],
              ] as const
            ).map(([label, valor]) => (
              <div key={label} className="flex items-baseline justify-between gap-3">
                <dt className="t-caps text-2xs text-text-3">{label}</dt>
                <dd className="text-sm text-text-1">{valor}</dd>
              </div>
            ))}
          </dl>
          <div className="mt-4 grid gap-1.5">
            <div className="flex items-baseline justify-between">
              <span className="t-caps text-2xs text-text-3">Progresso</span>
              <span className="t-mono text-xs text-text-2">
                {t.etapaIndex + (t.status === "success" ? 1 : 0)}/6
              </span>
            </div>
            <ProgressBar
              value={progresso}
              label={`Progresso de ${t.serie} na linha`}
            />
          </div>
        </SectionCard>

        {/* timeline */}
        <SectionCard
          title="Linha do tempo"
          className="min-w-[280px] flex-[2_1_380px]"
        >
          <div className="grid">
            {timeline.map((etapa, i) => {
              const chip =
                etapa.estado === "concluida" ? (
                  <StatusChip status="success" label="Concluído" />
                ) : etapa.estado === "atual" && etapa.statusAtual ? (
                  <StatusChip
                    status={etapa.statusAtual}
                    label={READING_LABELS[etapa.statusAtual]}
                  />
                ) : (
                  <NeutralChip>Previsto</NeutralChip>
                );
              const apagada = etapa.estado === "prevista";
              return (
                <TimelineItem
                  key={etapa.stageIndex}
                  estado={etapa.estado}
                  corAtual={
                    etapa.statusAtual
                      ? READING_VAR[etapa.statusAtual]
                      : undefined
                  }
                  ultimo={i === timeline.length - 1}
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className={`text-sm font-semibold ${apagada ? "text-text-3" : "text-text-1"}`}
                    >
                      {nomes[etapa.stageIndex] ?? `Etapa ${etapa.stageIndex + 1}`}
                    </span>
                    {chip}
                    <span className="t-mono ml-auto text-xs text-text-3">
                      {etapa.data}
                    </span>
                  </div>
                  <p className="mt-1 text-sm text-text-3">{etapa.descricao}</p>
                  {etapa.temFoto && (
                    <EvidenciaCard serie={t.serie} kva={fmtKva(t.kva)} />
                  )}
                </TimelineItem>
              );
            })}
          </div>
        </SectionCard>
      </div>
    </div>
  );
}
