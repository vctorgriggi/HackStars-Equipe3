"use client";

/**
 * REGISTRAR PASSAGEM — T4.4 (scan no checkpoint) e T4.6 (alerta no ato).
 *
 * Uma tela de UM GESTO: o aparelho já sabe em que etapa está (é "a câmera da
 * serigrafia"), então a única coisa que o operador faz é apontar para o QR. O
 * scanner abre sozinho, a leitura dispara `POST /passagens/registrar`
 * imediatamente e o resultado volta com o alerta pronto.
 *
 * POR QUE UMA CHAMADA SÓ: `registrarPassagem` já devolve `ultimaConferencia` —
 * o dado do critério 6 — junto do registro. Buscar o veredito depois seria uma
 * segunda ida ao servidor no meio do gate, e a peça não espera.
 *
 * FRONTEIRAS (CLAUDE.md): o payload do QR sai daqui CRU — quem interpreta é o
 * parser da API. Nenhum campo é comparado, nenhum veredito é recalculado: o
 * `vereditoGeral` que pinta o banner vermelho é o que a engine gravou. E
 * `etapaCodigo` é obrigatório, então sem etapa provisionada a tela nem deixa
 * escanear: melhor configurar o aparelho do que colecionar 422.
 *
 * O que NÃO é auto: nenhuma chamada de visão acontece nesta tela (passagem não
 * usa câmera de OCR), e o registro só sai de uma leitura explícita.
 */

import { useCallback, useState } from "react";
import { useMutation } from "@tanstack/react-query";

import { registrarPassagem } from "@/lib/api";
import { ehErroApi } from "@/lib/api";
import { useEtapa } from "@/lib/etapa";
import type {
  PassagemRegistrada,
  RegistrarPassagemEntrada,
  ResultadoRegistroPassagem,
} from "@/lib/tipos";
import { QrLeitor } from "@/components/qr-leitor";
import { SeletorDeEtapa } from "@/components/seletor-de-etapa";
import {
  Aviso,
  AvisoDeErro,
  Botao,
  CarregandoAcao,
  Cartao,
} from "@/components/ui";
import { CartaoDaPassagem } from "@/components/passagem/cartao-da-passagem";
import {
  FilaDaSessao,
  itemDaFila,
  registrarNaFila,
} from "@/components/passagem/fila-da-sessao";

