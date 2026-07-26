"use client";

import type { ReactNode } from "react";

import { juntarClasses } from "@/lib/classes";
import { ehErroApi } from "@/lib/api";

export type TomAviso = "ok" | "erro" | "neutro" | "alerta";

const TONS: Record<TomAviso, string> = {
  ok: "bg-conforme-fundo text-conforme border-conforme/40",
  erro: "bg-divergente-fundo text-divergente border-divergente",
  alerta: "bg-nao-conferivel-fundo text-nao-conferivel border-nao-conferivel/40",
  neutro: "bg-superficie-2 text-conteudo-suave border-borda",
};

const ICONES: Record<TomAviso, string> = {
  ok: "✓",
  erro: "!",
  alerta: "!",
  neutro: "i",
};

export interface AvisoProps {
  tom?: TomAviso;
  children: ReactNode;
  /**
   * Texto CRU do erro, mostrado pequeno abaixo da mensagem. O operador ignora;
   * o suporte precisa dele (`HTTP 422 — etapaCodigo: etapa-desconhecida: x`).
   */
  detalhe?: ReactNode;
  className?: string;
}

/** Faixa de mensagem: resultado, erro traduzido, instrução ou alerta. */
export function Aviso({
  tom = "neutro",
  children,
  detalhe,
  className,
}: AvisoProps) {
  return (
    <div
      role={tom === "erro" ? "alert" : "status"}
      className={juntarClasses(
        "flex gap-3 rounded-xl border p-3 text-sm",
        TONS[tom],
        className,
      )}
    >
      <span
        aria-hidden
        className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full border border-current text-xs font-bold"
      >
        {ICONES[tom]}
      </span>
      <div className="min-w-0">
        <div className="font-medium">{children}</div>
        {detalhe ? (
          <p className="mt-1 font-mono text-xs break-words opacity-70">
            {detalhe}
          </p>
        ) : null}
      </div>
    </div>
  );
}

/**
 * Erro de chamada da API pronto para a tela: mensagem de chão de fábrica em
 * cima, texto cru discreto embaixo. Aceita qualquer `unknown` para poder ser
 * ligado direto no `error` do React Query.
 */
export function AvisoDeErro({
  erro,
  className,
}: {
  erro: unknown;
  className?: string;
}) {
  if (!erro) return null;

  if (ehErroApi(erro)) {
    return (
      <Aviso tom="erro" detalhe={erro.detalhe} className={className}>
        {erro.mensagem}
      </Aviso>
    );
  }

  return (
    <Aviso tom="erro" detalhe={String(erro)} className={className}>
      Algo deu errado nesta tela.
    </Aviso>
  );
}
