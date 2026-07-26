/**
 * A ETAPA PROVISIONADA DO APARELHO.
 *
 * No MVP cada celular simula uma câmera fixa da linha: ele é "o aparelho da
 * serigrafia" ou "o aparelho da fixação da placa". Em produção, cada câmera é
 * provisionada amarrada ao `codigo` de um Checkpoint — aqui o provisionamento é
 * a URL (`?etapa=serigrafia`), guardada no aparelho depois disso.
 *
 * Precedência (SPEC, Must): `?etapa=` da URL VENCE e passa a ser o novo padrão
 * salvo; sem ela, vale o que estiver no `localStorage`. Assim dá para
 * reconfigurar um aparelho mandando um link, e ele continua configurado depois
 * de fechar o navegador.
 *
 * O que este módulo NÃO faz: decidir o que aquela etapa confere. O recorte da
 * checklist por etapa é regra da API (`GET /conferencias/plano-de-fotos`), e
 * reimplementá-lo aqui é exatamente o erro que a regra de ouro proíbe. Aqui só
 * mora QUAL é a etapa e QUAL é o nome dela.
 *
 * IMPLEMENTAÇÃO: a etapa é um STORE EXTERNO lido com `useSyncExternalStore`, e
 * não `useState` + efeito. Dois motivos: (1) `localStorage` e `location` não
 * existem no render do servidor, e o snapshot de servidor (`null`) casa com o
 * primeiro render do cliente — sem erro de hidratação; (2) a fonte da verdade é
 * o aparelho, não o componente, então qualquer tela que troque a etapa atualiza
 * todas as outras.
 *
 * `localStorage` guarda um CÓDIGO DE ETAPA — dado de configuração, não segredo.
 * O token continua só em memória (outra história, ver `providers.tsx`).
 */

"use client";

import {
  createContext,
  createElement,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import { useQuery } from "@tanstack/react-query";

import { ehErroApi, listarCheckpoints, type ErroApi } from "./api";
import type { Checkpoint } from "./tipos";

/** Chave do aparelho no `localStorage`. */
export const CHAVE_ETAPA = "trael-etapa";

/** Nome do parâmetro de URL que provisiona o aparelho. */
export const PARAMETRO_ETAPA = "etapa";

interface Provisionamento {
  codigo: string | null;
  /** `true` quando a etapa veio do `?etapa=` desta navegação. */
  fixadaPelaUrl: boolean;
}

/* ------------------------------------------------------------------ *
 * Store do aparelho
 * ------------------------------------------------------------------ */

const VAZIO: Provisionamento = { codigo: null, fixadaPelaUrl: false };

let atual: Provisionamento = VAZIO;
const ouvintes = new Set<() => void>();

function avisar(): void {
  ouvintes.forEach((ouvinte) => ouvinte());
}

/** Lê o código salvo no aparelho, sem tocar em React. */
export function lerEtapaSalva(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage.getItem(CHAVE_ETAPA);
  } catch {
    // Safari em modo privado bloqueia storage — o app segue sem etapa fixa.
    return null;
  }
}

function salvarEtapa(codigo: string | null): void {
  if (typeof window === "undefined") return;
  try {
    if (codigo) window.localStorage.setItem(CHAVE_ETAPA, codigo);
    else window.localStorage.removeItem(CHAVE_ETAPA);
  } catch {
    /* sem storage: a etapa vale só para esta sessão */
  }
}

/**
 * Resolve o provisionamento a partir do ambiente do navegador (URL primeiro,
 * aparelho depois). Idempotente: chamar de novo não muda nada se nada mudou.
 */
function sincronizarComAmbiente(): void {
  if (typeof window === "undefined") return;

  const daUrl = new URLSearchParams(window.location.search)
    .get(PARAMETRO_ETAPA)
    ?.trim();

  const proximo: Provisionamento = daUrl
    ? { codigo: daUrl, fixadaPelaUrl: true }
    : { codigo: lerEtapaSalva(), fixadaPelaUrl: false };

  if (daUrl) salvarEtapa(daUrl);

  if (
    proximo.codigo === atual.codigo &&
    proximo.fixadaPelaUrl === atual.fixadaPelaUrl
  ) {
    return;
  }

  atual = proximo;
  avisar();
}

