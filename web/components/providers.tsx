"use client";

/**
 * Os provedores do app: cache de dados (React Query), sessão e etapa do
 * aparelho. Montados uma única vez no `app/layout.tsx`.
 *
 * POR QUE O TOKEN VIVE EM MEMÓRIA (e não em localStorage/cookie): é decisão
 * documentada do repositório (gap 17 do CLAUDE.md). Enquanto a demo roda com
 * CORS permissivo e sem rate limit no login, um token que não está em storage
 * não é exfiltrável por XSS de terceiro nem sobrevive ao fechamento da aba.
 * O preço é ter de relogar depois de um refresh — por isso o E-MAIL (e só ele)
 * fica no `sessionStorage`, para o operador digitar só a senha.
 *
 * Nada de senha, token ou refreshToken em storage. Nunca.
 */

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import {
  QueryClient,
  QueryClientProvider,
  useQueryClient,
} from "@tanstack/react-query";

import { configurarClienteApi, ehErroApi, entrar as entrarNaApi } from "@/lib/api";
import type { ErroApi } from "@/lib/api";
import { EtapaProvider } from "@/lib/etapa";

/** E-mail lembrado entre recargas (só o e-mail — nunca token nem senha). */
const CHAVE_EMAIL = "trael-email";

/** Pré-preenchimento do ambiente de demo (admin seed do boilerplate). */
export const EMAIL_PADRAO = "admin@example.com";

export interface EstadoAutenticacao {
  /** `true` quando há JWT em memória. */
  autenticado: boolean;
  /** E-mail da sessão (ou o lembrado da última). */
  email: string;
  entrando: boolean;
  erro: ErroApi | null;
  entrar: (entrada: { email: string; senha: string }) => Promise<void>;
  sair: () => void;
}

const ContextoAutenticacao = createContext<EstadoAutenticacao | null>(null);

function lerEmailLembrado(): string {
  if (typeof window === "undefined") return EMAIL_PADRAO;
  try {
    return window.sessionStorage.getItem(CHAVE_EMAIL) ?? EMAIL_PADRAO;
  } catch {
    return EMAIL_PADRAO;
  }
}

function gravarEmail(email: string): void {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.setItem(CHAVE_EMAIL, email);
  } catch {
    /* sem storage: o operador digita o e-mail de novo */
  }
}

/**
 * O e-mail lembrado é um STORE EXTERNO lido com `useSyncExternalStore` — não
 * `useState(() => sessionStorage...)`.
 *
 * Motivo concreto: no render do servidor não existe `sessionStorage`, então o
 * `value` do campo de e-mail sairia `admin@example.com` no HTML e outro valor
 * na hidratação — mismatch em campo controlado. O snapshot de servidor devolve
 * sempre o padrão, e o valor real entra logo depois da hidratação.
 */
const armazemEmail = {
  valor: EMAIL_PADRAO,
  ouvintes: new Set<() => void>(),
};

if (typeof window !== "undefined") {
  armazemEmail.valor = lerEmailLembrado();
}

function lembrarEmail(email: string): void {
  gravarEmail(email);
  armazemEmail.valor = email;
  armazemEmail.ouvintes.forEach((ouvinte) => ouvinte());
}

function assinarEmail(ouvinte: () => void): () => void {
  armazemEmail.ouvintes.add(ouvinte);
  return () => {
    armazemEmail.ouvintes.delete(ouvinte);
  };
}

const lerEmailAtual = () => armazemEmail.valor;
const lerEmailDoServidor = () => EMAIL_PADRAO;

/**
 * O token JWT, em memória de MÓDULO (não em ref nem em state).
 *
 * Por que fora do componente: o cliente HTTP precisa lê-lo de forma síncrona a
 * qualquer momento, inclusive numa consulta disparada no primeiro render — uma
 * ref lida durante o render é justamente o que o React desaconselha, e um
 * efeito chegaria tarde demais (a chamada sairia sem `Authorization`).
 *
 * Continua sendo MEMÓRIA: some no refresh, não vai para storage nenhum, não é
 * legível por outra aba. O `autenticado` do state é só o espelho para a UI.
 */
