// Donut de aprovação: r=48, stroke 14, arco em reading-success sobre
// viz-track; o % é overlay HTML (não <text> SVG — herda a mono com tnum e é
// texto real para leitor de tela). dashoffset animado por transição CSS.

const R = 48;
const CIRC = 2 * Math.PI * R; // 301.593

export function DonutChart({
  pct,
  aprovados,
  reprovados,
}: {
  pct: number;
  aprovados: string;
  reprovados: string;
}) {
  const pctTexto = `${pct.toLocaleString("pt-BR", { minimumFractionDigits: 1 })}%`;
  const arco = (CIRC * pct) / 100;

  return (
    <div className="flex flex-1 flex-wrap items-center justify-center gap-5">
      <div
        className="relative h-[132px] w-[132px] flex-none"
        role="img"
        aria-label={`Taxa de aprovação em ensaios: ${pctTexto}`}
      >
        <svg
          width={132}
          height={132}
          viewBox="0 0 132 132"
          className="block"
          aria-hidden
          focusable="false"
        >
          <circle
            cx={66}
            cy={66}
            r={R}
            fill="none"
            strokeWidth={14}
            stroke="var(--viz-track)"
          />
          <circle
            cx={66}
            cy={66}
            r={R}
            fill="none"
            strokeWidth={14}
            stroke="var(--color-reading-success)"
            strokeLinecap="round"
            strokeDasharray={`${CIRC} ${CIRC}`}
            strokeDashoffset={CIRC - arco}
            transform="rotate(-90 66 66)"
            style={{ transition: "stroke-dashoffset .8s var(--ease-standard)" }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-0.5">
          <span className="t-mono text-xl font-bold text-text-1">
            {pctTexto}
          </span>
          <span className="text-2xs text-text-3">aprovados</span>
        </div>
      </div>

      <dl className="grid gap-2 text-xs">
        <div className="flex items-center gap-2">
          <span
            className="h-[9px] w-[9px] flex-none rounded-full bg-reading-success"
            aria-hidden
          />
          <dt className="text-text-2">Aprovados ·</dt>
          <dd className="t-mono text-text-2">{aprovados}</dd>
        </div>
        <div className="flex items-center gap-2">
          <span
            className="h-[9px] w-[9px] flex-none rounded-full bg-reading-mismatch"
            aria-hidden
          />
          <dt className="text-text-2">Reprovados ·</dt>
          <dd className="t-mono text-text-2">{reprovados}</dd>
        </div>
      </dl>
    </div>
  );
}