/** Troca (ou limpa, com `null`) a etapa do aparelho e persiste. */
export function definirEtapaDoAparelho(codigo: string | null): void {
  const limpo = codigo?.trim() || null;
  salvarEtapa(limpo);
  atual = { codigo: limpo, fixadaPelaUrl: false };
  avisar();
}

function assinar(ouvinte: () => void): () => void {
  ouvintes.add(ouvinte);
  return () => {
    ouvintes.delete(ouvinte);
  };
}

const lerSnapshot = () => atual;
const lerSnapshotDoServidor = () => VAZIO;

/* ------------------------------------------------------------------ *
 * Contexto
 * ------------------------------------------------------------------ */

export interface EstadoEtapa {
  /** `codigo` do Checkpoint provisionado; `null` = aparelho sem etapa fixa. */
  codigo: string | null;
  /** O Checkpoint inteiro, quando o código casa com um cadastrado. */
  etapa: Checkpoint | null;
  /** Nome exibível; cai para o próprio código enquanto não resolve. */
  nome: string | null;
  fixadaPelaUrl: boolean;
  /** Há código salvo, mas ele não existe na linha (etapa renomeada/errada). */
  desconhecida: boolean;
  /** Todas as etapas da linha, em ordem — para o seletor de configuração. */
  etapas: Checkpoint[];
  carregandoEtapas: boolean;
  erroEtapas: ErroApi | null;
  definirEtapa: (codigo: string | null) => void;
}

const ContextoEtapa = createContext<EstadoEtapa | null>(null);

export function EtapaProvider({
  children,
  autenticado,
}: {
  children: ReactNode;
  /** As etapas só são buscáveis com JWT; sem ele nem tentamos (evita 401 em loop). */
  autenticado: boolean;
}) {
  const provisionamento = useSyncExternalStore(
    assinar,
    lerSnapshot,
    lerSnapshotDoServidor,
  );

  // Sincroniza o STORE (sistema externo) com a URL depois da hidratação — é
  // exatamente o papel de um efeito, e não dispara setState em cascata.
  useEffect(() => {
    // Idempotente: se nada mudou, não notifica ninguém. Roda no mount porque é
    // aí que `window` existe — no servidor o snapshot é sempre "sem etapa".
    sincronizarComAmbiente();
  }, []);

  const consulta = useQuery({
    queryKey: ["checkpoints"],
    queryFn: ({ signal }) => listarCheckpoints(signal),
    enabled: autenticado,
    staleTime: 5 * 60 * 1000,
  });

  const definirEtapa = useCallback((codigo: string | null) => {
    definirEtapaDoAparelho(codigo);
  }, []);

  const etapas = useMemo(() => consulta.data ?? [], [consulta.data]);
  const { codigo, fixadaPelaUrl } = provisionamento;
  const carregandoEtapas = consulta.isLoading;
  const erroConsulta = consulta.error;

  const valor = useMemo<EstadoEtapa>(() => {
    const etapa = codigo
      ? (etapas.find((item) => item.codigo === codigo) ?? null)
      : null;

    return {
      codigo,
      etapa,
      nome: etapa?.nome ?? codigo,
      fixadaPelaUrl,
      desconhecida: Boolean(codigo) && etapas.length > 0 && etapa === null,
      etapas,
      carregandoEtapas,
      erroEtapas: ehErroApi(erroConsulta) ? erroConsulta : null,
      definirEtapa,
    };
  }, [
    codigo,
    fixadaPelaUrl,
    etapas,
    carregandoEtapas,
    erroConsulta,
    definirEtapa,
  ]);

  return createElement(ContextoEtapa.Provider, { value: valor }, children);
}

/**
 * A etapa provisionada deste aparelho. Use `codigo` para mandar `etapaCodigo`
 * à API e `nome` para exibir; nunca derive comportamento de conferência dela.
 */
export function useEtapa(): EstadoEtapa {
  const contexto = useContext(ContextoEtapa);
  if (!contexto) {
    throw new Error("useEtapa precisa estar dentro de <Provedores>.");
  }
  return contexto;
}
