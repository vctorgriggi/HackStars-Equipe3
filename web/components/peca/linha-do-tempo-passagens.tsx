"use client";

/**
 * Critério 5 do SPEC: as passagens da peça pelos checkpoints, em ordem
 * CRONOLÓGICA (mais antiga em cima), com nome da etapa e hora.
 *
 * A ordem é a que a API devolve (`GET /transformadores/:id/passagens`, ASC) —
 * a tela não reordena nada. O agrupamento por dia é só quebra visual: cada
 * evento continua sendo uma linha própria, inclusive scans repetidos na mesma
 * etapa (eles são eventos distintos de propósito, não duplicata a esconder).
 *
 * O último evento ganha destaque como "etapa mais recente registrada" — e não
 * como "onde a peça está": o sistema sabe por onde ela passou, não onde ela
 * parou.
 */

import { useState } from "react";

import {
  Aviso,
  AvisoDeErro,
  Botao,
  CabecalhoCartao,
  Carregando,
  Cartao,
  Chip,
} from "@/components/ui";
import { juntarClasses } from "@/lib/classes";
import type { PassagemResumo } from "@/lib/tipos";

import { formatarDia, formatarHora } from "./formato";

/**
 * Quantos eventos aparecem sem pedir. Uma peça que vai e volta de uma etapa
 * acumula dezenas de scans, e a lista inteira empurraria as CONFERÊNCIAS para
 * fora da tela — o operador rolaria muito para chegar ao que decide se a peça
 * segue. Nada é escondido: o botão traz os mais antigos, na mesma ordem.
 */
const EVENTOS_VISIVEIS = 8;

interface GrupoDoDia {
  dia: string;
  eventos: PassagemResumo[];
}

/** Quebra a lista (já ordenada pela API) em blocos consecutivos do mesmo dia. */
function agruparPorDia(passagens: PassagemResumo[]): GrupoDoDia[] {
  const grupos: GrupoDoDia[] = [];

  for (const evento of passagens) {
    const dia = formatarDia(evento.createdAt);
    const ultimo = grupos.at(-1);
    if (ultimo && ultimo.dia === dia) ultimo.eventos.push(evento);
    else grupos.push({ dia, eventos: [evento] });
  }

  return grupos;
}

function Evento({
  passagem,
  ehUltimoDoTudo,
  ehUltimoDoGrupo,
}: {
  passagem: PassagemResumo;
  ehUltimoDoTudo: boolean;
  ehUltimoDoGrupo: boolean;
}) {
  return (
    <li className="flex gap-3">
      {/* Trilho vertical: marcador + fio até o próximo evento. */}
      <div aria-hidden className="flex w-3 flex-col items-center">
        <span
          className={juntarClasses(
            "mt-1.5 size-3 shrink-0 rounded-full border-2",
            ehUltimoDoTudo
              ? "border-acento bg-acento"
              : "border-borda-forte bg-superficie",
          )}
        />
        {ehUltimoDoGrupo ? null : <span className="w-0.5 flex-1 bg-borda" />}
      </div>

      <div className={juntarClasses("min-w-0 flex-1", ehUltimoDoGrupo ? "" : "pb-4")}>
        <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
          <span className="text-base font-semibold text-conteudo">
            {passagem.checkpoint.ordem}. {passagem.checkpoint.nome}
          </span>
          <span className="numeros text-sm text-conteudo-suave">
            {formatarHora(passagem.createdAt)}
          </span>
          {ehUltimoDoTudo ? (
            <Chip tom="acento">Etapa mais recente</Chip>
          ) : null}
        </div>

        <p className="text-xs text-conteudo-suave">
          <code>{passagem.checkpoint.codigo}</code>
        </p>

        {passagem.observacao ? (
          <p className="mt-1 rounded-lg border border-borda bg-superficie-2 px-2 py-1 text-sm text-conteudo">
            {passagem.observacao}
          </p>
        ) : null}
      </div>
    </li>
  );
}

export interface LinhaDoTempoPassagensProps {
  passagens: PassagemResumo[];
  carregando: boolean;
  erro: unknown;
  /** A API pagina em 50; avisa que existem eventos além dos exibidos. */
  temMais?: boolean;
}

export function LinhaDoTempoPassagens({
  passagens,
  carregando,
  erro,
  temMais = false,
}: LinhaDoTempoPassagensProps) {
  const [mostrarTudo, setMostrarTudo] = useState(false);

  const ocultos = mostrarTudo
    ? 0
    : Math.max(0, passagens.length - EVENTOS_VISIVEIS);
  // Corta os MAIS ANTIGOS (início da lista ASC), nunca os recentes.
  const visiveis = ocultos > 0 ? passagens.slice(ocultos) : passagens;

  const grupos = agruparPorDia(visiveis);
  const ultimoId = passagens.at(-1)?.id ?? null;

  return (
    <Cartao>
      <CabecalhoCartao
        titulo="Trânsito na linha"
        descricao="Passagens por checkpoint, da mais antiga para a mais recente."
        acao={
          passagens.length ? (
            <Chip titulo="Eventos de passagem carregados" className="shrink-0">
              <span className="numeros">{passagens.length}</span> eventos
            </Chip>
          ) : null
        }
      />

      {carregando ? <Carregando linhas={3} rotulo="Carregando passagens…" /> : null}

      {!carregando && erro ? <AvisoDeErro erro={erro} /> : null}

      {!carregando && !erro && passagens.length === 0 ? (
        <Aviso tom="neutro">
          Nenhuma passagem registrada para esta peça. O registro nasce do scan do
          QR em um checkpoint — abra “Registrar passagem” no aparelho da etapa.
        </Aviso>
      ) : null}

      {!carregando && !erro && passagens.length > 0 ? (
        <div className="space-y-4">
          {ocultos > 0 ? (
            <Botao
              variante="secundario"
              className="w-full"
              onClick={() => setMostrarTudo(true)}
            >
              Mostrar {ocultos}{" "}
              {ocultos === 1 ? "evento mais antigo" : "eventos mais antigos"}
            </Botao>
          ) : null}

          {grupos.map((grupo) => (
            <div key={grupo.dia}>
              <p className="mb-2 text-xs font-semibold tracking-wide text-conteudo-suave uppercase">
                {grupo.dia}
              </p>
              <ol className="space-y-0">
                {grupo.eventos.map((evento, indice) => (
                  <Evento
                    key={evento.id}
                    passagem={evento}
                    ehUltimoDoTudo={evento.id === ultimoId}
                    ehUltimoDoGrupo={indice === grupo.eventos.length - 1}
                  />
                ))}
              </ol>
            </div>
          ))}

          {temMais ? (
            <p className="text-xs text-conteudo-suave">
              Existem passagens além destas: a consulta traz no máximo 50 eventos
              por vez.
            </p>
          ) : null}
        </div>
      ) : null}
    </Cartao>
  );
}
