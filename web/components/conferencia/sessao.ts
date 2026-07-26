"use client";

/**
 * O ESTADO DA CONFERÊNCIA EM CURSO.
 *
 * Um store externo de módulo (lido com `useSyncExternalStore`), pelo mesmo
 * motivo de `lib/etapa.ts`: a conferência é um trabalho do APARELHO, não de um
 * componente. O operador que sai da tela para ver o histórico da peça e volta
 * não pode perder as fotos que já subiu — cada foto reenviada é upload de rede
 * de fábrica pago em tempo, e refazer o fluxo do zero no gate é o tipo de
 * fricção que faz o operador desistir de conferir.
 *
 * O que ele NÃO faz, de propósito: nada aqui decide veredito, compara valor,
 * aplica limiar ou escolhe quais fotos a etapa exige (isso é
 * `GET /conferencias/plano-de-fotos`). É memória de formulário, só.
 *
 * SOBREVIVE à navegação interna do app (o módulo continua vivo), NÃO sobrevive
 * a um refresh — e isso é intencional: `File` e URL de objeto não são
 * serializáveis, e uma sessão ressuscitada de storage apontaria para
 * `fotoEvidenciaId` que a API já vinculou a outra conferência.
 */

import { useSyncExternalStore } from "react";

import type { ErroApi } from "@/lib/api";
import type { FonteFisica, ResultadoExecucaoComExtracao } from "@/lib/tipos";

/** Os quatro passos guiados; `veredito` é o destino, não um passo do stepper. */
export const PASSOS = ["etapa", "etiqueta", "fotos", "conferir"] as const;

export type PassoDoStepper = (typeof PASSOS)[number];
export type PassoConferencia = PassoDoStepper | "veredito";

export const ROTULO_PASSO: Record<PassoDoStepper, string> = {
  etapa: "Etapa",
  etiqueta: "Etiqueta",
  fotos: "Fotos",
  conferir: "Conferir",
};

export type EstadoDaFoto = "enviando" | "enviada" | "erro";

/** Uma foto do operador, do arquivo local até a evidência criada na API. */
export interface FotoDaSessao {
  /** Id LOCAL da linha na tela (a API tem o dela em `fotoEvidenciaId`). */
  chave: string;
  /**
   * O arquivo original. Guardado depois do upload de propósito: quando a API
   * recusa uma foto já presa a outra conferência
   * (`foto-evidencia-de-outra-conferencia`), o fluxo reenvia ESTES MESMOS
   * arquivos sem pedir nada ao operador.
   */
  arquivo: File;
  /** A vista que o operador disse estar fotografando (vocabulário da API). */
  fonteFisica: FonteFisica;
  /** `URL.createObjectURL` — prévia local, some no `reiniciarConferencia`. */
  previaUrl: string;
  estado: EstadoDaFoto;
  /** 0..1 do upload (a rede da fábrica é lenta; sem isso parece travado). */
  progresso: number;
  fotoEvidenciaId: string | null;
  /** URL servida pela API (sob S3 é assinada e expira em 1 h). */
  urlRemota: string | null;
  erro: ErroApi | null;
}

export interface SessaoConferencia {
  passo: PassoConferencia;
  /** O operador confirmou em qual gate está conferindo. */
  etapaConfirmada: boolean;
  /** `codigo` do Checkpoint desta conferência; `null` = peça inteira. */
  etapaCodigo: string | null;
  /** Texto CRU do QR. Quem interpreta é a API — aqui é opaco. */
  payloadQr: string | null;
  fotos: FotoDaSessao[];
  /** A resposta do POST, guardada inteira: `motivo`, `incoerencias` e
   * `achadosInconsistentes` só existem nela (gap 22 do CLAUDE.md). */
  resultado: ResultadoExecucaoComExtracao | null;
}

const INICIAL: SessaoConferencia = {
  passo: "etapa",
  etapaConfirmada: false,
  etapaCodigo: null,
  payloadQr: null,
  fotos: [],
  resultado: null,
};

