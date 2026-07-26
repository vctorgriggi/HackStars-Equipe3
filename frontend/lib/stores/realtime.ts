// Estado da esteira (simulação do WebSocket — trocável por WS real mantendo
// as actions). Regras do protótipo (tick, linhas 1034–1068):
//  - tick move 1 unidade aleatória;
//  - em Ensaios (stage 3), ~18% reprova e volta ao Tanque (stage 2);
//  - quem sai de Expedição (stage 5) é expedido e uma série nova entra na
//    Bobinagem;
//  - mismatch ⇒ linha parada até liberação manual (banner + botão).
// Selectors de folha devem retornar PRIMITIVOS (countByStage[i], hot === i)
// para o tick re-renderizar ≤3 componentes.

import { create } from "zustand";
import type {
  EventoEsteira,
  MovimentoEsteira,
  ReadingStatus,
  Transformador,
  UnidadeEsteira,
} from "@/lib/domain/types";

const N_ETAPAS = 6;
const MAX_EVENTOS = 14;
export const TICK_MS = 2500;
const UNIDADES_INICIAIS = 8;

let proxSerie = 847262;
let proxEventoId = 2;

function hora(): string {
  return new Date().toLocaleTimeString("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

function contar(unidades: UnidadeEsteira[]): number[] {
  const c = Array<number>(N_ETAPAS).fill(0);
  for (const u of unidades) if (u.stage >= 0 && u.stage < N_ETAPAS) c[u.stage]++;
  return c;
}

function evento(
  mensagem: string,
  serie: string,
  status: ReadingStatus,
): EventoEsteira {
  return { id: proxEventoId++, mensagem, serie, status, hora: hora() };
}

interface RealtimeState {
  iniciado: boolean;
  unidades: UnidadeEsteira[];
  countByStage: number[];
  eventos: EventoEsteira[];
  /** Índice do checkpoint "quente" (recebendo unidade) — anel no mapa. */
  hot: number | null;
  /** Último movimento semântico; o componente do mapa anima o sprite. */
  movimento: MovimentoEsteira | null;
  linhaParada: boolean;
  /** Nome da etapa não vive aqui (join via useCheckpoints) — só o índice. */
  init(transformadores: Transformador[]): void;
  tick(nomesEtapas: string[]): void;
  liberarLinha(): void;
  limparHot(): void;
}

export const useRealtime = create<RealtimeState>((set, get) => ({
  iniciado: false,
  unidades: [],
  countByStage: Array<number>(N_ETAPAS).fill(0),
  // hora vazia de propósito: hora() no load do módulo diverge entre server e
  // client e vira mismatch de hidratação; o init() (só client) carimba.
  eventos: [
    {
      id: 1,
      mensagem: "Conexão estabelecida com a linha 1",
      serie: "ws://linha-1",
      status: "success",
      hora: "",
    },
  ],
  hot: null,
  movimento: null,
  linhaParada: true,

  init(transformadores) {
    if (get().iniciado) return;
    const unidades = transformadores
      .filter((t) => t.etapaIndex < 5)
      .slice(0, UNIDADES_INICIAIS)
      .map((t) => ({ serie: t.serie, stage: t.etapaIndex }));
    set((s) => ({
      iniciado: true,
      unidades,
      countByStage: contar(unidades),
      eventos: s.eventos.map((e) =>
        e.hora === "" ? { ...e, hora: hora() } : e,
      ),
    }));
  },

  tick(nomesEtapas) {
    const { unidades, eventos } = get();
    if (!unidades.length) return;
    const us = [...unidades];
    const i = Math.floor(Math.random() * us.length);
    const u = { ...us[i] };
    const novos: EventoEsteira[] = [];
    let movimento: MovimentoEsteira;

    if (u.stage >= 5) {
      const novo = { serie: `TR-${proxSerie++}`, stage: 0 };
      us[i] = novo;
      novos.push(evento("Expedido para o cliente", u.serie, "success"));
      novos.push(
        evento(
          `Entrou na linha — ${nomesEtapas[0] ?? "Bobinagem"}`,
          novo.serie,
          "pending",
        ),
      );
      movimento = { seq: Date.now(), from: 5, to: null, serie: u.serie };
    } else if (u.stage === 3) {
      if (Math.random() < 0.18) {
        u.stage = 2;
        novos.push(
          evento(
            `Ensaio reprovado — retorna ao ${nomesEtapas[2] ?? "Tanque"}`,
            u.serie,
            "mismatch",
          ),
        );
        movimento = { seq: Date.now(), from: 3, to: 2, serie: u.serie };
      } else {
        u.stage = 4;
        novos.push(
          evento(
            `Ensaio aprovado — segue para ${nomesEtapas[4] ?? "Pintura"}`,
            u.serie,
            "success",
          ),
        );
        movimento = { seq: Date.now(), from: 3, to: 4, serie: u.serie };
      }
      us[i] = u;
    } else {
      const de = u.stage;
      u.stage++;
      us[i] = u;
      novos.push(
        evento(
          `Avançou para ${nomesEtapas[u.stage] ?? `etapa ${u.stage + 1}`}`,
          u.serie,
          "processing",
        ),
      );
      movimento = { seq: Date.now(), from: de, to: u.stage, serie: u.serie };
    }

    set({
      unidades: us,
      countByStage: contar(us),
      eventos: [...novos, ...eventos].slice(0, MAX_EVENTOS),
      hot: movimento.to ?? movimento.from,
      movimento,
    });
  },

  liberarLinha() {
    set((s) => ({
      linhaParada: false,
      eventos: [
        evento("Linha liberada pelo operador", "TR-847250", "validated"),
        ...s.eventos,
      ].slice(0, MAX_EVENTOS),
    }));
  },

  limparHot() {
    set({ hot: null });
  },
}));
