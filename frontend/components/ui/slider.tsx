"use client";

// Slider do limiar de confiança (50–100) sobre Base UI Slider.

import { Slider as BaseSlider } from "@base-ui/react/slider";

export function Slider({
  value,
  onValueChange,
  min = 50,
  max = 100,
  label,
}: {
  value: number;
  onValueChange: (v: number) => void;
  min?: number;
  max?: number;
  label: string;
}) {
  return (
    <BaseSlider.Root
      value={value}
      min={min}
      max={max}
      onValueChange={(v) => onValueChange(Array.isArray(v) ? v[0] : v)}
      aria-label={label}
      className="w-full"
    >
      <BaseSlider.Control className="flex h-8 w-full touch-none items-center">
        <BaseSlider.Track
          className="relative h-1.5 w-full rounded-full"
          style={{ background: "var(--viz-track)" }}
        >
          <BaseSlider.Indicator className="absolute inset-y-0 rounded-full bg-brand-medium" />
          <BaseSlider.Thumb className="absolute top-1/2 h-5 w-5 -translate-y-1/2 rounded-full border border-line-strong bg-white shadow-2 focus-visible:outline-none focus-visible:[box-shadow:var(--ring-focus)]" />
        </BaseSlider.Track>
      </BaseSlider.Control>
    </BaseSlider.Root>
  );
}
