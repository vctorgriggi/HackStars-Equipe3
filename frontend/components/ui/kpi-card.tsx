// KPI card do dashboard: label caps, valor mono 3xl bold, sub opcional
// (delta verde ou período).

export function KpiCard({
  label,
  valor,
  sub,
  subPositivo = false,
  valorCor,
}: {
  label: string;
  valor: string;
  sub?: string;
  subPositivo?: boolean;
  /** var CSS p/ destaque (ex.: paradas em mismatch) */
  valorCor?: string;
}) {
  return (
    <div className="rounded-lg border border-line bg-surface-1 p-4 shadow-1">
      <p className="t-caps text-2xs text-text-3">{label}</p>
      <p
        className="t-mono mt-1.5 text-3xl font-bold text-text-1"
        style={valorCor ? { color: valorCor } : undefined}
      >
        {valor}
      </p>
      {sub && (
        <p
          className={`mt-1 text-xs ${
            subPositivo ? "text-reading-success" : "text-text-3"
          }`}
        >
          {sub}
        </p>
      )}
    </div>
  );
}
