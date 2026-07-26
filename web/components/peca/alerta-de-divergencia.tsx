"use client";

/**
 * O ALERTA (critério 6 do SPEC): a última conferência da peça, gritada FORA da
 * tela de veredito.
 *
 * Regra de ouro na prática: este bloco não decide nada — lê `vereditoGeral` da
 * conferência mais recente que a API devolveu (a primeira de
 * `GET /transformadores/:id/conferencias`, que vem em ordem DESC) e escolhe a
 * cor semântica correspondente. Nenhuma comparação, nenhum limiar, nenhuma
 * agregação acontece aqui.
 *
 * Duas honestidades que o gap 14 do CLAUDE.md exige:
 * 1. a ETAPA sempre aparece junto do veredito — `conforme` de um gate parcial
 *    NÃO atesta a peça inteira, e um banner verde sem etapa mentiria;
 * 2. peça nunca conferida não é "ok": é ausência de conferência, e o bloco diz
 *    isso em tom neutro em vez de ficar invisível.
 */

import { SeloVeredito } from "@/components/ui";
import { juntarClasses } from "@/lib/classes";
import { comoVeredito, type ConferenciaResumo } from "@/lib/tipos";

import { descreverEtapa, formatarDataHora } from "./formato";

const MOLDURA: Record<string, string> = {
  divergente: "border-2 border-divergente bg-divergente-fundo text-divergente",
  nao_conferivel:
    "border border-nao-conferivel/50 bg-nao-conferivel-fundo text-nao-conferivel",
  conforme: "border border-conforme/40 bg-conforme-fundo text-conforme",
};

const NEUTRA = "border border-borda bg-superficie-2 text-conteudo-suave";

const TITULO: Record<string, string> = {
  divergente: "Pare a peça: a última conferência divergiu",
  nao_conferivel: "A última conferência não pôde afirmar",
  conforme: "Última conferência conforme",
};

const ACAO: Record<string, string> = {
  divergente:
    "A peça está gravada diferente da etiqueta. Não libere para a próxima etapa até corrigir e conferir de novo.",
  nao_conferivel:
    "Algum campo ficou sem afirmação (foto ruim, leitura sem corroboração ou baixa confiança). Confira a foto ou refotografe a peça.",
  conforme:
    "Bateu com a etiqueta no que esta etapa cobre — veja abaixo qual recorte foi avaliado.",
};

export function AlertaDeDivergencia({
  ultima,
}: {
  /** A conferência mais recente da peça; `null` = nunca foi conferida. */
  ultima: ConferenciaResumo | null;
}) {
  if (!ultima) {
    return (
      <div
        role="status"
        className={juntarClasses("rounded-2xl p-4 text-sm", NEUTRA)}
      >
        <p className="font-semibold text-conteudo">
          Esta peça ainda não foi conferida.
        </p>
        <p className="mt-1">
          Não há veredito para exibir — ausência de conferência não é peça
          aprovada.
        </p>
      </div>
    );
  }

  const classe = comoVeredito(ultima.vereditoGeral);
  const moldura = classe ? MOLDURA[classe] : NEUTRA;

  return (
    <div
      role={classe === "divergente" ? "alert" : "status"}
      className={juntarClasses("rounded-2xl p-4", moldura)}
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p
          className={juntarClasses(
            "font-bold",
            classe === "divergente" ? "text-xl" : "text-base",
          )}
        >
          {classe ? TITULO[classe] : "Última conferência sem veredito gravado"}
        </p>
        <SeloVeredito
          veredito={ultima.vereditoGeral}
          tamanho={classe === "divergente" ? "medio" : "pequeno"}
        />
      </div>

      <p className="mt-2 text-sm">
        {classe
          ? ACAO[classe]
          : "A conferência existe, mas o veredito não foi gravado. Abra o detalhe e confira campo a campo."}
      </p>

      <p className="mt-3 text-xs opacity-80">
        Etapa: <strong>{descreverEtapa(ultima.checkpoint)}</strong> ·{" "}
        {formatarDataHora(ultima.createdAt)}
        {ultima.checkpoint ? (
          <>
            {" "}
            — este veredito cobre o recorte desta etapa, não necessariamente a
            peça inteira.
          </>
        ) : null}
      </p>
    </div>
  );
}
