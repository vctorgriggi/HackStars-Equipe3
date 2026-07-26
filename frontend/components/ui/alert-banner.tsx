// Banner de alertas (Dashboard/Transformadores) e de linha parada (Câmeras):
// fundo reading-mismatch-soft + triângulo + conteúdo.

import type { ReactNode } from "react";
import { Icon } from "./icon";

export function AlertBanner({
  title,
  children,
  action,
  pulse = false,
}: {
  title: string;
  children?: ReactNode;
  action?: ReactNode;
  /** dot pulsante (linha parada) no lugar do triângulo */
  pulse?: boolean;
}) {
  return (
    <div
      role="alert"
      className="flex flex-wrap items-center gap-3 rounded-lg border bg-reading-mismatch-soft p-3"
      style={{ borderColor: "var(--color-reading-mismatch)" }}
    >
      {pulse ? (
        <span
          aria-hidden
          className="tv-pulse h-2.5 w-2.5 flex-none rounded-full bg-reading-mismatch"
        />
      ) : (
        <span className="flex-none text-reading-mismatch">
          <Icon name="alert" size={18} />
        </span>
      )}
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-text-1">{title}</p>
        {children}
      </div>
      {action}
    </div>
  );
}
