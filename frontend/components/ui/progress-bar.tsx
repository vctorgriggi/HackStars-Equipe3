// Barra de progresso — div puro com role="meter" (é MEDIÇÃO de completude,
// não operação em andamento; progressbar seria o role errado). Transição
// width .6s conforme o handoff.

export function ProgressBar({
  value,
  color = "var(--viz-2)",
  height = 8,
  label,
}: {
  value: number;
  color?: string;
  height?: 8 | 12;
  label: string;
}) {
  const pct = Math.max(0, Math.min(100, Math.round(value)));
  return (
    <div
      role="meter"
      aria-valuenow={pct}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuetext={`${pct}%`}
      aria-label={label}
      className="overflow-hidden rounded-full"
      style={{ height, background: "var(--viz-track)" }}
    >
      <div
        className="h-full rounded-full"
        style={{
          width: `${pct}%`,
          background: color,
          transition: "width .6s var(--ease-standard)",
        }}
      />
    </div>
  );
}
