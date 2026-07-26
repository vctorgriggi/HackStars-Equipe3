// Casulo padrão das telas: surface-1, borda, radius-lg, shadow-1, padding
// space-4, com título opcional em caps (o "card" que o protótipo repete ~20x).

import type { ReactNode } from "react";

export function SectionCard({
  title,
  action,
  className = "",
  children,
}: {
  title?: string;
  action?: ReactNode;
  className?: string;
  children: ReactNode;
}) {
  return (
    <section
      className={`rounded-lg border border-line bg-surface-1 p-4 shadow-1 ${className}`}
    >
      {(title || action) && (
        <div className="mb-3 flex items-center justify-between gap-2">
          {title && (
            <h2 className="t-caps text-2xs text-text-3">{title}</h2>
          )}
          {action}
        </div>
      )}
      {children}
    </section>
  );
}