let estado: SessaoConferencia = INICIAL;
const ouvintes = new Set<() => void>();

function avisar(): void {
  ouvintes.forEach((ouvinte) => ouvinte());
}

function atualizar(mudanca: Partial<SessaoConferencia>): void {
  estado = { ...estado, ...mudanca };
  avisar();
}

function assinar(ouvinte: () => void): () => void {
  ouvintes.add(ouvinte);
  return () => {
    ouvintes.delete(ouvinte);
  };
}

const lerSnapshot = () => estado;
const lerSnapshotDoServidor = () => INICIAL;

/** Leitura fora do React (ações assíncronas de upload precisam do estado atual). */
export function lerSessao(): SessaoConferencia {
  return estado;
}

/** A sessão de conferência deste aparelho. */
export function useSessaoConferencia(): SessaoConferencia {
  return useSyncExternalStore(assinar, lerSnapshot, lerSnapshotDoServidor);
}

/* ------------------------------------------------------------------ *
 * Ações
 * ------------------------------------------------------------------ */

export function irParaPasso(passo: PassoConferencia): void {
  atualizar({ passo });
}

/** Fecha o passo 1: a partir daqui a conferência tem um gate definido. */
export function confirmarEtapa(codigo: string | null): void {
  atualizar({ etapaCodigo: codigo, etapaConfirmada: true, passo: "etiqueta" });
}

export function definirPayloadQr(payloadQr: string): void {
  atualizar({ payloadQr });
}

export function limparPayloadQr(): void {
  atualizar({ payloadQr: null });
}

export function adicionarFoto(foto: FotoDaSessao): void {
  atualizar({ fotos: [...estado.fotos, foto] });
}

export function atualizarFoto(
  chave: string,
  mudanca: Partial<FotoDaSessao>,
): void {
  atualizar({
    fotos: estado.fotos.map((foto) =>
      foto.chave === chave ? { ...foto, ...mudanca } : foto,
    ),
  });
}

export function removerFoto(chave: string): void {
  const alvo = estado.fotos.find((foto) => foto.chave === chave);
  if (alvo) revogarPrevia(alvo.previaUrl);
  atualizar({ fotos: estado.fotos.filter((foto) => foto.chave !== chave) });
}

export function definirResultado(
  resultado: ResultadoExecucaoComExtracao,
): void {
  atualizar({ resultado, passo: "veredito" });
}

/**
 * Zera a conferência. `manterEtapa` é o caso normal do gate: o aparelho
 * continua sendo a câmera daquela etapa, só muda a peça.
 */
export function reiniciarConferencia(
  opcoes: { manterEtapa?: boolean } = {},
): void {
  estado.fotos.forEach((foto) => revogarPrevia(foto.previaUrl));

  const manter = opcoes.manterEtapa === true && estado.etapaConfirmada;

  estado = {
    ...INICIAL,
    etapaConfirmada: manter,
    etapaCodigo: manter ? estado.etapaCodigo : null,
    passo: manter ? "etiqueta" : "etapa",
  };
  avisar();
}

function revogarPrevia(url: string): void {
  try {
    URL.revokeObjectURL(url);
  } catch {
    /* prévia já revogada ou ambiente sem URL de objeto: nada a fazer */
  }
}

/* ------------------------------------------------------------------ *
 * Derivações de LEITURA (nenhuma decide conferência)
 * ------------------------------------------------------------------ */

/** Ids que podem ir para o `executar-com-fotos` (só o que subiu de verdade). */
export function idsDasFotosProntas(sessao: SessaoConferencia): string[] {
  return sessao.fotos.flatMap((foto) =>
    foto.estado === "enviada" && foto.fotoEvidenciaId
      ? [foto.fotoEvidenciaId]
      : [],
  );
}

export function temUploadEmCurso(sessao: SessaoConferencia): boolean {
  return sessao.fotos.some((foto) => foto.estado === "enviando");
}
