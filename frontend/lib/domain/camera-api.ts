// Espelho manual de `Camera` (backend, cameras/domain/camera.ts) e dos DTOs
// de escrita do CRUD. A câmera é dado de PROVISIONAMENTO: vínculo a um gate
// (checkpoint) + a vista que o ponto de captura enxerga; os feeds de vídeo
// seguem simulados nesta rodada.

import type { EtapaLinhaApi } from "./transformador-api";

/** Vistas canônicas da peça — fonte única no backend:
 *  extracao/ports/extractor.port.ts (união literal `FonteFisica`). */
export const FONTES_FISICAS_API = [
  "base",
  "topo",
  "frente",
  "traseira",
  "lateral-esquerda",
  "lateral-direita",
  "placa",
  "etiqueta",
  "geral",
] as const;

export type FonteFisicaApi = (typeof FONTES_FISICAS_API)[number];

export interface CameraApi {
  id: string;
  /** Rótulo de provisionamento (ex.: CAM-01). */
  nome: string;
  /** Vista da peça que a câmera enxerga (whitelist canônica). */
  fonteFisica: string;
  /** Estado administrativo do cadastro — não mede "online". */
  ativa: boolean;
  /** Endereço do stream (ex.: RTSP); dado administrativo. */
  endpoint: string | null;
  /** Gate onde a câmera está instalada; null = sem vínculo.
   *  Agrupar sempre pelo `codigo` (estável), nunca por nome/ordem. */
  checkpoint: EtapaLinhaApi | null;
  createdAt: string;
  updatedAt: string;
}

/** Corpo de POST /api/cameras (CreateCameraDto): a referência de checkpoint
 *  viaja como `{ id }`. */
export interface CriarCameraPayload {
  nome: string;
  fonteFisica: FonteFisicaApi;
  ativa: boolean;
  endpoint?: string | null;
  checkpoint?: { id: string } | null;
}

/** Corpo de PATCH /api/cameras/:id — parcial; `checkpoint: null` remove o
 *  vínculo. */
export type AtualizarCameraPayload = Partial<CriarCameraPayload>;
