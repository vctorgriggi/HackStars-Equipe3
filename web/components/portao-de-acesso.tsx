"use client";

/**
 * Porta de entrada do app.
 *
 * TODO endpoint de domínio da API exige JWT (o CRUD gerado do boilerplate roda
 * atrás de `AuthGuard('jwt')`), então não existe tela útil sem sessão: em vez
 * de deixar cada tela descobrir isso com um 401, o layout inteiro fica atrás
 * deste portão.
 *
 * O token vive em memória (ver `providers.tsx`), então um refresh cai aqui de
 * novo — de propósito. O e-mail volta preenchido do `sessionStorage`; a senha,
 * jamais.
 */

import { useState, type ReactNode } from "react";

import { EMAIL_PADRAO, useAutenticacao } from "@/components/providers";
import { Aviso, AvisoDeErro, Botao, CampoTexto, Cartao } from "@/components/ui";

export function PortaoDeAcesso({ children }: { children: ReactNode }) {
  const { autenticado } = useAutenticacao();

  if (autenticado) return <>{children}</>;

  return (
    <div className="mx-auto w-full max-w-md p-4">
      <FormularioDeAcesso />
    </div>
  );
}

export function FormularioDeAcesso() {
  const { email: emailLembrado, entrar, entrando, erro } = useAutenticacao();
  const [email, setEmail] = useState(emailLembrado || EMAIL_PADRAO);
  const [senha, setSenha] = useState("");

  return (
    <Cartao>
      <h1 className="text-xl font-semibold text-conteudo">Entrar</h1>
      <p className="mt-1 mb-4 text-sm text-conteudo-suave">
        A conferência é registrada com identificação — por isso o acesso.
      </p>

      <form
        className="space-y-3"
        onSubmit={(evento) => {
          evento.preventDefault();
          // O erro já é exibido pelo estado do provider; não derrube a tela.
          void entrar({ email: email.trim(), senha }).catch(() => {});
        }}
      >
        <CampoTexto
          rotulo="E-mail"
          type="email"
          inputMode="email"
          autoComplete="username"
          value={email}
          onChange={(evento) => setEmail(evento.target.value)}
          required
        />
        <CampoTexto
          rotulo="Senha"
          type="password"
          autoComplete="current-password"
          value={senha}
          onChange={(evento) => setSenha(evento.target.value)}
          required
        />

        {erro ? <AvisoDeErro erro={erro} /> : null}

        <Botao
          type="submit"
          tamanho="grande"
          carregando={entrando}
          disabled={!email.trim() || !senha}
        >
          Entrar
        </Botao>
      </form>

      <Aviso tom="neutro" className="mt-4">
        A sessão vive só nesta aba: ao recarregar a página é preciso entrar de
        novo. O e-mail fica lembrado; a senha, não.
      </Aviso>
    </Cartao>
  );
}
