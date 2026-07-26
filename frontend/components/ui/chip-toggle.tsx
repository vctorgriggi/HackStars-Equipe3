"use client";

// Chip-toggle (campos validados do checkpoint): selecionado = brand-surface
// + brand-surface-border. Base UI Toggle dá aria-pressed e teclado.

import { Toggle } from "@base-ui/react/toggle";

export function ChipToggle({
  pressed,
  onPressedChange,
  children,
}: {
  pressed: boolean;
  onPressedChange: (v: boolean) => void;
  children: React.ReactNode;
}) {
  return (
    <Toggle
      pressed={pressed}
      onPressedChange={onPressedChange}
      className={`inline-flex min-h-9 cursor-pointer items-center rounded-[var(--radius-pill)] border px-3 text-sm transition-colors duration-300 focus-visible:outline-none focus-visible:[box-shadow:var(--ring-focus)] ${
        pressed
          ? "bg-brand-surface text-text-1"
          : "border-line bg-surface-2 text-text-3 hover:bg-surface-3"
      }`}
      style={pressed ? { borderColor: "var(--brand-surface-border)" } : undefined}
    >
      {children}
    </Toggle>
  );
}
