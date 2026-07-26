"use client";

import { useId } from "react";
import type {
  InputHTMLAttributes,
  ReactNode,
  TextareaHTMLAttributes,
} from "react";

import { juntarClasses } from "@/lib/classes";

const CAMPO_BASE =
  "w-full rounded-xl border border-borda-forte bg-superficie px-3 py-3 " +
  "text-base text-conteudo placeholder:text-conteudo-suave/70 " +
  "min-h-12 disabled:opacity-60";

export interface CampoTextoProps
  extends Omit<InputHTMLAttributes<HTMLInputElement>, "size"> {
  rotulo: string;
  /** Instrução curta abaixo do campo. */
  ajuda?: ReactNode;
  erro?: string | null;
  /** Números de série/patrimônio: tabular e maior, para comparar dígitos. */
  numerico?: boolean;
}

/**
 * Campo de texto. `text-base` (16px) não é escolha estética: abaixo disso o
 * Safari do iPhone dá zoom automático ao focar e o operador perde o
 * enquadramento da tela.
 */
export function CampoTexto({
  rotulo,
  ajuda,
  erro,
  numerico,
  className,
  id,
  ...resto
}: CampoTextoProps) {
  const idGerado = useId();
  const idCampo = id ?? idGerado;
  const idAjuda = `${idCampo}-ajuda`;

  return (
    <div className="w-full">
      <label
        htmlFor={idCampo}
        className="mb-1 block text-sm font-medium text-conteudo"
      >
        {rotulo}
      </label>
      <input
        {...resto}
        id={idCampo}
        aria-invalid={erro ? true : undefined}
        aria-describedby={ajuda || erro ? idAjuda : undefined}
        className={juntarClasses(
          CAMPO_BASE,
          numerico && "numeros text-lg font-semibold",
          erro && "border-divergente",
          className,
        )}
      />
      {erro ? (
        <p id={idAjuda} className="mt-1 text-sm text-divergente">
          {erro}
        </p>
      ) : ajuda ? (
        <p id={idAjuda} className="mt-1 text-sm text-conteudo-suave">
          {ajuda}
        </p>
      ) : null}
    </div>
  );
}

export interface AreaTextoProps
  extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  rotulo: string;
  ajuda?: ReactNode;
  erro?: string | null;
  /** Conteúdo de máquina (payload do QR): monoespaçado e sem autocorreção. */
  bruto?: boolean;
}

/** Texto longo: observação da passagem e colagem do payload cru do QR. */
export function AreaTexto({
  rotulo,
  ajuda,
  erro,
  bruto,
  className,
  id,
  ...resto
}: AreaTextoProps) {
  const idGerado = useId();
  const idCampo = id ?? idGerado;
  const idAjuda = `${idCampo}-ajuda`;

  return (
    <div className="w-full">
      <label
        htmlFor={idCampo}
        className="mb-1 block text-sm font-medium text-conteudo"
      >
        {rotulo}
      </label>
      <textarea
        {...resto}
        id={idCampo}
        aria-invalid={erro ? true : undefined}
        aria-describedby={ajuda || erro ? idAjuda : undefined}
        spellCheck={bruto ? false : undefined}
        autoCapitalize={bruto ? "off" : undefined}
        autoCorrect={bruto ? "off" : undefined}
        className={juntarClasses(
          CAMPO_BASE,
          "min-h-24 resize-y",
          bruto && "font-mono text-sm",
          erro && "border-divergente",
          className,
        )}
      />
      {erro ? (
        <p id={idAjuda} className="mt-1 text-sm text-divergente">
          {erro}
        </p>
      ) : ajuda ? (
        <p id={idAjuda} className="mt-1 text-sm text-conteudo-suave">
          {ajuda}
        </p>
      ) : null}
    </div>
  );
}
