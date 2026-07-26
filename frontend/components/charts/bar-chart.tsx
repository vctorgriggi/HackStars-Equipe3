// Barras verticais (Produção por dia/hora/semana): 150px de altura útil,
// barra máxima em brand-medium, demais viz-1, radius no topo. Sem motion:
// entrada por tvGrow (clip-path composita e preserva o radius; scaleY o
// esmagaria); key={remountKey} replaya a entrada na troca de período.

export interface BarPoint {
  rotulo: string;
  valor: number;
}

export function BarChart({
  dados,
  remountKey,
}: {
  dados: readonly BarPoint[];
  remountKey: string;
}) {
  const max = Math.max(...dados.map((d) => d.valor), 1);
  return (
    <div key={remountKey} className="flex h-[150px] items-stretch gap-2">
      {dados.map((d, i) => {
        const pct = Math.round((d.valor / max) * 100);
        const destaque = d.valor === max;
        return (
          <div key={d.rotulo} className="flex min-w-0 flex-1 flex-col gap-1.5">
            <div className="flex flex-1 items-end">
              <div
                data-tv-anim
                className={`w-full ${destaque ? "bg-brand-medium" : "bg-viz-1"}`}
                style={{
                  height: `${pct}%`,
                  minHeight: 4,
                  borderRadius: "var(--radius-sm) var(--radius-sm) 0 0",
                  animation: `tvGrow .45s var(--ease-standard) ${i * 40}ms both`,
                }}
                title={`${d.rotulo}: ${d.valor}`}
              />
            </div>
            <div className="text-center text-2xs text-text-3">{d.rotulo}</div>
          </div>
        );
      })}
    </div>
  );
}
