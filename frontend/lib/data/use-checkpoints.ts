"use client";

// Checkpoints são o dado mais compartilhado do app (mapa, funil, filtros,
// timeline, câmeras). NÃO existe query por id: o detalhe faz
// useCheckpoints().data?.find() — segunda entrada de cache só cria chance de
// divergência durante edição.

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { Checkpoint } from "@/lib/domain/types";
import * as api from "./api";
import { keys } from "./keys";

export function useCheckpoints() {
  return useQuery({
    queryKey: keys.checkpoints.all,
    queryFn: api.getCheckpoints,
  });
}

type CheckpointPatch = Partial<
  Pick<Checkpoint, "nome" | "limiar" | "ativo" | "campos">
>;

export function useUpdateCheckpoint() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: CheckpointPatch }) =>
      api.updateCheckpoint(id, patch),
    onMutate: async ({ id, patch }) => {
      await qc.cancelQueries({ queryKey: keys.checkpoints.all });
      const prev = qc.getQueryData<Checkpoint[]>(keys.checkpoints.all);
      qc.setQueryData<Checkpoint[]>(keys.checkpoints.all, (old) =>
        old?.map((c) => (c.id === id ? { ...c, ...patch } : c)),
      );
      return { prev };
    },
    onError: (_e, _v, ctx) => {
      if (ctx?.prev) qc.setQueryData(keys.checkpoints.all, ctx.prev);
    },
    onSettled: () => qc.invalidateQueries({ queryKey: keys.checkpoints.all }),
  });
}

export function useCreateCheckpoint() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: api.createCheckpoint,
    onSettled: () => qc.invalidateQueries({ queryKey: keys.checkpoints.all }),
  });
}

/** Vincular câmera a checkpoint (null = desvincular). Otimista: remove do
 *  anterior e adiciona ao novo no MESMO update — a regra "máx. 1 checkpoint"
 *  nunca aparece violada na tela. */
export function useLinkCamera() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      cameraId,
      checkpointId,
    }: {
      cameraId: string;
      checkpointId: string | null;
    }) => api.linkCamera(cameraId, checkpointId),
    onMutate: async ({ cameraId, checkpointId }) => {
      await qc.cancelQueries({ queryKey: keys.checkpoints.all });
      const prev = qc.getQueryData<Checkpoint[]>(keys.checkpoints.all);
      qc.setQueryData<Checkpoint[]>(keys.checkpoints.all, (old) =>
        old?.map((c) => ({
          ...c,
          cameraIds: c.cameraIds
            .filter((x) => x !== cameraId)
            .concat(c.id === checkpointId ? [cameraId] : []),
        })),
      );
      return { prev };
    },
    onError: (_e, _v, ctx) => {
      if (ctx?.prev) qc.setQueryData(keys.checkpoints.all, ctx.prev);
    },
    onSettled: () => qc.invalidateQueries({ queryKey: keys.checkpoints.all }),
  });
}
