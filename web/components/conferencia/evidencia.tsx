"use client";

/**
 * A EVIDÊNCIA VISUAL: a foto que lastreia a leitura, com um retângulo em cima
 * de onde o número foi lido.
 *
 * Por que isso importa mais do que parece: o veredito da API é uma afirmação
 * sobre uma peça de metal a dois metros do operador. Sem a foto com o destaque,
 * um `divergente` obriga a pessoa a procurar a marcação na peça inteira; com
 * ela, o dedo vai direto no lugar. É também o que torna a conferência
 * auditável depois — a trilha inclui a imagem, não só o número.
 *
 * Duas defesas de propósito:
 *
 * 1. `regiaoLeitura` é JSON em string vindo do Textract. `interpretarRegiaoLeitura`
 *    já devolve `null` em qualquer formato estranho, e aqui as coordenadas ainda
 *    são grampeadas em 0..1. Destaque é enfeite: NUNCA pode derrubar a tela do
 *    veredito, que é a informação que para a linha.
 * 2. A URL da foto EXPIRA em 1 hora (S3 assinado). Quando a imagem falha, a tela
 *    diz isso em vez de mostrar um quadrado quebrado.
 *
 * `next/image` está fora: as URLs são assinadas, de host variável (S3, ou a
 * própria API no driver local), e configurar `remotePatterns` para um host que
 * muda por ambiente não paga o benefício. `<img>` cru é o certo aqui.
 */

/* eslint-disable @next/next/no-img-element */

import { useCallback, useEffect, useState } from "react";

import { juntarClasses } from "@/lib/classes";
import { interpretarRegiaoLeitura, type CaixaDeLeitura } from "@/lib/tipos";

import { rotuloVista } from "./rotulos";

function grampear(valor: number): number {
  return Math.max(0, Math.min(1, valor));
}

/** Caixa em porcentagem, pronta para `style`, ou `null` se não der para desenhar. */
function caixaEmPorcentagem(caixa: CaixaDeLeitura | null) {
  if (!caixa) return null;

  const left = grampear(caixa.Left);
  const top = grampear(caixa.Top);
  const width = grampear(caixa.Width);
  const height = grampear(caixa.Height);

  if (width <= 0 || height <= 0) return null;

  return {
    left: `${left * 100}%`,
    top: `${top * 100}%`,
    width: `${Math.min(1 - left, width) * 100}%`,
    height: `${Math.min(1 - top, height) * 100}%`,
  };
}

interface FotoExibivel {
  url: string;
  fonteFisica: string;
}

/** A imagem com o retângulo por cima — usada na miniatura e no visor cheio. */
function ImagemComDestaque({
  foto,
  regiaoLeitura,
  className,
  aoFalhar,
}: {
  foto: FotoExibivel;
  regiaoLeitura: string | null;
  className?: string;
  aoFalhar: () => void;
}) {
  const caixa = caixaEmPorcentagem(interpretarRegiaoLeitura(regiaoLeitura));

  return (
    // `overflow-hidden`: o realce escurece o resto da foto com uma sombra
    // gigante; sem recorte ela vazaria para fora da imagem.
    <span className="relative block w-full overflow-hidden rounded-lg">
      <img
        src={foto.url}
        alt={`Foto da vista ${rotuloVista(foto.fonteFisica)}`}
        onError={aoFalhar}
        className={juntarClasses("block w-full rounded-lg bg-black/5", className)}
      />
      {caixa ? (
        <span
          aria-hidden
          style={caixa}
          className="pointer-events-none absolute rounded-xs shadow-[0_0_0_9999px_rgba(0,0,0,0.35)] ring-2 ring-white outline-2 outline-divergente"
        />
      ) : null}
    </span>
  );
}

function AvisoDeFotoExpirada() {
  return (
    <p className="rounded-lg border border-borda bg-superficie-2 p-3 text-xs text-conteudo-suave">
      Não consegui carregar esta foto. O link da evidência vale 1 hora — abra a
      conferência de novo pelo histórico da peça para gerar um link novo.
    </p>
  );
}

export interface EvidenciaDaLeituraProps {
  foto: FotoExibivel | null;
  regiaoLeitura: string | null;
  /** Texto do rodapé da miniatura (ex.: o valor lido ali). */
  legenda?: string;
}

/**
 * Miniatura tocável da evidência. Toque abre a foto inteira — em pé, na linha,
 * a miniatura serve para reconhecer, não para ler.
 */
export function EvidenciaDaLeitura({
  foto,
  regiaoLeitura,
  legenda,
}: EvidenciaDaLeituraProps) {
  const [aberta, setAberta] = useState(false);
  const [falhou, setFalhou] = useState(false);

  const marcarFalha = useCallback(() => setFalhou(true), []);

  if (!foto) {
    return (
      <p className="text-xs text-conteudo-suave">
        Sem foto vinculada a esta leitura.
      </p>
    );
  }

  if (falhou) return <AvisoDeFotoExpirada />;

  return (
    <>
      <button
        type="button"
        onClick={() => setAberta(true)}
        className="group w-full max-w-56 overflow-hidden rounded-xl border border-borda bg-superficie-2 p-1 text-left transition-colors hover:border-acento"
      >
        <ImagemComDestaque
          foto={foto}
          regiaoLeitura={regiaoLeitura}
          aoFalhar={marcarFalha}
        />
        <span className="mt-1 flex items-center justify-between gap-2 px-1 pb-0.5 text-xs text-conteudo-suave">
          <span className="truncate">{legenda ?? rotuloVista(foto.fonteFisica)}</span>
          <span aria-hidden className="shrink-0">
            ampliar
          </span>
        </span>
      </button>

      {aberta ? (
        <VisorDeFoto
          foto={foto}
          regiaoLeitura={regiaoLeitura}
          legenda={legenda}
          aoFechar={() => setAberta(false)}
        />
      ) : null}
    </>
  );
}

/** Foto em tela cheia, com o mesmo destaque. Fecha no toque fora ou no Esc. */
function VisorDeFoto({
  foto,
  regiaoLeitura,
  legenda,
  aoFechar,
}: {
  foto: FotoExibivel;
  regiaoLeitura: string | null;
  legenda?: string;
  aoFechar: () => void;
}) {
  const [falhou, setFalhou] = useState(false);
  const marcarFalha = useCallback(() => setFalhou(true), []);

  useEffect(() => {
    const aoTeclar = (evento: KeyboardEvent) => {
      if (evento.key === "Escape") aoFechar();
    };
    window.addEventListener("keydown", aoTeclar);
    return () => window.removeEventListener("keydown", aoTeclar);
  }, [aoFechar]);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`Evidência: ${rotuloVista(foto.fonteFisica)}`}
      onClick={aoFechar}
      className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-3 bg-black/90 p-4"
    >
      <div
        onClick={(evento) => evento.stopPropagation()}
        className="max-h-[80vh] w-full max-w-2xl overflow-auto"
      >
        {falhou ? (
          <AvisoDeFotoExpirada />
        ) : (
          <ImagemComDestaque
            foto={foto}
            regiaoLeitura={regiaoLeitura}
            aoFalhar={marcarFalha}
          />
        )}
      </div>

      <p className="text-center text-sm text-white">
        {legenda ? `${legenda} · ` : ""}
        {rotuloVista(foto.fonteFisica)}
      </p>

      <button
        type="button"
        onClick={aoFechar}
        className="min-h-12 rounded-xl border border-white/40 px-6 text-base font-semibold text-white"
      >
        Fechar
      </button>
    </div>
  );
}
