"use client";

// Detalhe do transformador — API REAL. A peça resolve pela CHAVE DE NEGÓCIO
// (?numeroSerie=, nunca GET /:id — que devolve 200 vazio p/ id inexistente);
// passagens e conferências encadeiam no id resolvido. Nome de etapa vem
// SEMPRE embutido da API (as etapas do mock não existem no banco), e nenhum
// veredito é derivado aqui — o chip mostra o que a engine gravou.
//
// Evolução anotada: GET /conferencias/{id}/campos devolve o veredito campo a
// campo com foto-evidência (URL assinada, expira em 1h — não guardar).

import Link from "next/link";
import {
  useConferencias,
  useEtapasLinha,
  usePassagens,
  useTransformadorPorSerie,
} from "@/lib/data/use-transformadores-api";
import type { PassagemResumoApi } from "@/lib/domain/transformador-api";
import { Icon } from "@/components/ui/icon";
import { NeutralChip, StatusChip } from "@/components/ui/chip";
import { VereditoChip } from "@/components/vision/veredito-chip";
import { ProgressBar } from "@/components/ui/progress-bar";
import { SectionCard } from "@/components/ui/section-card";
import { Skeleton } from "@/components/ui/skeleton";
import { TimelineItem } from "@/components/ui/timeline-item";
import { EmptyState } from "@/components/ui/empty-state";

function fmtDataHora(iso: string): string {
  const data = new Date(iso);
  const dia = data.toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "short",
  });
  const hora = data.toLocaleTimeString("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
  });
  return `${dia} · ${hora}`;
}

export function DetalheTransformador({ serie }: { serie: string }) {
  const {
    data: transformador,
    isPending,
    isError,
    refetch,
  } = useTransformadorPorSerie(serie);
  const { data: etapas = [] } = useEtapasLinha();
  const { data: passagens = [] } = usePassagens(transformador?.id);
  const { data: conferencias = [] } = useConferencias(transformador?.id);

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

  if (isError) {
    return (
      <EmptyState
        title="Não foi possível carregar a peça"
        description="A API não respondeu. Verifique a conexão e tente de novo."
        action={{ label: "Tentar novamente", onClick: () => void refetch() }}
      />
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
  const ordemAtual = t.etapaAtual?.checkpoint.ordem ?? 0;
  const progresso =
    etapas.length > 0 ? Math.round((ordemAtual / etapas.length) * 100) : 0;

  // Passagens por etapa (código estável) para datas/observações da timeline.
  const passagensPorEtapa = new Map<string, PassagemResumoApi[]>();
  for (const passagem of passagens) {
    const doGrupo = passagensPorEtapa.get(passagem.checkpoint.codigo) ?? [];
    doGrupo.push(passagem);
    passagensPorEtapa.set(passagem.checkpoint.codigo, doGrupo);
  }

  const infoLinhas: [string, string][] = [
    ["Cliente", t.cliente || "—"],
    ["Patrimônio", t.patrimonio],
    ["Pedido", t.pedido ?? "—"],
    ...(t.seq ? ([["Seq", t.seq]] as [string, string][]) : []),
    ...(t.descricao
      ? ([["Descrição", t.descricao]] as [string, string][])
      : []),
    ["Modelo", t.projetoModelo?.codigo ?? "—"],
    ["Etapa atual", t.etapaAtual?.checkpoint.nome ?? "—"],
  ];

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
            <span className="t-mono text-2xl font-bold">{t.numeroSerie}</span>
            <VereditoChip
              veredito={t.vereditoVigente?.vereditoGeral ?? null}
            />
          </div>
          {t.vereditoVigente?.checkpoint && (
            // Gate parcial: conforme deste veredito não atesta a peça inteira
            // (gap 14) — a etapa acompanha o chip.
            <p className="mb-3 text-xs text-text-3">
              Veredito do gate {t.vereditoVigente.checkpoint.nome}, em{" "}
              {fmtDataHora(t.vereditoVigente.createdAt)}.
            </p>
          )}
          <dl className="grid gap-3">
            {infoLinhas.map(([label, valor]) => (
              <div
                key={label}
                className="flex items-baseline justify-between gap-3"
              >
                <dt className="t-caps text-2xs text-text-3">{label}</dt>
                <dd className="text-sm text-text-1">{valor}</dd>
              </div>
            ))}
          </dl>
          <div className="mt-4 grid gap-1.5">
            <div className="flex items-baseline justify-between">
              <span className="t-caps text-2xs text-text-3">Progresso</span>
              <span className="t-mono text-xs text-text-2">
                {ordemAtual}/{etapas.length || "—"}
              </span>
            </div>
            <ProgressBar
              value={progresso}
              label={`Progresso de ${t.numeroSerie} na linha`}
            />
          </div>
        </SectionCard>

        {/* timeline de trânsito */}
        <SectionCard
          title="Linha do tempo"
          className="min-w-[280px] flex-[2_1_380px]"
        >
          {etapas.length === 0 ? (
            <p className="text-sm text-text-3">
              Etapas da linha indisponíveis no momento.
            </p>
          ) : (
            <div className="grid">
              {etapas.map((etapa, i) => {
                const estado =
                  etapa.ordem < ordemAtual
                    ? ("concluida" as const)
                    : etapa.ordem === ordemAtual
                      ? ("atual" as const)
                      : ("prevista" as const);
                const daEtapa = passagensPorEtapa.get(etapa.codigo) ?? [];
                const ultima = daEtapa[daEtapa.length - 1];
                const chip =
                  estado === "concluida" ? (
                    <StatusChip status="success" label="Concluído" />
                  ) : estado === "atual" ? (
                    <NeutralChip>Etapa atual</NeutralChip>
                  ) : (
                    <NeutralChip>Previsto</NeutralChip>
                  );
                return (
                  <TimelineItem
                    key={etapa.codigo}
                    estado={estado}
                    ultimo={i === etapas.length - 1}
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className={`text-sm font-semibold ${estado === "prevista" ? "text-text-3" : "text-text-1"}`}
                      >
                        {etapa.nome}
                      </span>
                      {chip}
                      {daEtapa.length > 1 && (
                        <NeutralChip>{daEtapa.length} scans</NeutralChip>
                      )}
                      <span className="t-mono ml-auto text-xs text-text-3">
                        {ultima ? fmtDataHora(ultima.createdAt) : "—"}
                      </span>
                    </div>
                    {ultima?.observacao && (
                      <p className="mt-1 text-sm text-text-3">
                        {ultima.observacao}
                      </p>
                    )}
                  </TimelineItem>
                );
              })}
            </div>
          )}
        </SectionCard>
      </div>

      {/* histórico de conferências */}
      <SectionCard title="Conferências">
        {conferencias.length === 0 ? (
          <p className="text-sm text-text-3">
            Nenhuma conferência registrada para esta peça.
          </p>
        ) : (
          <ul className="grid gap-2">
            {conferencias.map((conferencia) => (
              <li
                key={conferencia.id}
                className="flex flex-wrap items-center gap-2 rounded-md border border-line bg-surface-2 px-3 py-2"
              >
                <VereditoChip veredito={conferencia.vereditoGeral} />
                <span className="text-sm text-text-2">
                  {conferencia.checkpoint?.nome ?? "Checklist completa"}
                </span>
                <span className="t-mono ml-auto text-xs text-text-3">
                  {fmtDataHora(conferencia.createdAt)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </SectionCard>
    </div>
  );
}
