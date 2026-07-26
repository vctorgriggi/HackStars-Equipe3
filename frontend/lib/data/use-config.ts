"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { ConfigNotificacoes } from "@/lib/domain/types";
import * as api from "./api";
import { keys } from "./keys";

export function useConfigNotificacoes() {
  return useQuery({
    queryKey: keys.config.all,
    queryFn: api.getConfigNotificacoes,
  });
}

export function useSetConfigNotificacao() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      key,
      value,
    }: {
      key: keyof ConfigNotificacoes;
      value: boolean;
    }) => api.setConfigNotificacao(key, value),
    onMutate: async ({ key, value }) => {
      await qc.cancelQueries({ queryKey: keys.config.all });
      const prev = qc.getQueryData<ConfigNotificacoes>(keys.config.all);
      qc.setQueryData<ConfigNotificacoes>(keys.config.all, (old) =>
        old ? { ...old, [key]: value } : old,
      );
      return { prev };
    },
    onError: (_e, _v, ctx) => {
      if (ctx?.prev) qc.setQueryData(keys.config.all, ctx.prev);
    },
    onSettled: () => qc.invalidateQueries({ queryKey: keys.config.all }),
  });
}
