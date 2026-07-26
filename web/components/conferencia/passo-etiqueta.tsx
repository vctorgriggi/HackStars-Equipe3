"use client";

/**
 * PASSO 2 — a etiqueta (QR): a FONTE DA VERDADE da conferência.
 *
 * O que sai daqui é TEXTO CRU. O front decodifica a imagem do QR (isso é
 * câmera, não regra) e para por aí: quem interpreta o payload — e diz o que é
 * número de série, patrimônio e cliente — é o parser da API. Por isso a tela
 * mostra o texto como veio, monoespaçado, sem "campo lido: ...": qualquer
 * interpretação aqui seria uma segunda verdade capaz de divergir da primeira.
 *
 * O erro do QR só aparece no disparo (é lá que a API interpreta o payload), e
 * volta para cá com a orientação do que fazer — em especial o
 * `payload-somente-codigo`: QR que traz só um código de consulta não conferiu
 * nada, e o caminho é digitar os dados impressos na etiqueta.
 */

import { QrLeitor } from "@/components/qr-leitor";
import {
  Aviso,
  AvisoDeErro,
  Botao,
  CabecalhoCartao,
  Cartao,
} from "@/components/ui";
import type { ErroApi } from "@/lib/api";

import { definirPayloadQr, limparPayloadQr, irParaPasso } from "./sessao";

/** Códigos em que o QR foi lido, mas não serve — só digitando se resolve. */
const EXIGEM_DIGITACAO = new Set([
  "payload-somente-codigo",
  "campos-obrigatorios-ausentes",
  "posicional-numero-serie-ausente",
  "posicional-numero-serie-invalido",
  "posicional-patrimonio-ausente",
  "posicional-patrimonio-invalido",
]);

function OrientacaoDaEtiqueta({
  erro,
  precisaTrocar,
}: {
  erro: ErroApi;
  /** A etiqueta atual ainda está na tela: o operador tem de substituí-la. */
  precisaTrocar: boolean;
}) {
  const digitar = erro.codigo ? EXIGEM_DIGITACAO.has(erro.codigo) : false;

  return (
    <Aviso tom="alerta">
      {precisaTrocar ? (
        <>
          Toque em <strong>Ler outra etiqueta</strong> e,{" "}
          {digitar ? "lá dentro, em " : "se a leitura falhar de novo, em "}
          <strong>Digitar ou colar o texto do QR</strong>.{" "}
        </>
      ) : (
        <>
          Toque em <strong>Digitar ou colar o texto do QR</strong>, aqui
          embaixo.{" "}
        </>
      )}
      {digitar
        ? "Informe o que está impresso na etiqueta: pedido, número de série, seq, patrimônio e cliente. A API precisa dos dados da peça, não de um código de consulta."
        : "Se o QR estiver riscado ou sujo, digitar o conteúdo da etiqueta resolve."}
    </Aviso>
  );
}

export interface PassoEtiquetaProps {
  payloadQr: string | null;
  /** Erro do disparo que aponta para a etiqueta (QR ilegível, só-código…). */
  erroDaEtiqueta: ErroApi | null;
}

export function PassoEtiqueta({ payloadQr, erroDaEtiqueta }: PassoEtiquetaProps) {
  if (!payloadQr) {
    return (
      <div className="space-y-4">
        {erroDaEtiqueta ? (
          <>
            <AvisoDeErro erro={erroDaEtiqueta} />
            <OrientacaoDaEtiqueta erro={erroDaEtiqueta} precisaTrocar={false} />
          </>
        ) : null}

        <QrLeitor
          aoLer={definirPayloadQr}
          titulo="Leia o QR da etiqueta"
          iniciarAberto
          rotuloConfirmar="Usar este texto"
        />

        <p className="px-1 text-xs text-conteudo-suave">
          O texto vai cru para o servidor: quem interpreta a etiqueta é a API.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {erroDaEtiqueta ? (
        <>
          <AvisoDeErro erro={erroDaEtiqueta} />
          <OrientacaoDaEtiqueta erro={erroDaEtiqueta} precisaTrocar />
        </>
      ) : null}

      <Cartao faixa={erroDaEtiqueta ? "divergente" : "acento"}>
        <CabecalhoCartao
          titulo="Etiqueta lida"
          descricao="Confira se é a etiqueta desta peça antes de fotografar."
        />

        <pre className="max-h-48 overflow-auto rounded-xl border border-borda bg-superficie-2 p-3 font-mono text-xs break-words whitespace-pre-wrap text-conteudo">
          {payloadQr}
        </pre>

        <div className="mt-4 space-y-2">
          {erroDaEtiqueta ? (
            <>
              <Botao tamanho="grande" onClick={limparPayloadQr}>
                Ler outra etiqueta
              </Botao>
              <Botao
                variante="secundario"
                className="w-full"
                onClick={() => irParaPasso("fotos")}
              >
                Seguir mesmo assim
              </Botao>
            </>
          ) : (
            <>
              <Botao tamanho="grande" onClick={() => irParaPasso("fotos")}>
                Continuar para as fotos
              </Botao>
              <Botao
                variante="secundario"
                className="w-full"
                onClick={limparPayloadQr}
              >
                Ler outra etiqueta
              </Botao>
            </>
          )}
        </div>
      </Cartao>
    </div>
  );
}
