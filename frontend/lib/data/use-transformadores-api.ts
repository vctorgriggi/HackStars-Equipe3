"use client";

// Hooks react-query sobre a API REAL (listagem/detalhe de transformadores).
// Distintos dos hooks mock (use-transformadores) e com chaves próprias — as
// telas ainda não integradas (tempo-real, dashboard) seguem no mock sem
// colisão de cache.

import { useQuery } from "@tanstack/react-query";
import { keys } from "./keys";
import {
  fetchConferencias,
  fetchEtapasLinha,
  fetchPassagens,
  fetchTransformadores,
  fetchTransformadorPorSerie,
} from "./transformadores-api";

export function useTransformadoresApi() {
  return useQuery({
    queryKey: keys.transformadoresApi.all,
    queryFn: fetchTransformadores,
  });
}

export function useTransformadorPorSerie(serie: string) {
  return useQuery({
    queryKey: keys.transformadoresApi.porSerie(serie),
    queryFn: () => fetchTransformadorPorSerie(serie),
  });
}

/** Encadeia após a série resolver o id (`enabled`) — nunca chama com id vazio. */
export function usePassagens(transformadorId: string | undefined) {
  return useQuery({
    queryKey: keys.transformadoresApi.passagens(transformadorId ?? ""),
    queryFn: () => fetchPassagens(transformadorId!),
    enabled: !!transformadorId,
  });
}

export function useConferencias(transformadorId: string | undefined) {
  return useQuery({
    queryKey: keys.transformadoresApi.conferencias(transformadorId ?? ""),
    queryFn: () => fetchConferencias(transformadorId!),
    enabled: !!transformadorId,
  });
}

/** Etapas reais da linha (seed do backend), ordenadas. */
export function useEtapasLinha() {
  return useQuery({
    queryKey: keys.etapasLinha.all,
    queryFn: fetchEtapasLinha,
  });
}
