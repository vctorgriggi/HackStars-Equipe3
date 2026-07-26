"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { Notificacao } from "@/lib/domain/types";
import * as api from "./api";
import { keys } from "./keys";

export function useNotificacoes() {
  return useQuery({
    queryKey: keys.notificacoes.all,
    queryFn: api.getNotificacoes,
  });
}

export function useMarkAllRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: api.markAllNotificacoesRead,
    // Otimista: o badge zera antes do acessor resolver.
    onMutate: async () => {
      await qc.cancelQueries({ queryKey: keys.notificacoes.all });
      const prev = qc.getQueryData<Notificacao[]>(keys.notificacoes.all);
      qc.setQueryData<Notificacao[]>(keys.notificacoes.all, (old) =>
        old?.map((n) => ({ ...n, lida: true })),
      );
      return { prev };
    },
    onError: (_e, _v, ctx) => {
      if (ctx?.prev) qc.setQueryData(keys.notificacoes.all, ctx.prev);
    },
    onSettled: () => qc.invalidateQueries({ queryKey: keys.notificacoes.all }),
  });
}
