"use client";

// Feed de eventos ao vivo (máx 14, novos no topo). Único assinante da lista
// de eventos — o tick re-renderiza só este componente e os boxes afetados.

import { useRealtime } from "@/lib/stores/realtime";
import { READING_VAR } from "@/lib/domain/status";

export function EventFeed() {
  const eventos = useRealtime((s) => s.eventos);
  return (
    <div className="overflow-hidden rounded-lg border border-line bg-surface-1 shadow-1">
      <div className="border-b border-line px-4 py-3">
        <h2 className="t-caps text-2xs text-text-3">Eventos ao vivo</h2>
      </div>
      <ul className="max-h-96 overflow-y-auto">
        {eventos.map((e) => (
          <li
            key={e.id}
            className="flex items-start gap-2 border-b border-line px-4 py-2.5 last:border-b-0"
          >
            <span
              aria-hidden
              className="mt-[5px] h-2 w-2 flex-none rounded-full"
              style={{ background: READING_VAR[e.status] }}
            />
            <div className="min-w-0">
              <p className="text-sm text-text-1">{e.mensagem}</p>
              <p className="t-mono mt-0.5 text-2xs text-text-3">
                {e.hora} · {e.serie}
              </p>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** Contagem "N na esteira" do cabeçalho — assinante de um primitivo. */
export function ContagemEsteira() {
  const n = useRealtime((s) => s.unidades.length);
  return (
    <span className="t-mono text-xs text-text-2">{n} na esteira</span>
  );
}
