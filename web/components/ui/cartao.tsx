"use client";

import type { ReactNode } from "react";
import Link from "next/link";

import { juntarClasses } from "@/lib/classes";

export interface CartaoProps {
  children: ReactNode;
  className?: string;
  /** Menos respiro interno — para listas densas (campos, passagens). */
  compacto?: boolean;
  /** Borda colorida à esquerda: destaque semântico sem repintar o cartão. */
  faixa?: "conforme" | "divergente" | "nao_conferivel" | "incoerencia" | "acento";
}

const FAIXAS: Record<NonNullable<CartaoProps["faixa"]>, string> = {
  conforme: "border-l-4 border-l-conforme",
  divergente: "border-l-4 border-l-divergente",
  nao_conferivel: "border-l-4 border-l-nao-conferivel",
  incoerencia: "border-l-4 border-l-incoerencia",
  acento: "border-l-4 border-l-acento",
};

/** Superfície padrão do app: onde qualquer bloco de conteúdo mora. */
export function Cartao({ children, className, compacto, faixa }: CartaoProps) {
  return (
    <section
      className={juntarClasses(
        "rounded-2xl border border-borda bg-superficie shadow-cartao",
        compacto ? "p-3" : "p-4",
        faixa && FAIXAS[faixa],
        className,
      )}
    >
      {children}
    </section>
  );
}

export interface CabecalhoCartaoProps {
  titulo: ReactNode;
  descricao?: ReactNode;
  acao?: ReactNode;
}

export function CabecalhoCartao({
  titulo,
  descricao,
  acao,
}: CabecalhoCartaoProps) {
  return (
    <header className="mb-3 flex items-start justify-between gap-3">
      <div className="min-w-0">
        <h2 className="text-base font-semibold text-conteudo">{titulo}</h2>
        {descricao ? (
          <p className="mt-0.5 text-sm text-conteudo-suave">{descricao}</p>
        ) : null}
      </div>
      {acao}
    </header>
  );
}

export interface CartaoAcaoProps {
  href: string;
  titulo: string;
  descricao: string;
  /** Emoji ou ícone à esquerda; decorativo. */
  icone?: ReactNode;
}

/**
 * Cartão grande e clicável da home. Alvo de toque enorme de propósito: são as
 * três decisões que o operador toma ao pegar o celular.
 */
export function CartaoAcao({
  href,
  titulo,
  descricao,
  icone,
}: CartaoAcaoProps) {
  return (
    <Link
      href={href}
      className={juntarClasses(
        "flex min-h-24 items-center gap-4 rounded-2xl border border-borda",
        "bg-superficie p-4 shadow-cartao transition-colors",
        "hover:border-acento hover:bg-acento-fundo active:translate-y-px",
      )}
    >
      {icone ? (
        <span
          aria-hidden
          className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-acento-fundo text-2xl"
        >
          {icone}
        </span>
      ) : null}
      <span className="min-w-0">
        <span className="block text-lg font-semibold text-conteudo">
          {titulo}
        </span>
        <span className="block text-sm text-conteudo-suave">{descricao}</span>
      </span>
      <span aria-hidden className="ml-auto text-2xl text-conteudo-suave">
        ›
      </span>
    </Link>
  );
}
