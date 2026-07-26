"use client";

/**
 * O FLUXO GUIADO DE CONFERÊNCIA (T3.1 → T3.3).
 *
 * Quatro passos numa tela só: etapa → etiqueta → fotos → conferir, e então o
 * veredito. Guiado porque a bancada provou que fluxo livre não funciona no
 * gate: o operador está em pé, com a peça na frente, e cada decisão que a tela
 * empurra para ele é uma chance de fotografar a vista errada ou disparar a
 * visão paga sem ter o que ler.
 *
 * Este componente é o único que ORQUESTRA. Cada passo é burro de propósito
 * (recebe dado, chama ação do store), e a única chamada que gasta crédito sai
 * daqui, num lugar só.
 *
 * A recuperação automática do `foto-evidencia-de-outra-conferencia` também vive
 * aqui: uma FotoEvidencia lastreia UMA conferência (é o que mantém a trilha
 * auditável), então reaproveitar foto é recusado pela API — mas o arquivo
 * original continua na sessão, e refazer o upload é conserto de máquina, não
 * trabalho de operador.
 */

import { useState } from "react";
import { useMutation } from "@tanstack/react-query";

import { ehErroApi, ErroApi, executarConferenciaComFotos } from "@/lib/api";
import { useEtapa } from "@/lib/etapa";
import { juntarClasses } from "@/lib/classes";
import { Aviso } from "@/components/ui";

import { reenviarTodasAsFotos } from "./envio";
import { PassoConferir } from "./passo-conferir";
import { PassoEtapa } from "./passo-etapa";
import { PassoEtiqueta } from "./passo-etiqueta";
import { PassoFotos } from "./passo-fotos";
import {
  PASSOS,
  ROTULO_PASSO,
  definirResultado,
  idsDasFotosProntas,
  irParaPasso,
  lerSessao,
  reiniciarConferencia,
  useSessaoConferencia,
  type PassoConferencia,
  type PassoDoStepper,
  type SessaoConferencia,
} from "./sessao";
import { TelaDeVeredito } from "./veredito";

/** Códigos que apontam para a etiqueta — o erro volta para o passo 2. */
const CODIGOS_DA_ETIQUETA = new Set([
  "payload-vazio",
  "formato-desconhecido",
  "payload-somente-codigo",
  "campos-obrigatorios-ausentes",
  "posicional-numero-serie-ausente",
  "posicional-numero-serie-invalido",
  "posicional-patrimonio-ausente",
  "posicional-patrimonio-invalido",
]);

/** O que EXATAMENTE foi mandado à API — muda quando a causa do erro muda. */
function assinaturaDaSessao(sessao: SessaoConferencia): string {
  return [
    sessao.etapaCodigo ?? "",
    sessao.payloadQr ?? "",
    idsDasFotosProntas(sessao).join(","),
  ].join("|");
}

