"use client";

import type { ReactNode } from "react";

import { juntarClasses } from "@/lib/classes";

export type TomChip = "neutro" | "acento" | "alerta";

const TONS: Record<TomChip, string> = {
  neutro: "bg-superficie-2 text-conteudo-suave border-borda",
  acento: "bg-acento-fundo text-acento border-acento/40",
  alerta: "bg-nao-conferivel-fundo text-nao-conferivel border-nao-conferivel/40",
};

/** Etiqueta pequena de metadado: etapa do aparelho, vista da foto, driver. */
export function Chip({
  children,
  tom = "neutro",
  className,
  titulo,
}: {
  children: ReactNode;
  tom?: TomChip;
  className?: string;
  titulo?: string;
}) {
  return (
    <span
      title={titulo}
      className={juntarClasses(
        "inline-flex max-w-full items-center gap-1 truncate rounded-full border px-2.5 py-1 text-xs font-medium",
        TONS[tom],
        className,
      )}
    >
      {children}
    </span>
  );
}
