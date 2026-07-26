// Item vertical da timeline do detalhe: nó colorido + linha conectora.
// Derivação de estado fica na page; aqui é só layout.

import type { ReactNode } from "react";

export function TimelineItem({
  estado,
  corAtual,
  ultimo,
  children,
}: {
  estado: "concluida" | "atual" | "prevista";
  /** cor de leitura da etapa atual; ignorada nos outros estados */
  corAtual?: string;
  ultimo: boolean;
  children: ReactNode;
}) {
  const cor =
    estado === "concluida"
      ? "var(--color-reading-success)"
      : estado === "atual"
        ? (corAtual ?? "var(--color-reading-processing)")
        : "var(--viz-track)";

  return (
    <div className="grid gap-3" style={{ gridTemplateColumns: "20px 1fr" }}>
      <div className="flex flex-col items-center gap-1">
        <span
          aria-hidden
          className="mt-1 h-3 w-3 flex-none rounded-full"
          style={{
            background: cor,
            boxShadow:
              estado === "atual" ? "var(--ring-focus-tight)" : undefined,
          }}
        />
        {!ultimo && (
          <div aria-hidden className="w-0.5 flex-1 rounded-full bg-line" />
        )}
      </div>
      <div
        className="min-w-0"
        style={{ paddingBottom: ultimo ? 0 : "var(--space-5)" }}
      >
        {children}
      </div>
    </div>
  );
}
