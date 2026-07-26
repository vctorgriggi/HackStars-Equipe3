"use client";

// Toggle de tema — o ícone é o mesmo nos dois temas (meia-lua do protótipo),
// então não há mismatch de hidratação a suprimir.

import { useTheme } from "@/lib/stores/theme";
import { Icon } from "@/components/ui/icon";

export function ThemeToggle() {
  const toggle = useTheme((s) => s.toggle);
  return (
    <button
      type="button"
      onClick={toggle}
      aria-label="Alternar tema"
      className="flex h-9 w-9 items-center justify-center rounded-full border border-line bg-surface-2 text-text-2 hover:bg-surface-3 focus-visible:outline-none focus-visible:[box-shadow:var(--ring-focus)]"
    >
      <Icon name="theme" size={16} />
    </button>
  );
}
