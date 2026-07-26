"use client";

/**
 * O RESULTADO DE UM SCAN: peça, etapa, hora — e o alerta.
 *
 * Três decisões de comportamento que valem mais que o layout:
 *
 * 1. **A fila anda sozinha, mas o alerta não.** Peça sem pendência volta ao
 *    scanner em 4 s (a linha tem peças em sequência; obrigar um toque por peça
 *    é fricção pura). Peça com alerta — `divergente` ou `nao_conferivel` — NÃO
 *    volta sozinha: o operador precisa reconhecer o alerta com o dedo. Um
 *    banner vermelho que some sozinho é um alerta não dado, e o critério 6
 *    existe justamente para a divergência parar a produção.
 * 2. **A exceção aceita fica depois do alerta**, nunca antes: primeiro o
 *    operador vê o problema, só então tem a opção de anotar a justificativa.
 * 3. **Anotar exceção não reescreve o passado.** A API não expõe edição de
 *    passagem, e isso é coerente com a trilha de auditoria do projeto: a
 *    anotação entra como um NOVO `POST /passagens/registrar` nesta mesma etapa,
 *    com a `observacao`. O registro anterior continua exatamente como saiu.
 *    A tela diz isso em português, para ninguém achar que "editou".
 */

import { useCallback, useEffect, useState } from "react";

import {
  AvisoDeErro,
  AreaTexto,
  Aviso,
  Botao,
  CarregandoAcao,
  Cartao,
} from "@/components/ui";
import type {
  PassagemRegistrada,
  ResultadoRegistroPassagem,
} from "@/lib/tipos";
import { comoVeredito } from "@/lib/tipos";

import { AlertaDeConferencia } from "./alerta-de-conferencia";
import { formatarData, formatarHora } from "./formato";

/** Segundos até a tela voltar ao scanner quando a peça não tem pendência. */
const SEGUNDOS_ATE_A_PROXIMA = 4;

export interface CartaoDaPassagemProps {
  resultado: ResultadoRegistroPassagem;
  /** Volta ao scanner para a próxima peça. */
  aoProximo: () => void;
  /** Dispara o registro da exceção aceita (novo evento, com justificativa). */
  aoAnotarExcecao: (observacao: string) => void;
  anotando: boolean;
  erroAnotacao: unknown;
  /** A passagem extra criada pela anotação, quando já houve uma. */
  excecaoAnotada: PassagemRegistrada | null;
}