const sessaoEmMemoria: { token: string | null } = { token: null };

/** Preenchido pelo provider; chamado quando a API responde 401. */
let aoPerderSessaoNoProvider: (() => void) | null = null;

configurarClienteApi({
  obterToken: () => sessaoEmMemoria.token,
  aoPerderSessao: () => {
    sessaoEmMemoria.token = null;
    aoPerderSessaoNoProvider?.();
  },
});

function AutenticacaoProvider({ children }: { children: ReactNode }) {
  const clienteDeConsultas = useQueryClient();

  const [autenticado, setAutenticado] = useState(false);
  const email = useSyncExternalStore(
    assinarEmail,
    lerEmailAtual,
    lerEmailDoServidor,
  );
  const [entrando, setEntrando] = useState(false);
  const [erro, setErro] = useState<ErroApi | null>(null);

  const sair = useCallback(() => {
    sessaoEmMemoria.token = null;
    setAutenticado(false);
    setErro(null);
    // O cache guarda dados de peça e veredito da sessão anterior: some com ele.
    clienteDeConsultas.clear();
  }, [clienteDeConsultas]);

  // 401 vindo de qualquer chamada derruba a sessão na UI. Registrado em efeito
  // (o setState acontece depois, no callback — nunca no corpo do efeito).
  useEffect(() => {
    aoPerderSessaoNoProvider = () => setAutenticado(false);
    return () => {
      aoPerderSessaoNoProvider = null;
    };
  }, []);

  const entrar = useCallback(
    async (entrada: { email: string; senha: string }) => {
      setEntrando(true);
      setErro(null);
      try {
        const sessao = await entrarNaApi(entrada);
        sessaoEmMemoria.token = sessao.token;
        setAutenticado(true);
        lembrarEmail(entrada.email);
        // Consultas que falharam com 401 antes do login precisam rodar de novo.
        await clienteDeConsultas.invalidateQueries();
      } catch (falha) {
        const normalizado = ehErroApi(falha)
          ? falha
          : ({
              status: 0,
              codigo: "erro-desconhecido",
              mensagem: "Não consegui entrar. Tente de novo.",
              detalhe: String(falha),
            } as ErroApi);
        setErro(normalizado);
        throw normalizado;
      } finally {
        setEntrando(false);
      }
    },
    [clienteDeConsultas],
  );

  const valor = useMemo<EstadoAutenticacao>(
    () => ({ autenticado, email, entrando, erro, entrar, sair }),
    [autenticado, email, entrando, erro, entrar, sair],
  );

  return (
    <ContextoAutenticacao.Provider value={valor}>
      <EtapaProvider autenticado={autenticado}>{children}</EtapaProvider>
    </ContextoAutenticacao.Provider>
  );
}

export function useAutenticacao(): EstadoAutenticacao {
  const contexto = useContext(ContextoAutenticacao);
  if (!contexto) {
    throw new Error("useAutenticacao precisa estar dentro de <Provedores>.");
  }
  return contexto;
}

function criarClienteDeConsultas(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        // Rede de fábrica é instável, mas repetir chamada CARA (visão) não é
        // função do cache: mutations não repetem, e consultas repetem uma vez.
        retry: 1,
        refetchOnWindowFocus: false,
        staleTime: 30_000,
      },
      mutations: { retry: 0 },
    },
  });
}

/** Envelope único de provedores — montado no layout raiz. */
export function Provedores({ children }: { children: ReactNode }) {
  const [cliente] = useState(criarClienteDeConsultas);

  return (
    <QueryClientProvider client={cliente}>
      <AutenticacaoProvider>{children}</AutenticacaoProvider>
    </QueryClientProvider>
  );
}
