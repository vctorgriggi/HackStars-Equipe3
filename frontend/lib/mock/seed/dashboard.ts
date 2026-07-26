// Seed do dashboard = tabela PERD do protótipo (linhas 1136–1148) + timeline
// do detalhe (DESC_OK/HORAS_TL, linhas 946–947).
import type { PeriodoDashboard } from "@/lib/domain/types";

export interface PeriodoSeed {
  label: string;
  val: string;
  sub: string; // no custom, é substituído pelas datas escolhidas
  aprov: number;
  na: string;
  nr: string;
  titulo: string;
  dias: [string, number][];
}

export const D7: [string, number][] = [
  ["Seg", 5],
  ["Ter", 7],
  ["Qua", 4],
  ["Qui", 8],
  ["Sex", 6],
  ["Sáb", 3],
  ["Dom", 2],
];

export const PERIODOS_SEED: Record<PeriodoDashboard, PeriodoSeed> = {
  hoje: {
    label: "Produção · hoje",
    val: "6",
    sub: "+2 vs ontem",
    aprov: 96.1,
    na: "22",
    nr: "1",
    titulo: "Produção por hora",
    dias: [
      ["06h", 0],
      ["08h", 1],
      ["10h", 1],
      ["12h", 2],
      ["14h", 1],
      ["16h", 1],
    ],
  },
  "7d": {
    label: "Produção · semana",
    val: "35",
    sub: "+8% vs semana anterior",
    aprov: 94.2,
    na: "213",
    nr: "13",
    titulo: "Produção por dia",
    dias: D7,
  },
  "30d": {
    label: "Produção · 30 dias",
    val: "124",
    sub: "+5% vs mês anterior",
    aprov: 93.4,
    na: "876",
    nr: "62",
    titulo: "Produção por semana",
    dias: [
      ["Sem 1", 28],
      ["Sem 2", 31],
      ["Sem 3", 35],
      ["Sem 4", 30],
    ],
  },
  custom: {
    label: "Produção · período",
    val: "35",
    sub: "", // preenchido com "dd/mm – dd/mm" pelo acessor
    aprov: 94.2,
    na: "213",
    nr: "13",
    titulo: "Produção por dia",
    dias: D7,
  },
};

/** Tempo médio por checkpoint em dias (índice = etapa). */
export const TEMPOS_POR_ETAPA = [2.8, 1.9, 2.4, 1.2, 1.6, 0.8];

/** Descrições da timeline para etapa concluída (índice = etapa). */
export const DESC_OK = [
  "Bobinas montadas e conferidas",
  "Núcleo prensado, medições dentro da tolerância",
  "Encapsulamento e soldas finalizados",
  "Ensaios elétricos de rotina aprovados",
  "Acabamento aplicado e seco",
  "Liberado para transporte",
];

/** Horas fixas da timeline (índice = etapa). */
export const HORAS_TL = ["08:12", "10:45", "14:32", "09:18", "16:05", "11:50"];

/** Descrições da etapa ATUAL por status (protótipo, linhas 1113–1118). */
export const DESC_ATUAL: Record<string, [string, string]> = {
  mismatch: ["Reprovado", "Reprovado no ensaio de rotina — aguardando retrabalho"],
  lowconf: ["Atenção", "Divergência na leitura das inscrições — verificação manual"],
  processing: ["Em processo", "Etapa em andamento"],
  pending: ["Aguardando", "Na fila para iniciar a etapa"],
};
