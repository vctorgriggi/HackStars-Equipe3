"use client";

/**
 * PASSO 4 — o disparo.
 *
 * Este é o ÚNICO botão do app que gasta crédito de visão (constraint 4 do
 * SPEC), e é por isso que ele é um botão só, com o resumo do que vai acontecer
 * escrito acima dele — inclusive o custo. Operador que não sabe que apertar
 * custa dinheiro aperta duas vezes; operador que acha que travou, três.
 *
 * A espera é HONESTA pelo mesmo motivo: a chamada demora segundos (upload já
 * feito, mas o Textract relê recortes), então a tela diz o que está fazendo e
 * o botão some enquanto isso. Repetição automática está desligada no React
 * Query (`mutations.retry: 0`) — repetir sozinho seria pagar duas vezes.
 */

import {
  Aviso,
  AvisoDeErro,
  Botao,
  CabecalhoCartao,
  CarregandoAcao,
  Cartao,
  Chip,
} from "@/components/ui";
import type { ErroApi } from "@/lib/api";

import { custoMaximoDaVisao, rotuloVista } from "./rotulos";
import {
  idsDasFotosProntas,
  irParaPasso,
  type PassoDoStepper,
  type SessaoConferencia,
} from "./sessao";

/** Para onde mandar o operador quando o erro tem conserto conhecido. */
const CONSERTO_POR_CODIGO: Record<string, { passo: PassoDoStepper; rotulo: string }> = {
  "etapa-desconhecida": { passo: "etapa", rotulo: "Escolher outra etapa" },
  "etapa-sem-campos-conferiveis": {
    passo: "etapa",
    rotulo: "Escolher outra etapa",
  },
  "checklist-etapa-desconhecida": {
    passo: "etapa",
    rotulo: "Escolher outra etapa",
  },
  "payload-vazio": { passo: "etiqueta", rotulo: "Ler a etiqueta de novo" },
  "formato-desconhecido": {
    passo: "etiqueta",
    rotulo: "Ler a etiqueta de novo",
  },
  "payload-somente-codigo": {
    passo: "etiqueta",
    rotulo: "Digitar os dados da etiqueta",
  },
  "campos-obrigatorios-ausentes": {
    passo: "etiqueta",
    rotulo: "Digitar os dados da etiqueta",
  },
  "posicional-numero-serie-ausente": {
    passo: "etiqueta",
    rotulo: "Digitar os dados da etiqueta",
  },
  "posicional-numero-serie-invalido": {
    passo: "etiqueta",
    rotulo: "Digitar os dados da etiqueta",
  },
  "posicional-patrimonio-ausente": {
    passo: "etiqueta",
    rotulo: "Digitar os dados da etiqueta",
  },
  "posicional-patrimonio-invalido": {
    passo: "etiqueta",
    rotulo: "Digitar os dados da etiqueta",
  },
  "foto-evidencia-inexistente": { passo: "fotos", rotulo: "Refazer as fotos" },
  "falha-ao-ler-evidencia": { passo: "fotos", rotulo: "Refazer as fotos" },
  "mime-nao-suportado": { passo: "fotos", rotulo: "Refazer as fotos" },
};

export interface PassoConferirProps {
  sessao: SessaoConferencia;
  nomeDaEtapa: string | null;
  disparando: boolean;
  erro: unknown;
  /** Preenchido quando o fluxo teve de reenviar as fotos sozinho. */
  avisoDeReenvio: string | null;
  aoDisparar: () => void;
}

export function PassoConferir({
  sessao,
  nomeDaEtapa,
  disparando,
  erro,
  avisoDeReenvio,
  aoDisparar,
}: PassoConferirProps) {
  const prontas = idsDasFotosProntas(sessao);
  const vistas = Array.from(
    new Set(
      sessao.fotos
        .filter((foto) => foto.estado === "enviada")
        .map((foto) => foto.fonteFisica),
    ),
  );

  const conserto =
    erro && typeof erro === "object" && "codigo" in erro
      ? CONSERTO_POR_CODIGO[String((erro as ErroApi).codigo)]
      : undefined;

  return (
    <div className="space-y-4">
      <Cartao>
        <CabecalhoCartao
          titulo="Pronto para conferir"
          descricao="A partir daqui quem decide é o servidor: ele lê as fotos, compara com a etiqueta e devolve o veredito campo a campo."
        />

        <dl className="space-y-3 text-sm">
          <div>
            <dt className="text-conteudo-suave">Etapa</dt>
            <dd className="font-medium text-conteudo">
              {sessao.etapaCodigo
                ? (nomeDaEtapa ?? sessao.etapaCodigo)
                : "Peça inteira (sem gate)"}
            </dd>
          </div>

          <div>
            <dt className="text-conteudo-suave">Etiqueta</dt>
            <dd className="mt-1 max-h-20 overflow-auto rounded-lg border border-borda bg-superficie-2 p-2 font-mono text-xs break-words whitespace-pre-wrap text-conteudo">
              {sessao.payloadQr}
            </dd>
          </div>

          <div>
            <dt className="text-conteudo-suave">
              {prontas.length} {prontas.length === 1 ? "foto" : "fotos"}
            </dt>
            <dd className="mt-1 flex flex-wrap gap-1.5">
              {vistas.map((vista) => (
                <Chip key={vista} tom="neutro">
                  {rotuloVista(vista)}
                </Chip>
              ))}
            </dd>
          </div>
        </dl>
      </Cartao>

      <Aviso tom="neutro">
        Cada foto vai à visão da AWS uma vez, com teto de 3 chamadas (a foto
        inteira mais 2 recortes para confirmar marcação em relevo).{" "}
        <strong>Custo máximo desta conferência: {custoMaximoDaVisao(prontas.length)}.</strong>{" "}
        Só este botão gasta crédito — subir foto não gasta.
      </Aviso>

      {avisoDeReenvio ? <Aviso tom="alerta">{avisoDeReenvio}</Aviso> : null}

      {erro ? (
        <div className="space-y-2">
          <AvisoDeErro erro={erro} />
          {conserto ? (
            <Botao
              variante="secundario"
              className="w-full"
              onClick={() => irParaPasso(conserto.passo)}
            >
              {conserto.rotulo}
            </Botao>
          ) : null}
        </div>
      ) : null}

      {disparando ? (
        <CarregandoAcao
          mensagem={`Lendo ${prontas.length} ${prontas.length === 1 ? "foto" : "fotos"} com a visão e comparando com a etiqueta… isso leva alguns segundos. Não feche a tela.`}
        />
      ) : (
        <div className="space-y-2">
          <Botao
            tamanho="grande"
            disabled={prontas.length === 0}
            onClick={aoDisparar}
          >
            Conferir agora ({prontas.length}{" "}
            {prontas.length === 1 ? "foto" : "fotos"})
          </Botao>

          <Botao
            variante="secundario"
            className="w-full"
            onClick={() => irParaPasso("fotos")}
          >
            Voltar para as fotos
          </Botao>
        </div>
      )}
    </div>
  );
}
