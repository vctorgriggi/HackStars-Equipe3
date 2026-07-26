"use client";

// Driver REAL da esteira: Socket.IO no namespace `/tempo-real` do backend.
// Substitui a simulação (tick aleatório) — sem conexão o estado CONGELA e o
// header anuncia "Reconectando…"; movimento inventado seria o falso OK da
// tela de monitoramento.
// Montado UMA vez no layout do grupo (vision). Propriedades herdadas do
// driver antigo:
//  1. getState() em vez de hook com selector — o driver não assina nada;
//  2. flag de módulo + socket singleton contra o double-mount do StrictMode.
// Propriedades novas:
//  3. NUNCA forçar `transports`: no App Runner não há upgrade de WebSocket e
//     o socket.io precisa degradar sozinho para long-polling;
//  4. snapshot rebuscado a TODO connect (incluindo reconnect) — evento
//     perdido durante a queda não deixa a tela mentindo.

import { useEffect } from "react";
import { io, type Socket } from "socket.io-client";
import { useRealtime } from "@/lib/stores/realtime";
import type {
  EsteiraSnapshotApi,
  EventoPassagemRegistradaApi,
} from "@/lib/domain/esteira-api";

let started = false;
let socket: Socket | null = null;

async function origemDoBackend(): Promise<string> {
  const resposta = await fetch("/api/tempo-real/socket");
  const { url } = (await resposta.json()) as { url: string };
  // Dev na rede local: o default server-side é localhost:3001, mas a página
  // pode estar aberta pelo IP da máquina (celular na mesma rede) — nesse
  // caso o backend está no MESMO host da página (espelho de web/lib/api.ts).
  try {
    const alvo = new URL(url);
    if (
      alvo.hostname === "localhost" &&
      window.location.hostname !== "localhost"
    ) {
      return `${window.location.protocol}//${window.location.hostname}:${alvo.port || "3001"}`;
    }
  } catch {
    // URL relativa/inesperada: usa como veio
  }
  return url;
}

async function sincronizar(): Promise<void> {
  const resposta = await fetch("/api/tempo-real/esteira");
  if (!resposta.ok) {
    // Sem sessão ou backend com erro: nada de snapshot — o estado anterior
    // permanece e a conexão (que segue "conectado") não mente sobre dados.
    return;
  }
  const snapshot = (await resposta.json()) as EsteiraSnapshotApi;
  useRealtime.getState().aplicarSnapshot(snapshot);
}

export function RealtimeSocketDriver() {
  useEffect(() => {
    if (started) return;
    started = true;
    let cancelado = false;

    useRealtime.getState().setConexao("conectando");

    void origemDoBackend().then((origem) => {
      if (cancelado) return;
      socket = io(`${origem}/tempo-real`);

      socket.on("connect", () => {
        useRealtime.getState().setConexao("conectado");
        void sincronizar();
      });
      socket.on("disconnect", () => {
        useRealtime.getState().setConexao("reconectando");
      });
      socket.on("connect_error", () => {
        useRealtime.getState().setConexao("reconectando");
      });
      socket.on("passagem-registrada", (e: EventoPassagemRegistradaApi) => {
        useRealtime.getState().aplicarPassagem(e);
      });
    });

    return () => {
      cancelado = true;
      socket?.disconnect();
      socket = null;
      started = false;
    };
  }, []);

  return null;
}
