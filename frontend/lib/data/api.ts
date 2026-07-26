// A COSTURA entre o app e os dados de domínio MOCK. Já saíram daqui, todos
// via BFF (2026-07-26): TRANSFORMADORES (./transformadores-api.ts), a
// esteira de TEMPO REAL (Socket.IO + snapshot; driver em
// components/chrome/realtime-socket-driver.tsx), CLIENTES, PROJETOS, a
// página de CÂMERAS (./cameras-api.ts), LOTES (./lotes-api.ts) e o
// DASHBOARD + banner de alertas (./use-indicadores-api.ts +
// ./use-esteira-api.ts). O que resta (checkpoints editáveis, câmeras do
// detalhe de checkpoint, notificações/config) continua mock porque o
// backend não os tem nesta rodada. Regras estruturais:
//  - nenhum acessor devolve NOME de etapa — sempre índice/checkpointId
//    (nome é join no render via useCheckpoints);
//  - filtro de listagem NÃO é parâmetro (a page filtra em useMemo) até a
//    listagem virar endpoint paginado;
//  - o vínculo câmera↔checkpoint só existe em Checkpoint.cameraIds.

import type {
  Camera,
  Checkpoint,
  ConfigNotificacoes,
  Notificacao,
  Projeto,
} from "@/lib/domain/types";
import { delay } from "@/lib/mock/latency";
import { CLIENTES_SEED } from "@/lib/mock/seed/clientes";
import { PROJETOS_SEED } from "@/lib/mock/seed/projetos";
import { getMockState, persistMockState } from "@/lib/mock/store";

// ---- listagens imutáveis (seed puro) ----

export async function getClientes() {
  await delay();
  return CLIENTES_SEED;
}

export async function getProjetos(): Promise<Projeto[]> {
  await delay();
  return PROJETOS_SEED;
}

// ---- checkpoints (mutável) ----

export async function getCheckpoints(): Promise<Checkpoint[]> {
  await delay();
  return [...getMockState().checkpoints];
}

export async function updateCheckpoint(
  id: string,
  patch: Partial<Pick<Checkpoint, "nome" | "limiar" | "ativo" | "campos">>,
): Promise<Checkpoint> {
  await delay();
  const s = getMockState();
  const i = s.checkpoints.findIndex((c) => c.id === id);
  if (i < 0) throw new Error(`checkpoint-inexistente: ${id}`);
  s.checkpoints[i] = { ...s.checkpoints[i], ...patch };
  persistMockState();
  return s.checkpoints[i];
}

export async function createCheckpoint(): Promise<Checkpoint> {
  await delay();
  const s = getMockState();
  const ordem = s.checkpoints.length + 1;
  const novo: Checkpoint = {
    id: `cp-${Date.now()}`,
    ordem,
    nome: `Nova etapa ${ordem}`,
    cameraIds: [],
    campos: [],
    limiar: 90,
    ativo: true,
  };
  s.checkpoints = [...s.checkpoints, novo];
  persistMockState();
  return novo;
}

// ---- câmeras (mutável) ----

export async function getCameras(): Promise<Camera[]> {
  await delay();
  return [...getMockState().cameras];
}

export async function createCamera(): Promise<Camera> {
  await delay();
  const s = getMockState();
  let n = 1;
  while (s.cameras.some((c) => c.id === `CAM-${String(n).padStart(2, "0")}`))
    n++;
  const num = String(n).padStart(2, "0");
  const nova: Camera = {
    id: `CAM-${num}`,
    endpoint: `rtsp://linha-1.trael/cam-${num}`,
    online: false,
  };
  s.cameras = [...s.cameras, nova];
  persistMockState();
  return nova;
}

/** Vincular remove o vínculo anterior ATOMICAMENTE (regra do handoff:
 *  câmera pertence a no máx. 1 checkpoint). checkpointId null = desvincula. */
export async function linkCamera(
  cameraId: string,
  checkpointId: string | null,
): Promise<Checkpoint[]> {
  await delay();
  const s = getMockState();
  s.checkpoints = s.checkpoints.map((c) => ({
    ...c,
    cameraIds: c.cameraIds
      .filter((x) => x !== cameraId)
      .concat(c.id === checkpointId ? [cameraId] : []),
  }));
  persistMockState();
  return [...s.checkpoints];
}

// ---- notificações / config (mutável) ----

export async function getNotificacoes(): Promise<Notificacao[]> {
  await delay();
  return [...getMockState().notificacoes];
}

export async function markAllNotificacoesRead(): Promise<Notificacao[]> {
  await delay();
  const s = getMockState();
  s.notificacoes = s.notificacoes.map((n) => ({ ...n, lida: true }));
  persistMockState();
  return [...s.notificacoes];
}

export async function getConfigNotificacoes(): Promise<ConfigNotificacoes> {
  await delay();
  return { ...getMockState().config };
}

export async function setConfigNotificacao(
  key: keyof ConfigNotificacoes,
  value: boolean,
): Promise<ConfigNotificacoes> {
  await delay();
  const s = getMockState();
  s.config = { ...s.config, [key]: value };
  persistMockState();
  return { ...s.config };
}
