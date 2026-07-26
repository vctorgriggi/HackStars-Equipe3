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

// Peça de demonstração (mesma série da etiqueta default da estação e do
// painel de câmeras). O botão de reset só existe para a apresentação: devolve
// ESTA peça ao primeiro checkpoint da linha — quem move a esteira é o evento
// Socket.IO que o backend emite, nunca estado local.
const SERIE_DEMO = "847233";

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
  const [resetando, setResetando] = useState(false);
  const [erroReset, setErroReset] = useState("");
  const ui = CONEXAO_UI[conexao];

  async function resetarApresentacao() {
    setResetando(true);
    setErroReset("");
    try {
      const resp = await fetch("/api/tempo-real/reiniciar-apresentacao", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ numeroSerie: SERIE_DEMO }),
      });
      if (!resp.ok) {
        const json = await resp.json().catch(() => null);
        throw new Error(
          json?.errors?.numeroSerie ??
            json?.message ??
            `falha no reset (${resp.status})`,
        );
      }
      // Sucesso: nada a fazer aqui — o evento `passagem-registrada` chega
      // pelo socket e move a peça na esteira de todo mundo.
    } catch (e) {
      setErroReset((e as Error).message);
    } finally {
      setResetando(false);
    }
  }

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
        <span className="ml-auto flex items-center gap-3">
          <button
            type="button"
            onClick={resetarApresentacao}
            disabled={resetando}
            title={`Devolve a peça ${SERIE_DEMO} ao primeiro checkpoint da linha`}
            className="flex h-9 items-center gap-1.5 rounded-md border border-line px-3 text-sm text-text-2 hover:bg-surface-3 hover:text-text-1 disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-none focus-visible:[box-shadow:var(--ring-focus)]"
          >
            {resetando ? "Resetando…" : "Resetar apresentação"}
          </button>
          <ContagemEsteira />
        </span>
      </div>

      {erroReset && (
        <p className="rounded-md border border-reading-mismatch bg-reading-mismatch-soft px-3 py-2 text-sm text-reading-mismatch">
          Reset falhou: {erroReset}
        </p>
      )}

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
