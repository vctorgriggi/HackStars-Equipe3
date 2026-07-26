"use client";

// Sprite viajante — motion animate() imperativo sobre transform (composita;
// left/top custaria layout por frame com as 5 esteiras já pintando no main
// thread). Keyframe from explícito elimina o double-rAF do protótipo, e
// controls.finished substitui o setTimeout de saída. ease linear é
// deliberado: esteira anda em velocidade constante (dist/240 px/s).

import { useLayoutEffect, useRef, useState } from "react";
import Image from "next/image";
import { animate, useReducedMotion } from "motion/react";
import type { MovimentoEsteira } from "@/lib/domain/types";
import fotoTransformador from "@/public/transformador.png";
import { CANVAS, VELOCIDADE_PX_S, centro, destino } from "./geometria";

export function Sprite({
  movimento,
  compact,
}: {
  movimento: MovimentoEsteira | null;
  compact: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const reduzido = useReducedMotion();
  const [visivel, setVisivel] = useState(false);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!movimento || !el) return;

    const { pos } = compact ? CANVAS.compact : CANVAS.desktop;
    const [fx, fy] = centro(pos, movimento.from);
    const [tx, ty] = destino(pos, movimento.to);

    el.style.transform = `translate3d(${fx}px, ${fy}px, 0)`;
    setVisivel(true);

    if (reduzido) {
      // sem viagem: a informação já está na contagem do box e no feed
      el.style.transform = `translate3d(${tx}px, ${ty}px, 0)`;
      const id = setTimeout(() => setVisivel(false), 700);
      return () => clearTimeout(id);
    }

    const duration = Math.hypot(tx - fx, ty - fy) / VELOCIDADE_PX_S;
    const controls = animate(
      el,
      { x: [fx, tx], y: [fy, ty] },
      { duration, ease: "linear" },
    );

    let saida: ReturnType<typeof setTimeout> | undefined;
    controls.finished
      .then(() => {
        saida = setTimeout(() => setVisivel(false), 400);
      })
      .catch(() => {
        // cancelada por movimento novo — normal
      });

    return () => {
      controls.stop();
      clearTimeout(saida);
    };
  }, [movimento, compact, reduzido]);

  return (
    <div
      ref={ref}
      aria-hidden
      className="pointer-events-none absolute left-0 top-0 will-change-transform"
      style={{ zIndex: 4, visibility: visivel ? "visible" : "hidden" }}
    >
      <div className="-translate-x-1/2 -translate-y-[58%]">
        <Image
          src={fotoTransformador}
          alt=""
          className="block h-12 w-auto"
          style={{ filter: "drop-shadow(0 5px 6px rgba(0,0,0,.45))" }}
        />
        {movimento && (
          <span
            className="t-mono absolute left-1/2 top-full -translate-x-1/2 whitespace-nowrap rounded-[var(--radius-pill)] px-1.5 text-2xs text-white"
            style={{ background: "var(--overlay-chip-bg)" }}
          >
            {movimento.serie}
          </span>
        )}
      </div>
    </div>
  );
}
