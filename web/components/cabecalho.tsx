"use client";

/**
 * Cabeçalho compacto e fixo: identidade do app, ETAPA provisionada do aparelho
 * e estado da sessão.
 *
 * A etapa fica sempre visível porque ela muda o significado de tudo que a tela
 * mostra: um `conforme` no gate da adesivação não é o mesmo `conforme` do gate
 * da placa (gap 14 do CLAUDE.md). Operador que não sabe em que etapa o aparelho
 * está tira as fotos erradas.
 */

import Link from "next/link";

import { useAutenticacao } from "@/components/providers";
import { useEtapa } from "@/lib/etapa";
import { Botao, Chip } from "@/components/ui";

export function Cabecalho() {
  const { autenticado, email, sair } = useAutenticacao();
  const { codigo, nome, desconhecida, fixadaPelaUrl } = useEtapa();

  return (
    <header className="sticky top-0 z-20 border-b border-borda bg-superficie/95 backdrop-blur">
      <div className="mx-auto flex w-full max-w-3xl items-center gap-3 px-4 py-2">
        <Link href="/" className="flex min-w-0 flex-col leading-tight">
          <span className="text-sm font-bold tracking-wide text-acento">
            TRAEL
          </span>
          <span className="truncate text-xs text-conteudo-suave">
            Conferência
          </span>
        </Link>

        <div className="ml-auto flex min-w-0 items-center gap-2">
          {codigo ? (
            <Chip
              tom={desconhecida ? "alerta" : "acento"}
              titulo={
                desconhecida
                  ? `A etapa "${codigo}" não existe na linha`
                  : `Etapa deste aparelho: ${codigo}${fixadaPelaUrl ? " (definida pela URL)" : ""}`
              }
            >
              {desconhecida ? "Etapa inválida: " : ""}
              {nome}
            </Chip>
          ) : (
            <Chip titulo="Nenhuma etapa provisionada neste aparelho">
              Sem etapa
            </Chip>
          )}

          {autenticado ? (
            <Botao
              variante="fantasma"
              onClick={sair}
              title={email}
              className="min-h-10 px-2 text-xs"
            >
              Sair
            </Botao>
          ) : null}
        </div>
      </div>
    </header>
  );
}
