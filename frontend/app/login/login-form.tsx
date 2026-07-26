"use client";

import { motion, useReducedMotion } from "motion/react";
import { Form } from "@base-ui/react/form";
import { Field } from "@base-ui/react/field";
import { Input } from "@base-ui/react/input";
import { Button } from "@base-ui/react/button";
import { LoginRequestError, useLogin } from "@/lib/auth/use-login";

// Card do handoff (tela 1): inputs 48px sobre surface-2, radius-md; erro em
// reading-mismatch (soft). Auth continua real (BFF → NestJS), ver AUTH.md.
const inputClassName =
  "h-12 w-full rounded-md border border-line bg-surface-2 px-3 text-sm text-text-1 outline-none focus:border-line-focus";

// Durações do motion (styles/tokens/elevation.css / lib/design/tokens.ts):
// durBase=150ms, durSlow=240ms — não são lidas de CSS var diretamente pelo
// motion, por isso os literais em segundos.
const DUR_SLOW = 0.24;
const DUR_BASE = 0.15;

export function LoginForm({ next }: { next?: string }) {
  const prefersReducedMotion = useReducedMotion();
  const login = useLogin(next);

  // Não distinguir e-mail de senha na mensagem de erro — evita enumeração
  // de usuário via resposta do formulário.
  const generalError =
    login.error instanceof LoginRequestError
      ? login.error.status === 422
        ? "Credenciais inválidas."
        : "Não foi possível entrar. Tente novamente."
      : null;

  return (
    <motion.div
      initial={{ opacity: 0, y: prefersReducedMotion ? 0 : 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: prefersReducedMotion ? 0 : DUR_SLOW }}
      className="grid w-full max-w-[380px] gap-5"
    >
      <div className="flex flex-col items-center gap-3">
        <div
          aria-hidden
          className="h-[52px] w-[52px] rounded-md"
          style={{ background: "var(--gradient-brand)" }}
        />
        <div className="text-center">
          <div className="text-2xl font-bold tracking-wide text-text-1">
            TRAEL
          </div>
          <div className="t-caps text-2xs text-text-3">
            Vision · monitoramento de linha
          </div>
        </div>
      </div>

      <div className="grid gap-4 rounded-lg border border-line bg-surface-1 p-6 shadow-2">
        <Form
          className="grid gap-4"
          onFormSubmit={(values) => {
            login.mutate({
              email: String(values.email ?? ""),
              password: String(values.password ?? ""),
            });
          }}
        >
          {generalError && (
            <motion.div
              initial={{ opacity: 0, y: prefersReducedMotion ? 0 : -8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: prefersReducedMotion ? 0 : DUR_BASE }}
              role="alert"
              className="rounded-md border border-reading-mismatch bg-reading-mismatch-soft px-4 py-3 text-sm text-reading-mismatch"
            >
              {generalError}
            </motion.div>
          )}

          <Field.Root name="email" className="grid gap-2">
            <Field.Label className="t-caps text-2xs text-text-3">
              E-mail corporativo
            </Field.Label>
            <Input
              type="email"
              required
              autoComplete="username"
              placeholder="nome@trael.com.br"
              className={inputClassName}
            />
            <Field.Error className="text-sm text-reading-mismatch" />
          </Field.Root>

          <Field.Root name="password" className="grid gap-2">
            <Field.Label className="t-caps text-2xs text-text-3">
              Senha
            </Field.Label>
            <Input
              type="password"
              required
              autoComplete="current-password"
              placeholder="••••••••"
              className={inputClassName}
            />
            <Field.Error className="text-sm text-reading-mismatch" />
          </Field.Root>

          <Button
            type="submit"
            disabled={login.isPending}
            className="h-12 w-full rounded-md bg-brand-primary text-base font-semibold text-brand-on transition-colors hover:bg-brand-primary-600 disabled:opacity-60 focus-visible:outline-none focus-visible:[box-shadow:var(--ring-focus)]"
          >
            {login.isPending ? "Entrando…" : "Entrar"}
          </Button>
        </Form>

        <button
          type="button"
          className="justify-self-center text-xs text-text-3 hover:text-text-1"
        >
          Esqueci minha senha
        </button>
      </div>
    </motion.div>
  );
}
