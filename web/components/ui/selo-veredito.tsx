"use client";

import { juntarClasses } from "@/lib/classes";
import { comoVeredito, type Veredito } from "@/lib/tipos";

/**
 * O selo do veredito — o pixel mais importante do app.
 *
 * Cores SEMÂNTICAS fixas, as mesmas da página /demo (CLAUDE.md): verde
 * conforme, VERMELHO divergente, âmbar não conferível, violeta incoerência. A
 * divergência tem de ser inconfundível a três metros de distância, então ela
 * ganha peso e contorno mais fortes que as outras.
 *
 * O selo NÃO decide nada: recebe o veredito que a API gravou. Se um dia alguém
 * quiser calcular cor a partir de confiança, é aqui que a regra de ouro
 * quebraria — não faça.
 */

export type ClasseSelo = Veredito | "incoerencia";

const ROTULOS: Record<ClasseSelo, string> = {
  conforme: "Conforme",
  divergente: "Divergente",
  nao_conferivel: "Não conferível",
  incoerencia: "Incoerência",
};

/** Uma frase que diz o que fazer — o operador não precisa decorar o jargão. */
export const EXPLICACAO_VEREDITO: Record<ClasseSelo, string> = {
  conforme: "Bate com a etiqueta.",
  divergente: "A peça está gravada diferente da etiqueta. Pare e corrija.",
  nao_conferivel: "Não dá para afirmar. Confira a foto ou refotografe.",
  incoerencia: "As posições da mesma marcação não concordam entre si.",
};

const CORES: Record<ClasseSelo, string> = {
  conforme: "bg-conforme-fundo text-conforme border-conforme/40",
  divergente: "bg-divergente-fundo text-divergente border-divergente",
  nao_conferivel:
    "bg-nao-conferivel-fundo text-nao-conferivel border-nao-conferivel/40",
  incoerencia: "bg-incoerencia-fundo text-incoerencia border-incoerencia/40",
};

const NEUTRO = "bg-superficie-2 text-conteudo-suave border-borda";

export interface SeloVereditoProps {
  /** Aceita a união literal ou a string crua do banco (`string | null`). */
  veredito: string | null | undefined;
  /** `grande` para o veredito geral da conferência. */
  tamanho?: "pequeno" | "medio" | "grande";
  className?: string;
}

const TAMANHOS = {
  pequeno: "px-2 py-0.5 text-xs",
  medio: "px-3 py-1 text-sm",
  grande: "px-4 py-2 text-lg",
};

export function SeloVeredito({
  veredito,
  tamanho = "medio",
  className,
}: SeloVereditoProps) {
  const classe = comoVeredito(veredito);
  const cores = classe ? CORES[classe] : NEUTRO;
  const rotulo = classe ? ROTULOS[classe] : "Sem veredito";

  return (
    <span
      className={juntarClasses(
        "inline-flex items-center gap-1.5 rounded-full border font-semibold uppercase tracking-wide",
        TAMANHOS[tamanho],
        cores,
        classe === "divergente" && "border-2",
        className,
      )}
    >
      <span aria-hidden className="size-2 rounded-full bg-current" />
      {rotulo}
    </span>
  );
}

/** Selo violeta da incoerência entre campos irmãos (não é veredito de campo). */
export function SeloIncoerencia({
  className,
  tamanho = "medio",
}: {
  className?: string;
  tamanho?: keyof typeof TAMANHOS;
}) {
  return (
    <span
      className={juntarClasses(
        "inline-flex items-center gap-1.5 rounded-full border font-semibold uppercase tracking-wide",
        TAMANHOS[tamanho],
        CORES.incoerencia,
        className,
      )}
    >
      <span aria-hidden className="size-2 rounded-full bg-current" />
      {ROTULOS.incoerencia}
    </span>
  );
}
