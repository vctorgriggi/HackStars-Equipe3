"use client";

/**
 * Entrada da tela da peça: o NÚMERO DE SÉRIE impresso na etiqueta.
 *
 * POR QUE NÃO TEM LEITOR DE QR AQUI (e isso é decisão, não falta de tempo):
 * o payload do QR só pode ser interpretado pela API (CLAUDE.md, "Contrato
 * API ↔ Front") — o front nunca extrai `numeroSerie` do texto lido. E o único
 * endpoint que aceita o payload cru é `POST /passagens/registrar`, que
 * ESCREVE: usá-lo para "só consultar" criaria uma passagem falsa na linha do
 * tempo da peça, corrompendo exatamente o histórico que esta tela existe para
 * mostrar. Consulta é leitura; então aqui se digita o número impresso, ou se
 * chega por link (`/peca?numeroSerie=`) vindo da conferência e do scan.
 */

import { useState } from "react";

import { Botao, Cartao, CampoTexto } from "@/components/ui";

export interface BuscaDePecaProps {
  /** Valor que veio da URL — o campo nasce preenchido com ele. */
  inicial?: string;
  ocupado?: boolean;
  aoBuscar: (numeroSerie: string) => void;
}

export function BuscaDePeca({
  inicial = "",
  ocupado = false,
  aoBuscar,
}: BuscaDePecaProps) {
  const [termo, setTermo] = useState(inicial);
  const limpo = termo.trim();

  return (
    <Cartao>
      <form
        className="space-y-3"
        onSubmit={(evento) => {
          evento.preventDefault();
          if (limpo) aoBuscar(limpo);
        }}
      >
        <CampoTexto
          rotulo="Número de série"
          numerico
          value={termo}
          onChange={(evento) => setTermo(evento.target.value)}
          placeholder="847233"
          inputMode="text"
          autoCapitalize="characters"
          autoCorrect="off"
          spellCheck={false}
          enterKeyHint="search"
          ajuda="O número do fabricante — o mesmo que a etiqueta imprime e o metal traz chumbado. O QR não é lido aqui: quem interpreta o payload é o servidor, e o endpoint que o aceita registra passagem; consulta não escreve nada."
        />

        <Botao
          type="submit"
          tamanho="grande"
          disabled={!limpo}
          carregando={ocupado}
        >
          Buscar histórico
        </Botao>
      </form>
    </Cartao>
  );
}
