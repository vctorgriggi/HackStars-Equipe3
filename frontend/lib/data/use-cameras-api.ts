"use client";

// Hooks react-query sobre a API REAL de câmeras: query + mutations do CRUD.
// Toda mutation invalida a lista — o estado renderizado vem sempre do
// servidor, nunca de um patch otimista de dado de domínio.

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type {
  AtualizarCameraPayload,
  CriarCameraPayload,
} from "@/lib/domain/camera-api";
import { keys } from "./keys";
import {
  atualizarCamera,
  criarCamera,
  excluirCamera,
  fetchCameras,
} from "./cameras-api";

export function useCamerasApi() {
  return useQuery({
    queryKey: keys.camerasApi.all,
    queryFn: fetchCameras,
  });
}

export function useCriarCamera() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: CriarCameraPayload) => criarCamera(payload),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: keys.camerasApi.all }),
  });
}

export function useAtualizarCamera() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      payload,
    }: {
      id: string;
      payload: AtualizarCameraPayload;
    }) => atualizarCamera(id, payload),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: keys.camerasApi.all }),
  });
}

export function useExcluirCamera() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => excluirCamera(id),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: keys.camerasApi.all }),
  });
}
