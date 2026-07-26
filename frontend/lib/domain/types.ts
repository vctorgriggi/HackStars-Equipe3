// Entidades do TRAEL Vision (handoff design_handoff_trael_vision/README.md).
// Este módulo SOBREVIVE à troca do mock pela API real — nada aqui conhece
// seed nem fetch.

/** Status de leitura por visão computacional — vem do dado, nunca é
 *  calculado no front (regra de ouro do CLAUDE.md raiz). */
export type ReadingStatus =
  | "pending"
  | "processing"
  | "success"
  | "lowconf"
  | "mismatch"
  | "validated";

/** Vereditos da API de conferência (regra de ouro). O front só mapeia as 3
 *  strings para os reading states do DS. */
export type Veredito = "conforme" | "divergente" | "nao_conferivel";

export const VEREDITO_TO_READING: Record<Veredito, ReadingStatus> = {
  conforme: "success",
  divergente: "mismatch",
  nao_conferivel: "lowconf",
};

export interface Transformador {
  serie: string; // TR-######
  kva: number;
  clienteNome: string;
  /** Índice do checkpoint atual (0..5). Nome é join no render via
   *  useCheckpoints() — nenhum acessor devolve nome de etapa. */
  etapaIndex: number;
  status: ReadingStatus;
  entregaPrevista: string;
}

export interface Cliente {
  id: string;
  nome: string;
  cidadeUf: string;
  email: string;
  iniciais: string;
  emProducao: number;
  entregues: number;
}

export interface Lote {
  id: string; // LT-AAAA-###
  projetoNome: string;
  unidades: number;
  progresso: number; // 0..100
  status: ReadingStatus;
  previsao: string;
}

export interface Projeto {
  id: string;
  nome: string;
  clienteNome: string;
  lotes: number;
  unidades: number;
  progresso: number; // 0..100
  entrega: string;
  status: ReadingStatus;
}

/** Câmera NÃO carrega checkpointId: o vínculo mora só em
 *  Checkpoint.cameraIds (uma câmera pertence a no máx. 1 checkpoint;
 *  espelhar a relação nos dois lados é como o bug do "desvincular do
 *  anterior" seria shipado). */
export interface Camera {
  id: string; // CAM-##
  endpoint: string; // RTSP
  online: boolean;
}

export type CampoInscricao = "Serigrafia" | "Chassi" | "Plaqueta" | "Etiqueta";

export const CAMPOS_INSCRICAO: CampoInscricao[] = [
  "Serigrafia",
  "Chassi",
  "Plaqueta",
  "Etiqueta",
];

export interface Checkpoint {
  /** Opaco (`cp-1`..), estável sob rename/reorder — nunca índice de array. */
  id: string;
  ordem: number; // 1..6, badge 01–06 e posição na esteira
  nome: string; // editável — propaga para mapa, funil, filtros, timeline
  cameraIds: string[]; // ÚNICO dono do vínculo câmera↔checkpoint
  campos: CampoInscricao[];
  limiar: number; // 50–100
  ativo: boolean;
}

export interface Notificacao {
  id: string;
  mensagem: string;
  quando: string; // "há 4 min"
  status: ReadingStatus;
  lida: boolean;
}

export interface ConfigNotificacoes {
  paradaLinha: boolean;
  divergencia: boolean;
  resumoDiario: boolean;
  entregasProximas: boolean;
}

export type PeriodoDashboard = "hoje" | "7d" | "30d" | "custom";

export interface DashboardData {
  /** KPI 1 — unidades com etapaIndex < 5. */
  emProducao: number;
  /** KPI 2 — produção do período. */
  prodLabel: string;
  prodValor: string;
  prodSub: string;
  /** KPI 3 — aprovação em ensaios (%). */
  aprovacaoPct: number;
  nAprovados: string;
  nReprovados: string;
  /** KPI 4 — tempo médio total (dias). */
  tempoMedioTotalDias: number;
  /** Gráfico de barras — granularidade muda com o período. */
  prodTitulo: string;
  prodSerie: { label: string; valor: number }[];
  /** Funil — contagem POR ÍNDICE de etapa (nome via useCheckpoints). */
  funilPorEtapa: number[];
  /** Tempo médio por checkpoint, em dias, por índice. */
  tempoPorEtapa: number[];
}

/** Item da timeline do detalhe — sem nome de etapa (join no render). */
export interface EtapaTimeline {
  stageIndex: number;
  estado: "concluida" | "atual" | "prevista";
  /** Só quando atual: o status da peça manda no chip/cor. */
  statusAtual: ReadingStatus | null;
  descricao: string;
  data: string; // "14 jul · 08:12" | "hoje · 09:18" | "—"
  temFoto: boolean;
}

// ---- Tempo real (esteira) ----

export interface UnidadeEsteira {
  serie: string;
  stage: number; // 0..5
}

export interface EventoEsteira {
  id: number;
  mensagem: string;
  serie: string;
  status: ReadingStatus;
  hora: string; // HH:MM:SS
}

/** Movimento semântico do sprite — geometria (posições/px) é problema do
 *  componente do mapa, que conhece o layout compacto ou não. */
export interface MovimentoEsteira {
  seq: number; // muda a cada movimento (chave de efeito)
  from: number;
  /** null = saiu de Expedição (expedida para fora do mapa). */
  to: number | null;
  serie: string;
}
