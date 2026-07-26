"use client";

// Tempo real: mapa serpentina + painel lateral (selecionado + feed), dirigido
// pelo Socket.IO da API (driver no layout do grupo). A page assina só o que
// muda raro (etapas: referência estável por snapshot; conexao) — as folhas
// (boxes, sprite, feed, contagem) re-renderizam no evento. Painel empilha
// ≤1150px (protótipo).

import { useState } from "react";
import { useRealtime } from "@/lib/stores/realtime";
import type { EstadoConexao } from "@/lib/stores/realtime";
import { MapaEsteira } from "./_components/mapa";
import { ContagemEsteira, EventFeed } from "./_components/event-feed";
import { SelectedPanel } from "./_components/selected-panel";

// O estado de conexão SE ANUNCIA: nada de "Conectado" hardcoded — desconexão
// congela a esteira e o header é quem conta.
const CONEXAO_UI: Record<EstadoConexao, { cor: string; rotulo: string }> = {
  conectando: { cor: "bg-reading-lowconf", rotulo: "Conectando…" },
  conectado: { cor: "bg-reading-success", rotulo: "Conectado" },
  reconectando: { cor: "bg-reading-mismatch", rotulo: "Reconectando…" },
};

export default function TempoRealPage() {
  const etapas = useRealtime((s) => s.etapas);
  const conexao = useRealtime((s) => s.conexao);
  const nomes = etapas.map((e) => e.nome);
  const [sel, setSel] = useState<number | null>(null);
  const ui = CONEXAO_UI[conexao];

  return (
    <div className="grid gap-4">
      <div className="flex flex-wrap items-center gap-3">
        <span className="flex items-center gap-2 text-sm text-text-1">
          <span
            aria-hidden
            className={`h-2 w-2 rounded-full ${ui.cor} ${
              conexao === "conectado" ? "tv-pulse" : ""
            }`}
          />
          {ui.rotulo}
        </span>
        <span className="t-mono text-xs text-text-3">
          socket.io · /tempo-real
        </span>
        <span className="ml-auto">
          <ContagemEsteira />
        </span>
      </div>

      {etapas.length === 0 ? (
        // Pré-snapshot: a checklist de etapas ainda não chegou — anunciar,
        // nunca desenhar boxes fantasmas (ausência de informação não é
        // afirmação).
        <div className="rounded-lg border border-line bg-surface-1 p-8 text-center shadow-1">
          <p className="text-sm text-text-2">Sincronizando com a linha…</p>
          <p className="mt-1 text-xs text-text-3">
            As etapas e a ocupação vêm da API; a esteira aparece assim que o
            snapshot chegar.
          </p>
        </div>
      ) : (
        <div className="flex flex-col items-stretch gap-4 min-[1151px]:flex-row min-[1151px]:items-start">
          <MapaEsteira
            nomes={nomes}
            onSelect={(i) => setSel((atual) => (atual === i ? null : i))}
          />
          <div className="grid w-full gap-4 min-[1151px]:w-80 min-[1151px]:flex-none">
            {sel != null && (
              <SelectedPanel
                sel={sel}
                nome={nomes[sel] ?? `Etapa ${sel + 1}`}
                onClose={() => setSel(null)}
              />
            )}
            <EventFeed />
          </div>
        </div>
      )}
    </div>
  );
}
