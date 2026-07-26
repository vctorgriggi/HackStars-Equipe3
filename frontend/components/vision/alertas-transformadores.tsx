"use client";

// Banner de alertas compartilhado por Dashboard e Transformadores: existe
// quando há unidade mismatch/lowconf; chips clicáveis abrem o detalhe.

import Link from "next/link";
import { useTransformadores } from "@/lib/data/use-transformadores";
import { READING_VAR } from "@/lib/domain/status";
import { AlertBanner } from "@/components/ui/alert-banner";

export function AlertasTransformadores() {
  const { data: transformadores = [] } = useTransformadores();
  const alertas = transformadores.filter(
    (t) => t.status === "mismatch" || t.status === "lowconf",
  );
  if (alertas.length === 0) return null;

  return (
    <AlertBanner
      title={`${alertas.length} ${
        alertas.length === 1
          ? "transformador exige"
          : "transformadores exigem"
      } atenção`}
    >
      <div className="mt-1.5 flex flex-wrap gap-1.5">
        {alertas.map((t) => (
          <Link
            key={t.serie}
            href={`/transformadores/${t.serie}`}
            className="t-mono inline-flex items-center gap-1.5 rounded-[var(--radius-pill)] border border-line bg-surface-1 px-2.5 py-1 text-xs text-text-1 hover:bg-surface-2"
          >
            <span
              aria-hidden
              className="h-1.5 w-1.5 rounded-full"
              style={{ background: READING_VAR[t.status] }}
            />
            {t.serie}
            <span className="font-sans text-2xs text-text-3">
              {t.status === "mismatch"
                ? "Reprovado em ensaio"
                : "Divergência de leitura"}
            </span>
          </Link>
        ))}
      </div>
    </AlertBanner>
  );
}