export function CartaoDaPassagem({
  resultado,
  aoProximo,
  aoAnotarExcecao,
  anotando,
  erroAnotacao,
  excecaoAnotada,
}: CartaoDaPassagemProps) {
  const [formularioAberto, setFormularioAberto] = useState(false);
  const [texto, setTexto] = useState("");
  const [restante, setRestante] = useState(SEGUNDOS_ATE_A_PROXIMA);

  const veredito = comoVeredito(resultado.ultimaConferencia?.vereditoGeral);
  const exigeReconhecimento =
    veredito === "divergente" || veredito === "nao_conferivel";

  // Auto-avanço: só quando não há alerta a reconhecer e o operador não está no
  // meio de uma anotação. Qualquer uma das duas coisas segura a tela.
  const avancaSozinho =
    !exigeReconhecimento && !formularioAberto && !anotando && !excecaoAnotada;

  useEffect(() => {
    if (!avancaSozinho) return;

    const fim = window.setTimeout(aoProximo, SEGUNDOS_ATE_A_PROXIMA * 1000);
    const tique = window.setInterval(
      () => setRestante((atual) => Math.max(0, atual - 1)),
      1000,
    );

    return () => {
      window.clearTimeout(fim);
      window.clearInterval(tique);
    };
  }, [avancaSozinho, aoProximo]);

  const enviarExcecao = useCallback(() => {
    const limpo = texto.trim();
    if (!limpo) return;
    aoAnotarExcecao(limpo);
  }, [aoAnotarExcecao, texto]);

  const faixa =
    veredito === "divergente"
      ? "divergente"
      : veredito === "nao_conferivel"
        ? "nao_conferivel"
        : veredito === "conforme"
          ? "conforme"
          : "acento";

  return (
    <div className="space-y-3">
      {/* --- identidade do que acabou de passar ------------------------ */}
      <Cartao faixa={faixa}>
        <p className="text-xs font-semibold uppercase tracking-wide text-conteudo-suave">
          Passagem registrada
        </p>

        <p className="numeros mt-1 text-4xl leading-none font-bold text-conteudo">
          {resultado.transformador.numeroSerie}
        </p>

        <dl className="mt-3 grid grid-cols-2 gap-x-3 gap-y-2 text-sm">
          <div>
            <dt className="text-xs text-conteudo-suave">Etapa</dt>
            <dd className="font-semibold text-conteudo">
              {resultado.checkpoint.ordem}. {resultado.checkpoint.nome}
            </dd>
          </div>
          <div>
            <dt className="text-xs text-conteudo-suave">Hora</dt>
            <dd className="numeros font-semibold text-conteudo">
              {formatarHora(resultado.passagem.createdAt)}
              <span className="ml-2 text-xs font-normal text-conteudo-suave">
                {formatarData(resultado.passagem.createdAt)}
              </span>
            </dd>
          </div>
          <div>
            <dt className="text-xs text-conteudo-suave">Patrimônio</dt>
            <dd className="numeros font-medium text-conteudo">
              {resultado.transformador.patrimonio || "—"}
            </dd>
          </div>
          <div>
            <dt className="text-xs text-conteudo-suave">Cliente</dt>
            <dd className="truncate font-medium text-conteudo">
              {resultado.transformador.cliente || "—"}
            </dd>
          </div>
        </dl>

        {resultado.passagem.observacao ? (
          <p className="mt-3 rounded-xl border border-borda bg-superficie-2 p-2 text-sm text-conteudo">
            <span className="font-semibold">Observação: </span>
            {resultado.passagem.observacao}
          </p>
        ) : null}
      </Cartao>

      {/* --- o alerta (critério 6) ------------------------------------- */}
      <AlertaDeConferencia
        ultimaConferencia={resultado.ultimaConferencia}
        numeroSerie={resultado.transformador.numeroSerie}
      />

      {/* --- exceção aceita: sempre DEPOIS do alerta -------------------- */}
      <div>
        {excecaoAnotada ? (
          <Aviso tom="ok">
            Exceção anotada às{" "}
            <span className="numeros">
              {formatarHora(excecaoAnotada.createdAt)}
            </span>
            , como novo registro nesta etapa: “{excecaoAnotada.observacao}”
          </Aviso>
        ) : anotando ? (
          <CarregandoAcao mensagem="Registrando a exceção aceita…" />
        ) : formularioAberto ? (
          <form
            className="space-y-2 rounded-2xl border border-borda bg-superficie p-4 shadow-cartao"
            onSubmit={(evento) => {
              evento.preventDefault();
              enviarExcecao();
            }}
          >
            <AreaTexto
              rotulo="Exceção aceita pelo time"
              value={texto}
              onChange={(evento) => setTexto(evento.target.value)}
              placeholder="Ex.: seguiu por decisão do supervisor — placa será trocada na etapa seguinte."
              ajuda="Entra como um NOVO registro de passagem nesta etapa, com a justificativa. O registro anterior não é alterado — a trilha é imutável."
            />
            <div className="flex flex-wrap gap-2">
              <Botao type="submit" disabled={!texto.trim()}>
                Registrar exceção
              </Botao>
              <Botao
                type="button"
                variante="fantasma"
                onClick={() => {
                  setFormularioAberto(false);
                  // A contagem recomeça do zero: ela ficou parada enquanto o
                  // formulário esteve aberto, e mostrar "(1)" logo depois de
                  // cancelar faria a tela sumir na cara do operador.
                  setRestante(SEGUNDOS_ATE_A_PROXIMA);
                }}
              >
                Cancelar
              </Botao>
            </div>
          </form>
        ) : (
          <Botao
            variante="secundario"
            className="w-full"
            onClick={() => setFormularioAberto(true)}
          >
            Anotar exceção aceita (opcional)
          </Botao>
        )}

        {erroAnotacao ? (
          <AvisoDeErro erro={erroAnotacao} className="mt-2" />
        ) : null}
      </div>

      {/* --- próxima peça ---------------------------------------------- */}
      <div className="space-y-1">
        <Botao
          tamanho="grande"
          variante={exigeReconhecimento ? "perigo" : "primario"}
          onClick={aoProximo}
        >
          {exigeReconhecimento
            ? "Entendi o alerta — próxima peça"
            : avancaSozinho
              ? `Próxima peça (${restante})`
              : "Próxima peça"}
        </Botao>

        <p className="text-center text-xs text-conteudo-suave">
          {exigeReconhecimento
            ? "Esta tela não avança sozinha: o alerta precisa ser reconhecido."
            : avancaSozinho
              ? "O scanner reabre sozinho — toque para ir agora."
              : "Toque para voltar ao scanner."}
        </p>
      </div>
    </div>
  );
}
