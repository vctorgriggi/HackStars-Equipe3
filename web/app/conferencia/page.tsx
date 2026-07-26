"use client";

/**
 * Tela de conferência (T3.1 → T3.3 do PLAN): ler o QR da etiqueta, fotografar
 * as vistas que a etapa cobra e receber o veredito campo a campo com a
 * evidência de cada leitura.
 *
 * A página é só a moldura. Todo o fluxo mora em `components/conferencia/`
 * porque o estado dele é do APARELHO, não da rota: o operador que sai para ver
 * o histórico da peça e volta encontra as fotos que já subiu.
 */

import { FluxoDeConferencia } from "@/components/conferencia/fluxo";

export default function PaginaConferencia() {
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold text-conteudo">Conferir peça</h1>
        <p className="mt-1 text-sm text-conteudo-suave">
          A etiqueta manda; a peça é conferida contra ela. Quem compara e decide
          é o servidor.
        </p>
      </div>

      <FluxoDeConferencia />
    </div>
  );
}
