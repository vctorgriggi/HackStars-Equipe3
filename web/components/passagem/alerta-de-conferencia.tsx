"use client";

/**
 * O ALERTA DO SCAN — critério 6 do SPEC.
 *
 * "Scan em checkpoint de peça cuja última conferência foi `divergente` exibe o
 * alerta no ato." No fluxo TRAEL, divergência PARA A PRODUÇÃO até a correção; o
 * bloqueio automático de avanço é rodada futura, então este banner é o que
 * sustenta a parada humana. Por isso ele é gritante de propósito: vermelho,
 * largura inteira, maiúsculas, `role="alert"` e vibração no aparelho.
 *
 * O QUE ESTE COMPONENTE NÃO FAZ (regra de ouro): não compara nada, não lê
 * campo, não olha confiança. Ele recebe o `ultimaConferencia` que o
 * `POST /passagens/registrar` já devolveu — o veredito é o que a engine gravou,
 * e aqui só se escolhe a cor e a frase.
 *
 * Os quatro estados vêm do dado, não de heurística:
 *
 * | `vereditoGeral`  | tela                                            |
 * | ---------------- | ----------------------------------------------- |
 * | `divergente`     | banner VERMELHO: não avançar                    |
 * | `nao_conferivel` | banner ÂMBAR: exige conferência humana          |
 * | `conforme`       | verde COM a ressalva de cobertura (gap 14)      |
 * | `null` / outro   | neutro: peça sem veredito conhecido             |
 *
 * A ressalva do `conforme` não é preciosismo: a conferência pode ter sido
 * parcial (o gate da adesivação confere 3 chumbados e jamais viu a placa), e a
 * linha `conferencia` não guarda a cobertura — só a etapa. "Conforme" sem dizer
 * ONDE seria um falso OK de interface.
 */

import { useEffect } from "react";
import Link from "next/link";

import { Aviso, SeloVeredito } from "@/components/ui";
import { juntarClasses } from "@/lib/classes";
import type { ConferenciaResumo } from "@/lib/tipos";
import { comoVeredito } from "@/lib/tipos";

import { formatarDataHora } from "./formato";

export interface AlertaDeConferenciaProps {
  /** Como veio de `POST /passagens/registrar`; `null` = peça nunca conferida. */
  ultimaConferencia: ConferenciaResumo | null;
  /** Para o link "ver a peça" — a tela da peça abre por número de série. */
  numeroSerie: string;
}

/**
 * Vibração curta-curta-longa no `divergente`. A linha é barulhenta e o operador
 * pode estar olhando a peça, não a tela. `vibrate` não existe em todo navegador
 * (iOS não tem) — por isso a checagem; é reforço, nunca o canal principal.
 */
function vibrarSePuder(padrao: number[]): void {
  if (typeof navigator === "undefined") return;
  try {
    navigator.vibrate?.(padrao);
  } catch {
    /* aparelho sem motor de vibração ou permissão negada: segue só o visual */
  }
}

/** Linha "Conferência de <etapa> em <data hora>" — etapa SEMPRE junto (gap 14). */
function ProcedenciaDoVeredito({
  conferencia,
}: {
  conferencia: ConferenciaResumo;
}) {
  return (
    <p className="mt-1 text-sm">
      {conferencia.checkpoint
        ? `Conferência da etapa ${conferencia.checkpoint.nome}`
        : "Conferência da peça inteira"}{" "}
      em <span className="numeros">{formatarDataHora(conferencia.createdAt)}</span>.
    </p>
  );
}

function LinkDaPeca({
  numeroSerie,
  className,
}: {
  numeroSerie: string;
  className?: string;
}) {
  return (
    <Link
      href={`/peca?numeroSerie=${encodeURIComponent(numeroSerie)}`}
      className={juntarClasses(
        "mt-3 inline-flex min-h-12 items-center justify-center rounded-xl border-2 border-current px-4 font-semibold",
        className,
      )}
    >
      Ver a peça e o veredito →
    </Link>
  );
}

