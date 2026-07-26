// Estado vazio do handoff: círculo 56px + ícone + título + auxiliar + ação.

import type { ReactNode } from "react";
import { Icon } from "./icon";

export function EmptyState({
  icon,
  title,
  description,
  action,
}: {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: { label: string; onClick: () => void };
}) {
  return (
    <div className="flex flex-col items-center gap-3 px-4 py-16 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-full border border-line bg-surface-2 text-text-3">
        {icon ?? <Icon name="search" size={22} />}
      </div>
      <p className="text-md font-semibold text-text-1">{title}</p>
      {description && (
        <p className="max-w-[340px] text-sm text-text-3">{description}</p>
      )}
      {action && (
        <button
          type="button"
          onClick={action.onClick}
          className="h-10 rounded-md border border-line-strong px-4 text-sm font-medium text-text-1 hover:bg-surface-2 focus-visible:outline-none focus-visible:[box-shadow:var(--ring-focus)]"
        >
          {action.label}
        </button>
      )}
    </div>
  );
}
