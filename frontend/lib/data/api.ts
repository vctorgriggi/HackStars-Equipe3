// A COSTURA entre o app e os dados de domínio MOCK. TRANSFORMADORES REAIS
// migraram para ./transformadores-api.ts (listagem/detalhe integrados à API
// NestJS via BFF, 2026-07-26) — os acessores de transformador daqui seguem
// vivos SÓ para as telas ainda mockadas (tempo-real, dashboard, alertas);
// não os use em tela nova. O restante (Lote/Projeto/Câmera/KPIs/WS) continua
// mock porque o backend não os tem nesta rodada. Regras estruturais:
//  - nenhum acessor devolve NOME de etapa — sempre índice/checkpointId
//    (nome é join no render via useCheckpoints);
//  - filtro de listagem NÃO é parâmetro (a page filtra em useMemo) até a
//    listagem virar endpoint paginado;
//  - o vínculo câmera↔checkpoint só existe em Checkpoint.cameraIds.

import type {
  Camera,
  Checkpoint,
  ConfigNotificacoes,
  DashboardData,
  EtapaTimeline,
  Lote,
  Notificacao,
  PeriodoDashboard,
  Projeto,
  Transformador,
} from "@/lib/domain/types";
import { delay } from "@/lib/mock/latency";
import {
  DESC_ATUAL,
  DESC_OK,
  HORAS_TL,
  PERIODOS_SEED,
  TEMPOS_POR_ETAPA,
} from "@/lib/mock/seed/dashboard";
import { CLIENTES_SEED } from "@/lib/mock/seed/clientes";
import { LOTES_SEED } from "@/lib/mock/seed/lotes";
import { PROJETOS_SEED } from "@/lib/mock/seed/projetos";
import { TRANSFORMADORES_SEED } from "@/lib/mock/seed/transformadores";
import { getMockState, persistMockState } from "@/lib/mock/store";

// ---- listagens imutáveis (seed puro) ----

export async function getTransformadores(): Promise<Transformador[]> {
  await delay();
  return TRANSFORMADORES_SEED;
}

export async function getTransformador(
  serie: string,
): Promise<Transformador | null> {
  await delay();
  return TRANSFORMADORES_SEED.find((t) => t.serie === serie) ?? null;
}

export async function getClientes() {
  await delay();
  return CLIENTES_SEED;
}

export async function getLotes(): Promise<Lote[]> {
  await delay();
  return LOTES_SEED;
}

export async function getProjetos(): Promise<Projeto[]> {
  await delay();
  return PROJETOS_SEED;
}

/** Timeline do detalhe (lógica detTimeline do protótipo, linhas 1104–1132),
 *  sem nomes de etapa. Datas derivadas ficam estáveis por render. */
export async function getTimeline(serie: string): Promise<EtapaTimeline[]> {
  await delay();
  const t = TRANSFORMADORES_SEED.find((x) => x.serie === serie);
  if (!t) return [];
  const agora = Date.now();
  const fmtDia = (d: Date) =>
    d
      .toLocaleDateString("pt-BR", { day: "2-digit", month: "short" })
      .replace(".", "");
  return TEMPOS_POR_ETAPA.map((_, i) => {
    const feita = i < t.etapaIndex || (i === t.etapaIndex && t.status === "success");
    const atual = i === t.etapaIndex && t.status !== "success";
    if (feita) {
      return {
        stageIndex: i,
        estado: "concluida" as const,
        statusAtual: null,
        descricao: DESC_OK[i],
        data: `${fmtDia(new Date(agora - (t.etapaIndex - i + 1) * 1.4 * 86400000))} · ${HORAS_TL[i]}`,
        temFoto: i === 0 || i === 3,
      };
    }
    if (atual) {
      const [, desc] = DESC_ATUAL[t.status] ?? DESC_ATUAL.processing;
      return {
        stageIndex: i,
        estado: "atual" as const,
        statusAtual: t.status,
        descricao: desc,
        data: `hoje · ${HORAS_TL[i]}`,
        temFoto: false,
      };
    }
    return {
      stageIndex: i,
      estado: "prevista" as const,
      statusAtual: null,
      descricao: "Etapa ainda não iniciada",
      data: "—",
      temFoto: false,
    };
  });
}

// ---- dashboard ----

export async function getDashboard(
  periodo: PeriodoDashboard,
  de?: string,
  ate?: string,
): Promise<DashboardData> {
  await delay();
  const per = PERIODOS_SEED[periodo];
  const fmtBr = (s?: string) =>
    s ? `${s.slice(8, 10)}/${s.slice(5, 7)}` : "";
  const sub =
    periodo === "custom" ? `${fmtBr(de)} – ${fmtBr(ate)}` : per.sub;
  const funilPorEtapa = TEMPOS_POR_ETAPA.map(
    (_, i) => TRANSFORMADORES_SEED.filter((t) => t.etapaIndex === i).length,
  );
  return {
    emProducao: TRANSFORMADORES_SEED.filter((t) => t.etapaIndex < 5).length,
    prodLabel: per.label,
    prodValor: per.val,
    prodSub: sub,
    aprovacaoPct: per.aprov,
    nAprovados: per.na,
    nReprovados: per.nr,
    tempoMedioTotalDias:
      Math.round(TEMPOS_POR_ETAPA.reduce((a, b) => a + b, 0) * 10) / 10,
    prodTitulo: per.titulo,
    prodSerie: per.dias.map(([label, valor]) => ({ label, valor })),
    funilPorEtapa,
    tempoPorEtapa: TEMPOS_POR_ETAPA,
  };
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