export function FluxoDeConferencia() {
  const sessao = useSessaoConferencia();
  const { nome: nomeDaEtapaDoAparelho, etapas } = useEtapa();

  const [avisoDeReenvio, setAvisoDeReenvio] = useState<string | null>(null);
  const [falha, setFalha] = useState<{ assinatura: string; erro: unknown } | null>(
    null,
  );

  const disparo = useMutation({
    mutationFn: async () => {
      const atual = lerSessao();
      if (!atual.payloadQr) {
        throw new Error("Sem etiqueta lida.");
      }

      const entrada = {
        payloadQr: atual.payloadQr,
        etapaCodigo: atual.etapaCodigo ?? undefined,
      };

      const idsOriginais = idsDasFotosProntas(atual);

      try {
        return await executarConferenciaComFotos({
          ...entrada,
          fotoEvidenciaIds: idsOriginais,
        });
      } catch (falha) {
        if (
          !ehErroApi(falha) ||
          falha.codigo !== "foto-evidencia-de-outra-conferencia"
        ) {
          throw falha;
        }

        // Conserto de máquina: as MESMAS fotos sobem de novo como evidências
        // novas e o disparo se repete UMA vez. Não é retry cego — é a única
        // causa conhecida com correção determinística.
        setAvisoDeReenvio(
          "Alguma foto já estava presa a outra conferência. Enviei as mesmas fotos de novo e repeti a conferência — nada precisa ser refeito.",
        );

        const { ids: novosIds, tentadas } = await reenviarTodasAsFotos();

        // O conserto só vale se ele CONSERTOU. Reenvio que subiu menos do que
        // a tentativa original (ou nada) e mesmo assim dispararia mandaria à
        // API uma lista curta — no caso de zero, um `fotoEvidenciaIds: []`
        // que volta como 400 cru do class-validator, em inglês, sem dizer ao
        // operador que o problema foi a rede das fotos.
        if (novosIds.length === 0 || novosIds.length < idsOriginais.length) {
          // O aviso otimista ("nada precisa ser refeito") sai da tela: aqui
          // alguma coisa precisa, sim.
          setAvisoDeReenvio(null);
          throw new ErroApi({
            status: 0,
            codigo: "reenvio-incompleto",
            mensagem:
              `O reenvio das evidências falhou (${novosIds.length} de ${tentadas} subiram). ` +
              "Confira a conexão e tente de novo, ou volte às fotos e reenvie as que falharam.",
            detalhe:
              `Reenvio automático após foto-evidencia-de-outra-conferencia: ` +
              `${novosIds.length} de ${tentadas} arquivos subiram; a tentativa original tinha ${idsOriginais.length}. ` +
              "Conferência NÃO disparada (nenhum crédito de visão gasto).",
          });
        }

        return await executarConferenciaComFotos({
          ...entrada,
          fotoEvidenciaIds: novosIds,
        });
      }
    },
    onSuccess: (resultado) => {
      setAvisoDeReenvio(null);
      setFalha(null);
      definirResultado(resultado);
    },
    onError: (erroDoDisparo) => {
      // O erro é gravado JUNTO com a assinatura do que foi enviado. Assim ele
      // desaparece sozinho quando o operador conserta a causa (outra etiqueta,
      // outra foto, outra etapa) — mostrar erro de uma tentativa antiga ao
      // lado do botão de disparar é o caminho curto para o operador achar que
      // conferir "não funciona" e apertar de novo, pagando visão à toa.
      setFalha({ assinatura: assinaturaDaSessao(lerSessao()), erro: erroDoDisparo });
    },
  });

  const erro =
    falha && falha.assinatura === assinaturaDaSessao(sessao)
      ? falha.erro
      : null;

  const erroDaEtiqueta =
    ehErroApi(erro) && erro.codigo && CODIGOS_DA_ETIQUETA.has(erro.codigo)
      ? erro
      : null;

  /** Nome da etapa DESTA conferência (a do aparelho pode ter mudado depois). */
  const nomeDaEtapa = sessao.etapaCodigo
    ? (etapas.find((item) => item.codigo === sessao.etapaCodigo)?.nome ??
      sessao.etapaCodigo)
    : (nomeDaEtapaDoAparelho ?? null);

  const novaConferencia = () => {
    disparo.reset();
    setAvisoDeReenvio(null);
    setFalha(null);
    reiniciarConferencia({ manterEtapa: true });
  };

  if (sessao.passo === "veredito" && sessao.resultado) {
    return (
      <TelaDeVeredito
        resultado={sessao.resultado}
        aoNovaConferencia={novaConferencia}
      />
    );
  }

  return (
    <div className="space-y-4">
      <TrilhaDePassos passo={sessao.passo} sessao={sessao} />

      {sessao.passo === "etapa" ? <PassoEtapa /> : null}

      {sessao.passo === "etiqueta" ? (
        <PassoEtiqueta
          payloadQr={sessao.payloadQr}
          erroDaEtiqueta={erroDaEtiqueta}
        />
      ) : null}

      {sessao.passo === "fotos" ? (
        sessao.payloadQr ? (
          <PassoFotos sessao={sessao} nomeDaEtapa={nomeDaEtapa} />
        ) : (
          <Aviso tom="alerta">
            Leia a etiqueta antes de fotografar — é ela que diz o que a peça
            deveria ter.
          </Aviso>
        )
      ) : null}

      {sessao.passo === "conferir" ? (
        <PassoConferir
          sessao={sessao}
          nomeDaEtapa={nomeDaEtapa}
          disparando={disparo.isPending}
          // O erro aparece nos DOIS lugares de propósito: aqui, com o botão
          // que leva ao conserto, e no passo de destino, com o que fazer lá.
          erro={erro}
          avisoDeReenvio={avisoDeReenvio}
          aoDisparar={() => disparo.mutate()}
        />
      ) : null}
    </div>
  );
}

/* ------------------------------------------------------------------ *
 * Trilha dos 4 passos
 * ------------------------------------------------------------------ */

function passoConcluido(
  passo: PassoDoStepper,
  sessao: SessaoConferencia,
): boolean {
  if (passo === "etapa") return sessao.etapaConfirmada;
  if (passo === "etiqueta") return Boolean(sessao.payloadQr);
  if (passo === "fotos") return idsDasFotosProntas(sessao).length > 0;
  return sessao.resultado !== null;
}

function TrilhaDePassos({
  passo,
  sessao,
}: {
  passo: PassoConferencia;
  sessao: SessaoConferencia;
}) {
  return (
    <ol className="flex items-stretch gap-1.5">
      {PASSOS.map((item, indice) => {
        const atual = item === passo;
        const concluido = passoConcluido(item, sessao);
        // Só se navega para trás pelo que já foi respondido: pular passo
        // deixaria o disparo sem etiqueta ou sem foto, e o 422 sairia caro em
        // atenção do operador.
        const alcancavel = concluido || atual;

        return (
          <li key={item} className="min-w-0 flex-1">
            <button
              type="button"
              disabled={!alcancavel}
              onClick={() => irParaPasso(item)}
              aria-current={atual ? "step" : undefined}
              className={juntarClasses(
                "flex min-h-12 w-full flex-col items-center justify-center gap-0.5 rounded-xl border px-1 py-1.5 text-xs font-medium transition-colors",
                atual
                  ? "border-acento bg-acento-fundo text-acento"
                  : concluido
                    ? "border-borda bg-superficie text-conteudo-suave hover:bg-superficie-2"
                    : "border-borda bg-superficie-2 text-conteudo-suave/60",
              )}
            >
              <span aria-hidden className="text-sm font-bold">
                {concluido && !atual ? "✓" : indice + 1}
              </span>
              <span className="truncate">{ROTULO_PASSO[item]}</span>
            </button>
          </li>
        );
      })}
    </ol>
  );
}
