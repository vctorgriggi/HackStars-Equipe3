// Fetchers da API REAL de câmeras (via handlers BFF /api/cameras). Único
// recurso com escrita nesta rodada: o cadastro de câmera é dado de
// provisionamento (mesmo status aberto do CRUD de checkpoints no backend).

import type {
  AtualizarCameraPayload,
  CameraApi,
  CriarCameraPayload,
} from "@/lib/domain/camera-api";
import { fetchJson } from "./http";
import { buscarTodasAsPaginas } from "./paginacao";

export function fetchCameras(): Promise<CameraApi[]> {
  return buscarTodasAsPaginas<CameraApi>("/api/cameras");
}

export function criarCamera(payload: CriarCameraPayload): Promise<CameraApi> {
  return fetchJson<CameraApi>("/api/cameras", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
}

export function atualizarCamera(
  id: string,
  payload: AtualizarCameraPayload,
): Promise<CameraApi> {
  return fetchJson<CameraApi>(`/api/cameras/${encodeURIComponent(id)}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
}

/** DELETE responde sem corpo (CRUD gerado) — fetchJson devolve undefined. */
export function excluirCamera(id: string): Promise<void> {
  return fetchJson<void>(`/api/cameras/${encodeURIComponent(id)}`, {
    method: "DELETE",
  });
}
