"use client";

// Box 130×92 do checkpoint. Selectors devolvem PRIMITIVOS (count e hot) —
// um tick re-renderiza só os boxes cujo número mudou. O anel "hot" é o
// ring-focus azul (o HTML do protótipo, linha 1154, vence o README).
// <button> em vez do <div onClick> do protótipo: teclado + nome acessível.

import { memo } from "react";
import { useRealtime } from "@/lib/stores/realtime";
import { BOX_H, BOX_W } from "./geometria";

export const CheckpointBox = memo(function CheckpointBox({
  index,
  nome,
  x,
  y,
  onSelect,
}: {
  index: number;
  nome: string;
  x: number;
  y: number;
  onSelect: (index: number) => void;
}) {
  const n = useRealtime((s) => s.countByStage[index]);
  const hot = useRealtime((s) => s.hot === index);

  return (
    <button
      type="button"
      onClick={() => onSelect(index)}
      title="Ver transformadores nesta etapa"
      className="absolute box-border flex cursor-pointer flex-col items-center justify-center gap-0.5 rounded-md border border-line-strong bg-surface-1 focus-visible:outline-none focus-visible:[box-shadow:var(--ring-focus)]"
      style={{
        left: x,
        top: y,
        width: BOX_W,
        height: BOX_H,
        zIndex: 5,
        boxShadow: hot ? "var(--ring-focus)" : "var(--shadow-1)",
        transition: "box-shadow .4s var(--ease-standard)",
      }}
    >
      <span className="t-caps text-2xs text-text-3">{nome}</span>
      <span
        className="t-mono text-2xl font-bold leading-tight"
        style={{ color: n ? "var(--text-1)" : "var(--text-3)" }}
      >
        {n}
      </span>
      <span className="text-2xs text-text-3">na etapa</span>
    </button>
  );
});
