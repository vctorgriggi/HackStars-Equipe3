// Segmento de esteira: poço surface-inset + listras animadas. O branco é
// rgba LITERAL de propósito — o poço fica escuro nos DOIS temas
// (--surface-inset é #0c1117 em ambos), então as listras não são tokens.
// 56px nos keyframes = 4 × 14px (comprimento de repetição) → loop perfeito.
// Só animationName é inline; duração/timing vivem em .tv-belt-stripes para o
// prefers-reduced-motion desligar as 5 esteiras com um seletor.

import type { BeltSeg } from "./geometria";

export function Belt({ seg }: { seg: BeltSeg }) {
  const [l, t, w, h, deg, anim] = seg;
  return (
    <div
      aria-hidden
      className="absolute box-border overflow-hidden rounded-xs border border-line-strong bg-surface-inset"
      style={{ left: l, top: t, width: w, height: h }}
    >
      <div
        className="tv-belt-stripes absolute inset-[3px]"
        style={{
          backgroundImage:
            `repeating-linear-gradient(${deg}deg,` +
            "rgba(255,255,255,.28) 0 5px," +
            "rgba(255,255,255,.10) 5px 7px," +
            "transparent 7px 14px)",
          animationName: anim,
        }}
      />
    </div>
  );
}
