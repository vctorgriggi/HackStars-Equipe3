// Círculo de iniciais sobre brand-surface (avatar do topo e dos clientes).

export function Avatar({
  iniciais,
  size = 34,
  className = "",
}: {
  iniciais: string;
  size?: number;
  className?: string;
}) {
  return (
    <span
      aria-hidden
      className={`t-mono inline-flex flex-none items-center justify-center rounded-full bg-brand-surface text-xs font-semibold text-text-1 ${className}`}
      style={{
        width: size,
        height: size,
        border: "1px solid var(--brand-surface-border)",
      }}
    >
      {iniciais}
    </span>
  );
}
