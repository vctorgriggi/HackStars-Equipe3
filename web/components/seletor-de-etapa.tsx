"use client";

/**
 * Provisionamento da etapa DESTE aparelho.
 *
 * Em produção quem faz isso é a instalação da câmera; no MVP é este seletor (ou
 * o `?etapa=<codigo>` na URL, que vence e passa a valer como padrão salvo).
 * A escolha é por `codigo` — nunca por nome nem por posição, que mudam.
 *
 * O que a etapa muda no fluxo é decidido pela API (recorte cumulativo da
 * checklist): aqui só se escolhe QUAL é.
 */

import { useEtapa } from "@/lib/etapa";
import { Aviso, AvisoDeErro, Botao, Cartao, CabecalhoCartao } from "@/components/ui";

export function SeletorDeEtapa() {
  const {
    codigo,
    etapas,
    carregandoEtapas,
    erroEtapas,
    desconhecida,
    fixadaPelaUrl,
    definirEtapa,
  } = useEtapa();

  return (
    <Cartao>
      <CabecalhoCartao
        titulo="Etapa deste aparelho"
        descricao="Simula a câmera fixa daquele ponto da linha: conferências e passagens nascem com esta etapa."
      />

      {erroEtapas ? <AvisoDeErro erro={erroEtapas} className="mb-3" /> : null}

      <label className="block">
        <span className="sr-only">Etapa da linha</span>
        <select
          value={codigo ?? ""}
          disabled={carregandoEtapas || etapas.length === 0}
          onChange={(evento) => definirEtapa(evento.target.value || null)}
          className="min-h-12 w-full rounded-xl border border-borda-forte bg-superficie px-3 text-base text-conteudo"
        >
          <option value="">Sem etapa fixa (confere a peça inteira)</option>
          {etapas.map((etapa) => (
            <option key={etapa.codigo} value={etapa.codigo}>
              {etapa.ordem}. {etapa.nome}
            </option>
          ))}
        </select>
      </label>

      {desconhecida ? (
        <Aviso tom="alerta" className="mt-3">
          Este aparelho está configurado com a etapa <code>{codigo}</code>, que
          não existe na linha. Escolha uma etapa válida — senão a conferência
          será recusada.
        </Aviso>
      ) : null}

      {fixadaPelaUrl ? (
        <p className="mt-3 text-xs text-conteudo-suave">
          Etapa definida pelo link de provisionamento (<code>?etapa=</code>) e
          salva neste aparelho.
        </p>
      ) : null}

      {codigo ? (
        <div className="mt-3">
          <Botao variante="fantasma" onClick={() => definirEtapa(null)}>
            Limpar etapa
          </Botao>
        </div>
      ) : null}
    </Cartao>
  );
}
