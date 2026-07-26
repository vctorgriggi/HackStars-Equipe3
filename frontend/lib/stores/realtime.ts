// Estado da esteira de tempo real — dirigido pela API, nunca por simulação.
// O snapshot (GET /api/tempo-real/esteira) traz etapas reais + ocupação; o
// evento Socket.IO `passagem-registrada` move a peça e SUBSTITUI os totais
// pelos do servidor (nunca incrementa: evento perdido é curado pelo próximo
// e pelo re-snapshot do reconnect). Sem conexão, o estado CONGELA e o header
// anuncia — movimento inventado numa tela de monitoramento é o análogo do
// falso OK.
// Animação da CONFIRMAÇÃO do gate: quando a conferência `conforme` nasceu na
// MESMA etapa da passagem (endpoint de visão com registrarPassagemSeConforme),
// a peça estava fisicamente sob a câmera do gate — o sprite anima a LIBERAÇÃO
// (gate → próxima etapa da linha), no instante do evento. É visualização de um
// fato do servidor (veredito + passagem registrada), não movimento inventado:
// posição e totais continuam sendo os da passagem gravada.
// Selectors de folha devem retornar PRIMITIVOS (countByStage[i], hot === i)
// para um evento re-renderizar ≤3 componentes.

import { create } from "zustand";
import type {
  EventoEsteira,
  MovimentoEsteira,
  ReadingStatus,
  UnidadeEsteira,
} from "@/lib/domain/types";
import { VEREDITO_TO_READING } from "@/lib/domain/types";
import type {
  EsteiraSnapshotApi,
  EventoPassagemRegistradaApi,
} from "@/lib/domain/esteira-api";
import type { EtapaResumoApi } from "@/lib/domain/transformador-api";

const MAX_EVENTOS = 14;

let proxEventoId = 1;

