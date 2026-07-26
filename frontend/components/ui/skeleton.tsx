// Skeletons com shimmer (utility `skeleton` em globals.css) — presets usados
// pelos loading.tsx por rota.

export function Skeleton({ className = "" }: { className?: string }) {
  return <div className={`skeleton ${className}`} aria-hidden />;
}

/** Grid de KPIs do dashboard. */
export function SkeletonKpis({ n = 4 }: { n?: number }) {
  return (
    <div className="grid grid-cols-[repeat(auto-fit,minmax(150px,1fr))] gap-3">
      {Array.from({ length: n }, (_, i) => (
        <Skeleton key={i} className="h-24 rounded-lg" />
      ))}
    </div>
  );
}

/** Linhas de listagem. */
export function SkeletonRows({ n = 6 }: { n?: number }) {
  return (
    <div className="grid gap-2">
      {Array.from({ length: n }, (_, i) => (
        <Skeleton key={i} className="h-row rounded-md" />
      ))}
    </div>
  );
}

/** Página de listagem completa (filtros + linhas). */
export function SkeletonListagem() {
  return (
    <div className="grid gap-4">
      <div className="flex gap-2">
        <Skeleton className="h-9 flex-1 rounded-md" />
        <Skeleton className="h-9 w-28 rounded-md" />
        <Skeleton className="h-9 w-28 rounded-md" />
      </div>
      <SkeletonRows n={8} />
    </div>
  );
}

/** Grid de gráficos do dashboard. */
export function SkeletonCharts({ n = 4 }: { n?: number }) {
  return (
    <div className="grid grid-cols-[repeat(auto-fit,minmax(290px,1fr))] gap-3">
      {Array.from({ length: n }, (_, i) => (
        <Skeleton key={i} className="h-56 rounded-lg" />
      ))}
    </div>
  );
}