export default function PaginaPassagem() {
  const { codigo, nome, desconhecida, carregandoEtapas } = useEtapa();

  const [seletorAberto, setSeletorAberto] = useState(false);
  /** Guardado para a anotação de exceção poder reusar a MESMA etiqueta lida. */
  const [payloadQr, setPayloadQr] = useState<string | null>(null);
  const [excecaoAnotada, setExcecaoAnotada] =
    useState<PassagemRegistrada | null>(null);

  // Duas mutations, de propósito. Se a anotação de exceção usasse a mesma, o
  // React Query zeraria `data` ao começar e o alerta vermelho PISCARIA fora da
  // tela no meio do registro da justificativa.
  const registro = useMutation<
    ResultadoRegistroPassagem,
    unknown,
    RegistrarPassagemEntrada
  >({
    mutationFn: (entrada) => registrarPassagem(entrada),
    onSuccess: (resultado) => registrarNaFila(itemDaFila(resultado)),
  });

  const excecao = useMutation<
    ResultadoRegistroPassagem,
    unknown,
    RegistrarPassagemEntrada
  >({
    mutationFn: (entrada) => registrarPassagem(entrada),
    onSuccess: (resultado) => {
      registrarNaFila(itemDaFila(resultado));
      setExcecaoAnotada(resultado.passagem);
    },
  });

  const { mutate: registrar, reset: limparRegistro } = registro;
  const { mutate: anotar, reset: limparExcecao } = excecao;

  const aoLer = useCallback(
    (payloadCru: string) => {
      if (!codigo) return;
      setPayloadQr(payloadCru);
      registrar({ payloadQr: payloadCru, etapaCodigo: codigo });
    },
    [codigo, registrar],
  );

  const proximaPeca = useCallback(() => {
    limparRegistro();
    limparExcecao();
    setExcecaoAnotada(null);
    setPayloadQr(null);
  }, [limparExcecao, limparRegistro]);

  const aoAnotarExcecao = useCallback(
    (observacao: string) => {
      if (!codigo || !payloadQr) return;
      anotar({ payloadQr, etapaCodigo: codigo, observacao });
    },
    [anotar, codigo, payloadQr],
  );

  const semEtapa = !codigo;
  const etapaImpede = semEtapa || desconhecida;
  const erro = registro.error;
  const erroDeEtapa = ehErroApi(erro) && erro.codigo === "etapa-desconhecida";
  // Medido em 2026-07-26: o QR da etiqueta adesiva REAL é um código de lookup
  // de 13 dígitos, e a API o recusa. O operador precisa saber que a saída é o
  // QR da placa ou a digitação — senão fica reescaneando a mesma etiqueta.
  const erroDeQrSemDados =
    ehErroApi(erro) && erro.codigo === "payload-somente-codigo";

  return (
    <div className="space-y-4">
      <header>
        <h1 className="text-2xl font-semibold text-conteudo">
          Registrar passagem
        </h1>
        <p className="mt-1 text-sm text-conteudo-suave">
          Um scan por peça. A passagem nasce na etapa deste aparelho, e o
          sistema avisa na hora se a peça tem divergência aberta.
        </p>
      </header>

      {/* --- etapa provisionada, sempre à vista ------------------------ */}
      <Cartao compacto faixa={etapaImpede ? "nao_conferivel" : "acento"}>
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-wide text-conteudo-suave">
              Etapa deste aparelho
            </p>
            <p className="truncate text-base font-semibold text-conteudo">
              {nome ?? "Não configurada"}
            </p>
          </div>
          <Botao
            variante="secundario"
            onClick={() => setSeletorAberto((aberto) => !aberto)}
          >
            {seletorAberto ? "Fechar" : "Trocar"}
          </Botao>
        </div>
      </Cartao>

      {semEtapa ? (
        <Aviso tom="alerta">
          Este aparelho ainda não tem etapa. Escolha em qual ponto da linha ele
          está — a passagem é registrada nessa etapa, então ela não pode ser
          adivinhada.
        </Aviso>
      ) : null}

      {seletorAberto || etapaImpede ? <SeletorDeEtapa /> : null}

      {/* --- o fluxo ---------------------------------------------------- */}
      {etapaImpede ? null : registro.isPending ? (
        <CarregandoAcao mensagem="Registrando a passagem nesta etapa…" />
      ) : registro.data ? (
        <CartaoDaPassagem
          resultado={registro.data}
          aoProximo={proximaPeca}
          aoAnotarExcecao={aoAnotarExcecao}
          anotando={excecao.isPending}
          erroAnotacao={excecao.error}
          excecaoAnotada={excecaoAnotada}
        />
      ) : (
        <>
          {erro ? (
            <div className="space-y-2">
              <AvisoDeErro erro={erro} />
              {erroDeEtapa ? (
                <Botao
                  variante="secundario"
                  className="w-full"
                  onClick={() => setSeletorAberto(true)}
                >
                  Configurar a etapa deste aparelho
                </Botao>
              ) : null}
              {erroDeQrSemDados ? (
                <Aviso tom="alerta">
                  O QR da etiqueta adesiva é só um código de consulta — ele não
                  carrega os dados da peça. Leia o QR da placa de identificação
                  ou use “Digitar ou colar o texto do QR”, abaixo, com o
                  conteúdo da etiqueta.
                </Aviso>
              ) : null}
              {ehErroApi(erro) && erro.status === 404 ? (
                <Aviso tom="alerta">
                  Esta peça não existe no sistema. Confira se o QR é da etiqueta
                  certa; se for, faça a conferência dela antes de registrar a
                  passagem.
                </Aviso>
              ) : null}
            </div>
          ) : null}

          {carregandoEtapas && !nome ? (
            <Aviso tom="neutro">Carregando as etapas da linha…</Aviso>
          ) : null}

          {/* O leitor remonta a cada volta ao scanner: a câmera reabre sozinha
              e o operador não precisa tocar em nada entre uma peça e outra.
              DEPOIS DE UM ERRO ela NÃO reabre: a prévia da câmera é alta e
              empurraria a mensagem para fora da tela — e o operador ficaria
              reescaneando a mesma etiqueta que a API acabou de recusar. */}
          <QrLeitor
            aoLer={aoLer}
            iniciarAberto={!erro}
            titulo={erro ? "Ler o QR de novo" : "Ler o QR da peça"}
            rotuloConfirmar="Registrar passagem"
          />
        </>
      )}

      <FilaDaSessao />
    </div>
  );
}
