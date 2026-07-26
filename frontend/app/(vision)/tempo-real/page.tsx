"use client";

// Tempo real: mapa serpentina + painel lateral (selecionado + feed).
// A page NÃO assina o store da esteira — só as folhas (boxes, sprite, feed,
// contagem) re-renderizam no tick. Painel empilha ≤1150px (protótipo).

import { useState } from "react";
import { useCheckpoints } from "@/lib/data/use-checkpoints";
import { MapaEsteira } from "./_components/mapa";
import { ContagemEsteira, EventFeed } from "./_components/event-feed";
import { SelectedPanel } from "./_components/selected-panel";

export default function TempoRealPage() {
  const { data: checkpoints = [] } = useCheckpoints();
  const nomes = checkpoints.map((c) => c.nome);
  const [sel, setSel] = useState<number | null>(null);

  return (
    <div className="grid gap-4">
      <div className="flex flex-wrap items-center gap-3">
        <span className="flex items-center gap-2 text-sm text-text-1">
          <span
            aria-hidden
            className="tv-pulse h-2 w-2 rounded-full bg-reading-success"
          />
          Conectado
        </span>
        <span className="t-mono text-xs text-text-3">
          ws://linha-1.trael/stream
        </span>
        <span className="ml-auto">
          <ContagemEsteira />
        </span>
      </div>

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
    </div>
  );
}
