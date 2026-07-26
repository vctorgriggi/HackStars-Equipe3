"use client";

// Banner de alertas (critério 6 do SPEC): peças cuja ÚLTIMA conferência foi
// divergente ou não conferível, direto de GET /conferencias/indicadores —
// o veredito chega gravado pela engine, nada é recalculado aqui. A etapa
// viaja colada ao veredito (gap 14: conforme/divergente de gate parcial diz
// respeito àquele recorte). Chips clicáveis abrem o detalhe da peça.

import Link from "next/link";
import { useIndicadoresApi } from "@/lib/data/use-indicadores-api";
import type { PecaNaLinhaApi } from "@/lib/domain/indicadores-api";
import { VEREDITO_LABELS } from "@/lib/domain/transformador-api";
import { VEREDITO_TO_READING, type Veredito } from "@/lib/domain/types";
import { READING_VAR } from "@/lib/domain/status";
import { AlertBanner } from "@/components/ui/alert-banner";

// Whitelist explícita: `veredito` é string | null no contrato — valor fora
// da união fica de fora em vez de indexar mapa com string arbitrária.
const VEREDITOS_DE_ALERTA = ["divergente", "nao_conferivel"] as const;
type VereditoDeAlerta = (typeof VEREDITOS_DE_ALERTA)[number];

function vereditoDeAlerta(peca: PecaNaLinhaApi): VereditoDeAlerta | null {
  const v = peca.ultimaConferencia?.veredito;
  return (VEREDITOS_DE_ALERTA as readonly string[]).includes(v ?? "")
    ? (v as VereditoDeAlerta)
    : null;
}

export function AlertasTransformadores() {
  const { data, isPending, isError } = useIndicadoresApi();
  // O banner é reforço — quem anuncia carregamento/erro é o corpo da página.
  if (isPending || isError || !data) return null;

  // Divergentes antes de não conferíveis (severidade); dentro de cada grupo,
  // a ordem da API (movimento mais recente primeiro).
  const alertas = VEREDITOS_DE_ALERTA.flatMap((veredito) =>
    data.linha.filter((peca) => vereditoDeAlerta(peca) === veredito),
  );
  if (alertas.length === 0) return null;

  const cortadas = data.totais.pecas - data.linha.length;

  return (
    <AlertBanner
      title={`${alertas.length} ${
        alertas.length === 1
          ? "transformador exige"
          : "transformadores exigem"
      } atenção`}
    >
      <div className="mt-1.5 flex flex-wrap gap-1.5">
        {alertas.map((peca) => {
          const veredito = vereditoDeAlerta(peca) as Veredito;
          const etapa = peca.ultimaConferencia?.etapa;
          return (
            <Link
              key={peca.numeroSerie}
              href={`/transformadores/${peca.numeroSerie}`}
              className="t-mono inline-flex items-center gap-1.5 rounded-[var(--radius-pill)] border border-line bg-surface-1 px-2.5 py-1 text-xs text-text-1 hover:bg-surface-2"
            >
              <span
                aria-hidden
                className="h-1.5 w-1.5 rounded-full"
                style={{ background: READING_VAR[VEREDITO_TO_READING[veredito]] }}
              />
              {peca.numeroSerie}
              <span className="font-sans text-2xs text-text-3">
                {VEREDITO_LABELS[veredito]}
                {etapa ? ` · ${etapa.nome}` : ""}
              </span>
            </Link>
          );
        })}
      </div>
      {cortadas > 0 && (
        <p className="mt-1.5 text-2xs text-text-3">
          Lista limitada às {data.linha.length} peças com movimento mais
          recente — pode haver alertas fora dela.
        </p>
      )}
    </AlertBanner>
  );
}
