"use client";

// Pill switcher (período do dashboard, abas de câmeras) — Base UI
// ToggleGroup: seleção única, item ativo = surface-1 + shadow-1.

import { ToggleGroup } from "@base-ui/react/toggle-group";
import { Toggle } from "@base-ui/react/toggle";

export interface PillOption {
  value: string;
  label: string;
}

export function PillSwitcher({
  value,
  onValueChange,
  options,
  ariaLabel,
}: {
  value: string;
  onValueChange: (value: string) => void;
  options: PillOption[];
  ariaLabel: string;
}) {
  return (
    <ToggleGroup
      value={[value]}
      onValueChange={(v) => {
        const next = (v as string[])[0];
        if (next) onValueChange(next);
      }}
      aria-label={ariaLabel}
      className="inline-flex items-center gap-0.5 rounded-[var(--radius-pill)] border border-line bg-surface-2 p-0.5"
    >
      {options.map((o) => (
        <Toggle
          key={o.value}
          value={o.value}
          aria-label={o.label}
          className="min-h-8 cursor-pointer rounded-[var(--radius-pill)] px-3 text-sm text-text-3 transition-colors duration-300 data-[pressed]:bg-surface-1 data-[pressed]:text-text-1 data-[pressed]:shadow-1 focus-visible:outline-none focus-visible:[box-shadow:var(--ring-focus)]"
        >
          {o.label}
        </Toggle>
      ))}
    </ToggleGroup>
  );
}
