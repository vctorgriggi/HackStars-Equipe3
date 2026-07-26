// Barras horizontais — funil "Status por etapa" (viz-1..6 por índice) e
// "Tempo médio por checkpoint" (cor fixa). Mesmo grid de 3 colunas, cor por
// prop discriminada. Classes SEMPRE literais (o scanner do Tailwind v4 não
// enxerga `bg-viz-${n}`).

const CLASSE_VIZ = [
  "bg-viz-1",
  "bg-viz-2",
  "bg-viz-3",
  "bg-viz-4",
  "bg-viz-5",
  "bg-viz-6",
] as const;

export interface HBarRow {
  rotulo: string;
  valor: number;
  texto: string;
}

export function HBarsChart({
  linhas,
  cor,
  larguraValor,
}: {
  linhas: readonly HBarRow[];
  /** 'sequencia' = viz-1..6 por índice; ou uma classe fixa */
  cor: "sequencia" | (typeof CLASSE_VIZ)[number];
  larguraValor: 26 | 44;
}) {
  const max = Math.max(...linhas.map((l) => l.valor), 1);
  return (
    <div className="grid gap-3">
      {linhas.map((l, i) => (
        <div
          key={l.rotulo}
          className="grid items-center gap-2"
          style={{ gridTemplateColumns: `82px 1fr ${larguraValor}px` }}
        >
          <span className="truncate text-xs text-text-2">{l.rotulo}</span>
          <div
            className="h-3 overflow-hidden rounded-full"
            style={{ background: "var(--viz-track)" }}
          >
            <div
              data-tv-anim
              className={`h-full rounded-full ${
                cor === "sequencia" ? CLASSE_VIZ[i % 6] : cor
              }`}
              style={{
                width: `${Math.round((l.valor / max) * 100)}%`,
                transition: "width .6s var(--ease-standard)",
                animation: `tvGrowX .5s var(--ease-standard) ${i * 40}ms both`,
              }}
            />
          </div>
          <span className="t-mono text-right text-xs text-text-1">
            {l.texto}
          </span>
        </div>
      ))}
    </div>
  );
}
