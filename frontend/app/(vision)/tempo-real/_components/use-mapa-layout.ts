"use client";

// Medição do container do mapa: compact < 600px, scale = min(1, w/base).
// 1ª medição SÍNCRONA em useLayoutEffect (o ResizeObserver só dispara depois
// do primeiro frame — sem isto o celular pinta um quadro em layout desktop).
// Este é o ÚNICO lugar do app onde medição JS é legítima: o scale numérico
// alimenta transform/clipper, coisa que container query não entrega.

import { useLayoutEffect, useState, type RefObject } from "react";
import { CANVAS, LIMIAR_COMPACT } from "./geometria";

export interface MapaLayout {
  compact: boolean;
  scale: number;
}

export function useMapaLayout(ref: RefObject<HTMLElement | null>): MapaLayout {
  const [layout, setLayout] = useState<MapaLayout>({
    compact: false,
    scale: 1,
  });

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;

    const aplicar = (largura: number) => {
      if (largura <= 0) return;
      const compact = largura < LIMIAR_COMPACT;
      const base = compact ? CANVAS.compact.w : CANVAS.desktop.w;
      const scale = Math.min(1, largura / base);
      setLayout((prev) =>
        prev.compact === compact && Math.abs(prev.scale - scale) <= 0.01
          ? prev
          : { compact, scale },
      );
    };

    aplicar(el.getBoundingClientRect().width);

    const ro = new ResizeObserver(([entry]) => {
      aplicar(entry.contentBoxSize?.[0]?.inlineSize ?? entry.contentRect.width);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [ref]);

  return layout;
}