function hora(): string {
  return new Date().toLocaleTimeString("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

function evento(
  mensagem: string,
  serie: string,
  status: ReadingStatus,
): EventoEsteira {
  return { id: proxEventoId++, mensagem, serie, status, hora: hora() };
}

export type EstadoConexao = "conectando" | "conectado" | "reconectando";

interface RealtimeState {
  /** Etapas REAIS da linha (do snapshot), ordenadas por `ordem`. Referência
   *  estável: muda só quando um snapshot chega — os índices de
   *  unidades/countByStage apontam para este array. Vazio = pré-snapshot
   *  (a tela anuncia "sincronizando", nunca desenha etapas fantasmas). */
  etapas: EtapaResumoApi[];
  unidades: UnidadeEsteira[];
  /** Sempre do SERVIDOR (snapshot ou `evento.totais`) — nunca contado aqui. */
  countByStage: number[];
  eventos: EventoEsteira[];
  /** Índice do checkpoint "quente" (recebendo unidade) — anel no mapa. */
  hot: number | null;
  /** Último movimento semântico; o componente do mapa anima o sprite. */
  movimento: MovimentoEsteira | null;
  conexao: EstadoConexao;
  aplicarSnapshot(snapshot: EsteiraSnapshotApi): void;
  aplicarPassagem(recebido: EventoPassagemRegistradaApi): void;
  setConexao(conexao: EstadoConexao): void;
  limparHot(): void;
}

export const useRealtime = create<RealtimeState>((set, get) => ({
  etapas: [],
  unidades: [],
  countByStage: [],
  eventos: [],
  hot: null,
  movimento: null,
  conexao: "conectando",

  aplicarSnapshot(snapshot) {
    const etapas: EtapaResumoApi[] = snapshot.checkpoints.map(
      ({ codigo, nome, ordem }) => ({ codigo, nome, ordem }),
    );
    const unidades: UnidadeEsteira[] = snapshot.checkpoints.flatMap(
      (checkpoint, stage) =>
        checkpoint.pecas.map((peca) => ({ serie: peca.numeroSerie, stage })),
    );

    set((s) => ({
      etapas,
      unidades,
      countByStage: snapshot.checkpoints.map((c) => c.total),
      eventos: [
        evento(
          `Sincronizado com a linha — ${snapshot.totalNaLinha} na esteira`,
          "tempo-real",
          "success",
        ),
        ...s.eventos,
      ].slice(0, MAX_EVENTOS),
    }));
  },

  aplicarPassagem(recebido) {
    const { etapas, unidades, eventos, countByStage } = get();
    const { resultado, checkpointAnterior, totais } = recebido;
    const serie = resultado.transformador.numeroSerie;

    // Totais SEMPRE se aplicam (são absolutos, casados por código); total
    // ausente para uma etapa mantém o anterior — ausência não é zero.
    const totaisPorCodigo = new Map(totais.map((t) => [t.codigo, t.total]));
    const novoCount = etapas.map(
      (etapa, i) => totaisPorCodigo.get(etapa.codigo) ?? countByStage[i] ?? 0,
    );

    const veredito = resultado.ultimaConferencia?.vereditoGeral ?? null;
    const status: ReadingStatus = veredito
      ? VEREDITO_TO_READING[veredito]
      : "processing";
    const alerta =
      veredito === "divergente" ? " — última conferência DIVERGENTE" : "";

    const idxNovo = etapas.findIndex(
      (etapa) => etapa.codigo === resultado.checkpoint.codigo,
    );
    if (idxNovo < 0) {
      // Etapa que a tela não conhece (snapshot ainda não chegou, ou
      // checkpoint criado depois dele): o feed informa e os totais valem,
      // mas ausência de informação NUNCA vira movimento inventado.
      set({
        countByStage: novoCount,
        eventos: [
          evento(`Passou por ${resultado.checkpoint.nome}${alerta}`, serie, status),
          ...eventos,
        ].slice(0, MAX_EVENTOS),
      });
      return;
    }

    // `from` da viagem: o checkpoint anterior do EVENTO (server-authoritative)
    // vence; a posição local da série é fallback; sem nenhum dos dois a peça
    // entra parada no box (sem viagem de origem inventada).
    const idxAnterior = checkpointAnterior
      ? etapas.findIndex((etapa) => etapa.codigo === checkpointAnterior.codigo)
      : -1;
    const idxLocal = unidades.find((u) => u.serie === serie)?.stage ?? -1;
    const from = idxAnterior >= 0 ? idxAnterior : idxLocal;

    const novasUnidades = [
      ...unidades.filter((u) => u.serie !== serie),
      { serie, stage: idxNovo },
    ];

    // Confirmação do gate: `conforme` emitido NESTA etapa (a conferência do
    // evento nasceu no mesmo checkpoint da passagem). A peça já estava sob a
    // câmera do gate, então a animação certa é o avanço para o próximo passo
    // da linha — não a chegada ao gate (que, com a peça já lá, nem animava).
    // Na última etapa não há próximo box: cai na animação de chegada.
    const confirmadaNesteGate =
      resultado.ultimaConferencia?.vereditoGeral === "conforme" &&
      resultado.ultimaConferencia.checkpoint?.codigo ===
        resultado.checkpoint.codigo;
    const idxProximo = idxNovo + 1 < etapas.length ? idxNovo + 1 : -1;

    let movimento: MovimentoEsteira | null = null;
    if (confirmadaNesteGate && idxProximo >= 0) {
      movimento = { seq: Date.now(), from: idxNovo, to: idxProximo, serie };
    } else if (from >= 0 && from !== idxNovo) {
      movimento = { seq: Date.now(), from, to: idxNovo, serie };
    }

    const mensagem =
      confirmadaNesteGate && idxProximo >= 0
        ? `Conforme em ${resultado.checkpoint.nome} — segue para ${etapas[idxProximo].nome}`
        : `Passou por ${resultado.checkpoint.nome}${alerta}`;

    set({
      unidades: novasUnidades,
      countByStage: novoCount,
      eventos: [evento(mensagem, serie, status), ...eventos].slice(0, MAX_EVENTOS),
      hot: idxNovo,
      ...(movimento ? { movimento } : {}),
    });
  },

  setConexao(conexao) {
    if (get().conexao === conexao) return;
    const aviso: EventoEsteira | null =
      conexao === "reconectando"
        ? evento("Conexão com a linha perdida — reconectando", "tempo-real", "lowconf")
        : null;
    set((s) => ({
      conexao,
      eventos: aviso ? [aviso, ...s.eventos].slice(0, MAX_EVENTOS) : s.eventos,
    }));
  },

  limparHot() {
    set({ hot: null });
  },
}));
