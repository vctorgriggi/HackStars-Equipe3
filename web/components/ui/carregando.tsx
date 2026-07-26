"use client";

import { juntarClasses } from "@/lib/classes";

/**
 * Estados de espera.
 *
 * Skeleton em vez de spinner solto onde o formato do conteúdo é conhecido: a
 * tela não "pula" quando o dado chega, e o operador entende que está carregando
 * a lista de campos, não travando.
 */

export function Esqueleto({ className }: { className?: string }) {
  return (
    <div
      aria-hidden
      className={juntarClasses(
        "animate-pulse rounded-lg bg-superficie-2",
        className,
      )}
    />
  );
}

/** Bloco de linhas — para listas (campos conferidos, passagens, peças). */
export function Carregando({
  linhas = 3,
  rotulo = "Carregando…",
  className,
}: {
  linhas?: number;
  rotulo?: string;
  className?: string;
}) {
  return (
    <div
      role="status"
      aria-live="polite"
      aria-label={rotulo}
      className={juntarClasses("space-y-2", className)}
    >
      {Array.from({ length: linhas }).map((_, indice) => (
        <Esqueleto key={indice} className="h-16 w-full" />
      ))}
      <span className="sr-only">{rotulo}</span>
    </div>
  );
}

/**
 * Espera de AÇÃO CARA (upload, chamada de visão): diz o que está acontecendo,
 * porque aqui a impaciência custa crédito AWS — operador que acha que travou
 * dispara de novo.
 */
export function CarregandoAcao({
  mensagem,
  className,
}: {
  mensagem: string;
  className?: string;
}) {
  return (
    <div
      role="status"
      aria-live="polite"
      className={juntarClasses(
        "flex items-center gap-3 rounded-xl border border-borda bg-superficie-2 p-4 text-sm text-conteudo",
        className,
      )}
    >
      <span
        aria-hidden
        className="size-5 animate-spin rounded-full border-2 border-acento border-t-transparent"
      />
      {mensagem}
    </div>
  );
}

/** Barra de progresso determinada (upload de foto tem fração conhecida). */
export function BarraDeProgresso({
  fracao,
  rotulo,
  className,
}: {
  /** 0..1 */
  fracao: number;
  rotulo?: string;
  className?: string;
}) {
  const porcento = Math.max(0, Math.min(100, Math.round(fracao * 100)));

  return (
    <div className={className}>
      {rotulo ? (
        <div className="mb-1 flex justify-between text-xs text-conteudo-suave">
          <span>{rotulo}</span>
          <span className="numeros">{porcento}%</span>
        </div>
      ) : null}
      <div
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={porcento}
        className="h-2 w-full overflow-hidden rounded-full bg-superficie-2"
      >
        <div
          className="h-full rounded-full bg-acento transition-[width] duration-200"
          style={{ width: `${porcento}%` }}
        />
      </div>
    </div>
  );
}
