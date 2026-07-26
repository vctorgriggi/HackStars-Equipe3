"use client";

/**
 * Upload das fotos da sessão.
 *
 * Fica separado do store por uma razão prática: aqui há I/O (rede) e o store é
 * memória pura. E fica FORA dos componentes porque o upload precisa sobreviver
 * a uma troca de passo — o operador tira a foto do topo, avança para a próxima
 * vista, e o envio continua.
 *
 * NENHUMA chamada de visão acontece neste arquivo. Subir foto só cria a
 * FotoEvidencia; a visão (paga) roda uma vez só, no disparo da conferência
 * (constraint 4 do SPEC).
 */

import { ehErroApi, enviarFotoEvidencia } from "@/lib/api";
import type { FonteFisica } from "@/lib/tipos";

import {
  adicionarFoto,
  atualizarFoto,
  idsDasFotosProntas,
  lerSessao,
} from "./sessao";

/**
 * `crypto.randomUUID` só existe em contexto seguro — e a rede local por IP
 * (http://192.168.x.x:3000) não é um. Como esta chave é só identidade de linha
 * na tela, o fallback serve.
 */
function novaChave(): string {
  const cripto = globalThis.crypto;
  if (cripto && typeof cripto.randomUUID === "function") {
    return cripto.randomUUID();
  }
  return `foto-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

async function subir(
  chave: string,
  arquivo: File,
  fonteFisica: FonteFisica,
): Promise<void> {
  atualizarFoto(chave, { estado: "enviando", progresso: 0, erro: null });

  try {
    const enviada = await enviarFotoEvidencia({
      arquivo,
      fonteFisica,
      aoProgredir: (fracao) => atualizarFoto(chave, { progresso: fracao }),
    });

    atualizarFoto(chave, {
      estado: "enviada",
      progresso: 1,
      fotoEvidenciaId: enviada.id,
      urlRemota: enviada.url,
    });
  } catch (falha) {
    atualizarFoto(chave, {
      estado: "erro",
      fotoEvidenciaId: null,
      urlRemota: null,
      erro: ehErroApi(falha) ? falha : null,
    });
  }
}

/** Põe o arquivo na sessão já em "enviando" e sobe. Não lança: o erro vira estado. */
export async function enviarFotoDaSessao(
  arquivo: File,
  fonteFisica: FonteFisica,
): Promise<void> {
  const chave = novaChave();

  adicionarFoto({
    chave,
    arquivo,
    fonteFisica,
    previaUrl: URL.createObjectURL(arquivo),
    estado: "enviando",
    progresso: 0,
    fotoEvidenciaId: null,
    urlRemota: null,
    erro: null,
  });

  await subir(chave, arquivo, fonteFisica);
}

/** Repete o upload de UMA foto que falhou (botão "tentar de novo"). */
export async function reenviarFotoDaSessao(chave: string): Promise<void> {
  const foto = lerSessao().fotos.find((item) => item.chave === chave);
  if (!foto) return;
  await subir(foto.chave, foto.arquivo, foto.fonteFisica);
}

/** O que o reenvio conseguiu — o chamador PRECISA das duas contas. */
export interface ResultadoDoReenvio {
  /** Ids das evidências novas que subiram de verdade. */
  ids: string[];
  /** Quantos arquivos a sessão tentou reenviar. */
  tentadas: number;
}

/**
 * Reenvia TODOS os arquivos da sessão como evidências novas e devolve os ids
 * novos JUNTO da quantidade tentada — porque um reenvio que falha em silêncio
 * devolveria uma lista curta (ou vazia) e o disparo seguinte iria à API com
 * menos evidência do que o operador fotografou, ou com nenhuma.
 *
 * Existe para um erro específico: `foto-evidencia-de-outra-conferencia`. Uma
 * FotoEvidencia só lastreia UMA conferência (é o que torna a trilha auditável),
 * então quando a mesma foto é reaproveitada — operador que voltou no fluxo, ou
 * duas conferências da mesma peça — a API recusa ANTES de gastar visão. Como o
 * arquivo original continua na sessão, dá para consertar sem pedir nada ao
 * operador: sobe de novo e refaz o disparo.
 *
 * Sequencial, não em paralelo: numa rede de fábrica, dez uploads simultâneos
 * ficam mais lentos que dez em fila, e a barra de progresso vira ruído.
 */
export async function reenviarTodasAsFotos(): Promise<ResultadoDoReenvio> {
  const alvos = lerSessao().fotos;

  for (const foto of alvos) {
    await subir(foto.chave, foto.arquivo, foto.fonteFisica);
  }

  return { ids: idsDasFotosProntas(lerSessao()), tentadas: alvos.length };
}
