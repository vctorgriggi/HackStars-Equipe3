"use client";

// Toggle 40×22 do handoff sobre Base UI Switch (teclado + ARIA de graça).
// Thumb anda por transform (composita) em vez de left; alvo de toque de
// 48px vem do wrapper de quem usa (linha inteira clicável) ou do padding.

import { Switch } from "@base-ui/react/switch";

export function ToggleSwitch({
  checked,
  onCheckedChange,
  disabled,
  label,
}: {
  checked: boolean;
  onCheckedChange: (v: boolean) => void;
  disabled?: boolean;
  label: string;
}) {
  return (
    <Switch.Root
      checked={checked}
      onCheckedChange={onCheckedChange}
      disabled={disabled}
      aria-label={label}
      className="relative h-[22px] w-10 flex-none cursor-pointer rounded-full border border-line bg-surface-3 transition-colors duration-300 data-[checked]:bg-brand-medium disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-none focus-visible:[box-shadow:var(--ring-focus)]"
      style={{ transitionTimingFunction: "var(--ease-standard)" }}
    >
      <Switch.Thumb
        className="absolute left-0.5 top-0.5 h-4 w-4 rounded-full bg-white transition-transform duration-300 data-[checked]:translate-x-[18px]"
        style={{
          boxShadow: "var(--shadow-1)",
          transitionTimingFunction: "var(--ease-standard)",
        }}
      />
    </Switch.Root>
  );
}
