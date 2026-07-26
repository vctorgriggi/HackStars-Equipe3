"use client";

// Detalhe do checkpoint: 2 cards. (1) nome + limiar (slider 50–100 com valor
// mono grande e legendas permissivo/rígido) + toggle de etapa ativa;
// (2) câmeras vinculadas (dot online, ✕ desvincula, chips tracejados para as
// livres) e campos validados (chip-toggles). O detalhe lê a MESMA query da
// lista (find por id) — sem segunda entrada de cache para divergir.

import Link from "next/link";
import { CAMPOS_INSCRICAO } from "@/lib/domain/types";
import {
  useCheckpoints,
  useLinkCamera,
  useUpdateCheckpoint,
} from "@/lib/data/use-checkpoints";
import { useCameras } from "@/lib/data/use-cameras";
import { ChipToggle } from "@/components/ui/chip-toggle";
import { EmptyState } from "@/components/ui/empty-state";
import { Icon } from "@/components/ui/icon";
import { SectionCard } from "@/components/ui/section-card";
import { Skeleton } from "@/components/ui/skeleton";
import { Slider } from "@/components/ui/slider";
import { ToggleSwitch } from "@/components/ui/toggle-switch";

export function DetalheCheckpoint({ id }: { id: string }) {
  const { data: checkpoints, isPending } = useCheckpoints();
  const { data: cameras = [] } = useCameras();
  const update = useUpdateCheckpoint();
  const link = useLinkCamera();

  if (isPending) {
    return (
      <div className="grid gap-4">
        <Skeleton className="h-6 w-48 rounded-md" />
        <Skeleton className="h-56 rounded-lg" />
        <Skeleton className="h-56 rounded-lg" />
      </div>
    );
  }

  const ck = checkpoints?.find((c) => c.id === id);
  if (!ck) {
    return (
      <EmptyState
        title="Checkpoint não encontrado"
        description="A etapa pode ter sido removida."
      />
    );
  }

  const usadas = new Set(
    (checkpoints ?? []).flatMap((c) => c.cameraIds),
  );
  const livres = cameras.filter((c) => !usadas.has(c.id));
  const onlinePorId = new Map(cameras.map((c) => [c.id, c.online]));

  return (
    <div className="grid gap-4">
      <Link
        href="/checkpoints"
        className="inline-flex w-fit items-center gap-1.5 text-sm text-text-3 hover:text-text-1"
      >
        <Icon name="chevron-left" size={15} /> Voltar para checkpoints
      </Link>

      <SectionCard title={`Etapa ${String(ck.ordem).padStart(2, "0")}`}>
        <div className="grid gap-5">
          <label className="grid gap-2">
            <span className="t-caps text-2xs text-text-3">Nome</span>
            <input
              value={ck.nome}
              onChange={(e) =>
                update.mutate({ id: ck.id, patch: { nome: e.target.value } })
              }
              className="h-12 rounded-md border border-line bg-surface-2 px-3 text-base text-text-1 outline-none focus-visible:[box-shadow:var(--ring-focus)]"
            />
          </label>

          <div className="grid gap-2">
            <div className="flex items-baseline justify-between">
              <span className="t-caps text-2xs text-text-3">
                Limiar de confiança
              </span>
              <span className="t-mono text-2xl font-bold text-text-1">
                {ck.limiar}%
              </span>
            </div>
            <Slider
              value={ck.limiar}
              onValueChange={(v) =>
                update.mutate({ id: ck.id, patch: { limiar: v } })
              }
              label={`Limiar de confiança de ${ck.nome}`}
            />
            <div className="flex justify-between text-2xs text-text-3">
              <span>50% · permissivo</span>
              <span>100% · rígido</span>
            </div>
          </div>

          <div className="flex items-center justify-between gap-3 border-t border-line pt-4">
            <div>
              <p className="text-sm font-medium text-text-1">Etapa ativa</p>
              <p className="text-xs text-text-3">
                Inativa: a esteira pula este checkpoint
              </p>
            </div>
            <ToggleSwitch
              checked={ck.ativo}
              onCheckedChange={(v) =>
                update.mutate({ id: ck.id, patch: { ativo: v } })
              }
              label="Etapa ativa"
            />
          </div>
        </div>
      </SectionCard>

      <SectionCard title="Câmeras e campos">
        <div className="grid gap-5">
          <div className="grid gap-2">
            <span className="t-caps text-2xs text-text-3">
              Câmeras vinculadas
            </span>
            {ck.cameraIds.length === 0 && livres.length === 0 && (
              <p className="text-sm text-text-3">
                Nenhuma câmera disponível — cadastre em Câmeras › Cadastro.
              </p>
            )}
            {ck.cameraIds.length > 0 && (
              <ul className="grid gap-1.5">
                {ck.cameraIds.map((camId) => (
                  <li
                    key={camId}
                    className="flex items-center gap-2.5 rounded-md border border-line bg-surface-2 px-3 py-2"
                  >
                    <span
                      aria-hidden
                      className="h-2 w-2 flex-none rounded-full"
                      style={{
                        background: onlinePorId.get(camId)
                          ? "var(--color-reading-success)"
                          : "var(--text-3)",
                      }}
                    />
                    <span className="t-mono flex-1 text-sm text-text-1">
                      {camId}
                    </span>
                    <button
                      type="button"
                      aria-label={`Desvincular ${camId}`}
                      onClick={() =>
                        link.mutate({ cameraId: camId, checkpointId: null })
                      }
                      className="flex h-8 w-8 items-center justify-center rounded-md text-text-3 hover:bg-surface-3 hover:text-text-1"
                    >
                      <Icon name="close" size={14} />
                    </button>
                  </li>
                ))}
              </ul>
            )}
            {livres.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {livres.map((cam) => (
                  <button
                    key={cam.id}
                    type="button"
                    onClick={() =>
                      link.mutate({ cameraId: cam.id, checkpointId: ck.id })
                    }
                    className="t-mono inline-flex min-h-9 items-center gap-1 rounded-[var(--radius-pill)] border border-dashed border-line-strong px-3 text-xs text-text-2 hover:bg-surface-2 focus-visible:outline-none focus-visible:[box-shadow:var(--ring-focus)]"
                  >
                    <Icon name="plus" size={12} /> {cam.id}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="grid gap-2 border-t border-line pt-4">
            <span className="t-caps text-2xs text-text-3">
              Campos validados
            </span>
            <div className="flex flex-wrap gap-2">
              {CAMPOS_INSCRICAO.map((campo) => {
                const on = ck.campos.includes(campo);
                return (
                  <ChipToggle
                    key={campo}
                    pressed={on}
                    onPressedChange={() =>
                      update.mutate({
                        id: ck.id,
                        patch: {
                          campos: on
                            ? ck.campos.filter((x) => x !== campo)
                            : [...ck.campos, campo],
                        },
                      })
                    }
                  >
                    {campo}
                  </ChipToggle>
                );
              })}
            </div>
          </div>
        </div>
      </SectionCard>
    </div>
  );
}