export function AlertaDeConferencia({
  ultimaConferencia,
  numeroSerie,
}: AlertaDeConferenciaProps) {
  const veredito = comoVeredito(ultimaConferencia?.vereditoGeral);

  // Só o veredito nas dependências: a cada scan novo este componente é
  // remontado (a tela volta ao scanner entre uma peça e outra), então não há
  // risco de o alerta de uma peça deixar de vibrar por causa da anterior.
  useEffect(() => {
    if (veredito === "divergente") vibrarSePuder([220, 90, 220, 90, 420]);
    else if (veredito === "nao_conferivel") vibrarSePuder([160]);
  }, [veredito]);

  /* --- peça nunca conferida ------------------------------------------ */
  if (!ultimaConferencia) {
    return (
      <Aviso tom="neutro">
        Esta peça ainda não tem conferência registrada. A passagem foi gravada;
        o veredito de identidade só existe depois que alguém conferir a peça.
      </Aviso>
    );
  }

  /* --- DIVERGENTE: o alerta do critério 6 ----------------------------- */
  if (veredito === "divergente") {
    return (
      <div
        role="alert"
        aria-live="assertive"
        className="rounded-2xl border-4 border-divergente bg-divergente-fundo p-4 text-divergente shadow-cartao"
      >
        <p className="text-xs font-bold uppercase tracking-[0.2em] opacity-80">
          Alerta desta peça
        </p>
        <p className="mt-1 text-2xl leading-tight font-extrabold uppercase tracking-wide">
          Peça com divergência aberta
        </p>
        <p className="mt-1 text-xl font-extrabold uppercase tracking-wide">
          Não avançar
        </p>

        <p className="mt-3 text-sm font-medium">
          A peça está gravada diferente da etiqueta. Ela para aqui até a
          correção — chame o responsável pela etapa.
        </p>

        <ProcedenciaDoVeredito conferencia={ultimaConferencia} />

        <LinkDaPeca numeroSerie={numeroSerie} />
      </div>
    );
  }

  /* --- NÃO CONFERÍVEL: olho humano antes de seguir -------------------- */
  if (veredito === "nao_conferivel") {
    return (
      <div
        role="alert"
        aria-live="assertive"
        className="rounded-2xl border-2 border-nao-conferivel bg-nao-conferivel-fundo p-4 text-nao-conferivel shadow-cartao"
      >
        <p className="text-xs font-bold uppercase tracking-[0.2em] opacity-80">
          Alerta desta peça
        </p>
        <p className="mt-1 text-xl leading-tight font-extrabold uppercase tracking-wide">
          Exige conferência humana
        </p>

        <p className="mt-3 text-sm font-medium">
          A última conferência não conseguiu afirmar todos os campos. Não é
          aprovação: confira a peça contra a etiqueta antes de deixá-la avançar.
        </p>

        <ProcedenciaDoVeredito conferencia={ultimaConferencia} />

        <LinkDaPeca numeroSerie={numeroSerie} />
      </div>
    );
  }

  /* --- CONFORME: com a ressalva de cobertura (gap 14) ----------------- */
  if (veredito === "conforme") {
    return (
      <div className="rounded-2xl border border-conforme/40 bg-conforme-fundo p-4 text-conforme">
        <div className="flex flex-wrap items-center gap-2">
          <SeloVeredito veredito="conforme" />
          <span className="text-sm font-semibold">
            Última conferência sem divergência.
          </span>
        </div>

        <ProcedenciaDoVeredito conferencia={ultimaConferencia} />

        <p className="mt-2 text-sm">
          {ultimaConferencia.checkpoint
            ? `Atenção: este conforme é do gate ${ultimaConferencia.checkpoint.nome} — cobre só o que aquela etapa confere, não a peça inteira.`
            : "Cobertura: conferência sem etapa fixada, sobre a checklist inteira do projeto."}
        </p>

        <Link
          href={`/peca?numeroSerie=${encodeURIComponent(numeroSerie)}`}
          className="mt-2 inline-block text-sm font-semibold underline underline-offset-4"
        >
          Ver a peça e o veredito
        </Link>
      </div>
    );
  }

  /* --- veredito desconhecido: nunca inventar cor ---------------------- */
  return (
    <Aviso tom="neutro">
      A última conferência desta peça está sem veredito legível
      {ultimaConferencia.checkpoint
        ? ` (etapa ${ultimaConferencia.checkpoint.nome})`
        : ""}
      . Abra a peça e confira antes de liberar.
    </Aviso>
  );
}
