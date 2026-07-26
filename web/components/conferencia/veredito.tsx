"use client";

/**
 * O VEREDITO — a tela pela qual todo o resto existe.
 *
 * Regra que manda aqui: **nada nesta tela é calculado**. Veredito por campo,
 * veredito geral, motivo, incoerências e achados chegam prontos da API; o
 * componente escolhe cor, ordem e tamanho. Se um dia alguém precisar de um
 * número que não veio no payload, ele nasce na API — não num `useMemo` daqui.
 *
 * Três decisões de leitura, todas com motivo de chão de fábrica:
 *
 * 1. DIVERGENTE PRIMEIRO, e inconfundível. A divergência para a produção; ela
 *    não pode estar embaixo de oito campos conformes. Conforme vem recolhido:
 *    é a informação que o operador não precisa ler.
 * 2. O PORQUÊ VIAJA JUNTO. `motivo` só existe nesta resposta (gap 22 do
 *    CLAUDE.md — a releitura não o traz), e ele é o que separa "reenquadre a
 *    foto" de "a peça está gravada errada". Jogar fora seria mandar o operador
 *    até a peça à toa.
 * 3. A ETAPA ANDA COLADA NO VEREDITO. `conforme` de gate parcial NÃO atesta a
 *    peça inteira (gap 14): a faixa diz sempre qual recorte foi avaliado.
 */

import { juntarClasses } from "@/lib/classes";
import {
  comoVeredito,
  type AchadoInconsistente,
  type CampoExecutado,
  type IncoerenciaEntreCampos,
  type ResultadoExecucaoComExtracao,
  type Veredito,
} from "@/lib/tipos";
import {
  Aviso,
  Botao,
  BotaoLink,
  CabecalhoCartao,
  Cartao,
  Chip,
  EXPLICACAO_VEREDITO,
  SeloIncoerencia,
  SeloVeredito,
} from "@/components/ui";

import { EvidenciaDaLeitura } from "./evidencia";
import {
  explicarMotivo,
  formatarConfianca,
  formatarDataHora,
  rotuloCampo,
  rotuloVista,
} from "./rotulos";

/* ------------------------------------------------------------------ *
 * Faixa do veredito geral
 * ------------------------------------------------------------------ */

const FAIXA: Record<Veredito, string> = {
  conforme: "border-conforme bg-conforme-fundo text-conforme",
  divergente: "border-4 border-divergente bg-divergente-fundo text-divergente",
  nao_conferivel:
    "border-nao-conferivel bg-nao-conferivel-fundo text-nao-conferivel",
};

const TITULO: Record<Veredito, string> = {
  conforme: "CONFORME",
  divergente: "DIVERGENTE",
  nao_conferivel: "NÃO CONFERÍVEL",
};

function FaixaDoVeredito({
  resultado,
}: {
  resultado: ResultadoExecucaoComExtracao;
}) {
  const classe = comoVeredito(resultado.conferencia.vereditoGeral);
  const etapa = resultado.etapaAvaliada;

  return (
    <section
      // `alert` (assertivo) so no divergente — e o unico estado que PARA a
      // producao, e leitor de tela precisa anuncia-lo interrompendo. Os demais
      // ficam em `status`, como nos alertas das outras telas.
      role={classe === "divergente" ? "alert" : "status"}
      className={juntarClasses(
        "rounded-2xl border p-5 text-center",
        classe ? FAIXA[classe] : "border-borda bg-superficie-2 text-conteudo",
      )}
    >
      <p className="text-xs font-semibold tracking-widest uppercase opacity-80">
        Veredito da conferência
      </p>
      <p className="mt-1 text-4xl font-extrabold tracking-tight">
        {classe ? TITULO[classe] : "SEM VEREDITO"}
      </p>
      <p className="mt-2 text-sm font-medium">
        {classe ? EXPLICACAO_VEREDITO[classe] : "A API não gravou um veredito."}
      </p>

      <p className="mt-3 border-t border-current/20 pt-3 text-sm">
        {etapa ? (
          <>
            Avaliado no gate <strong>{etapa.ordem}. {etapa.nome}</strong>
          </>
        ) : (
          <>Avaliada a peça inteira (checklist completa do projeto)</>
        )}
        {" · "}
        {resultado.campos.length} de {resultado.camposAvaliados} campos do
        recorte comparados
      </p>
    </section>
  );
}

/* ------------------------------------------------------------------ *
 * Tela
 * ------------------------------------------------------------------ */

export interface TelaDeVereditoProps {
  resultado: ResultadoExecucaoComExtracao;
  aoNovaConferencia: () => void;
}

const ORDEM_DOS_GRUPOS: Veredito[] = [
  "divergente",
  "nao_conferivel",
  "conforme",
];

export function TelaDeVeredito({
  resultado,
  aoNovaConferencia,
}: TelaDeVereditoProps) {
  const porVeredito = (veredito: Veredito): CampoExecutado[] =>
    resultado.campos.filter(
      (campo) => comoVeredito(campo.veredito) === veredito,
    );

  const semClasse = resultado.campos.filter(
    (campo) => comoVeredito(campo.veredito) === null,
  );

  const classeGeral = comoVeredito(resultado.conferencia.vereditoGeral);
  const parcialConforme = classeGeral === "conforme" && resultado.etapaAvaliada;

  return (
    <div className="space-y-4">
      <FaixaDoVeredito resultado={resultado} />

      {parcialConforme ? (
        <Aviso tom="alerta">
          Este <strong>conforme</strong> cobre só o que este gate confere. Ele
          não atesta a peça inteira — os campos das etapas seguintes ainda não
          foram conferidos.
        </Aviso>
      ) : null}

      <CartaoDaPeca resultado={resultado} />

      {ORDEM_DOS_GRUPOS.map((veredito) => {
        const campos = porVeredito(veredito);
        if (!campos.length) return null;

        return (
          <GrupoDeCampos
            key={veredito}
            veredito={veredito}
            campos={campos}
            recolhido={veredito === "conforme"}
          />
        );
      })}

      {semClasse.length ? (
        <GrupoDeCampos veredito={null} campos={semClasse} recolhido />
      ) : null}

      {resultado.incoerencias.length ? (
        <BlocoDeIncoerencias incoerencias={resultado.incoerencias} />
      ) : null}

      {resultado.achadosInconsistentes.length ? (
        <BlocoDeAchados achados={resultado.achadosInconsistentes} />
      ) : null}

      <ResumoDaExtracao resultado={resultado} />

      <div className="space-y-2 pb-4">
        <Botao tamanho="grande" onClick={aoNovaConferencia}>
          Conferir outra peça
        </Botao>
        <BotaoLink
          variante="secundario"
          tamanho="grande"
          href={`/peca?numeroSerie=${encodeURIComponent(resultado.transformador.numeroSerie)}`}
        >
          Ver histórico desta peça
        </BotaoLink>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ *
 * Identidade da peça
 * ------------------------------------------------------------------ */

function CartaoDaPeca({
  resultado,
}: {
  resultado: ResultadoExecucaoComExtracao;
}) {
  const { transformador, conferencia } = resultado;

  return (
    <Cartao>
      <CabecalhoCartao
        titulo="Peça conferida"
        descricao={`Conferência de ${formatarDataHora(conferencia.createdAt)}`}
        acao={<Chip tom="neutro">{transformador.projetoModeloCodigo}</Chip>}
      />

      <dl className="grid grid-cols-2 gap-3 text-sm">
        <div>
          <dt className="text-conteudo-suave">Número de série</dt>
          <dd className="numeros text-lg font-bold text-conteudo">
            {transformador.numeroSerie}
          </dd>
        </div>
        <div>
          <dt className="text-conteudo-suave">Patrimônio</dt>
          <dd className="numeros text-lg font-bold text-conteudo">
            {transformador.patrimonio || "—"}
          </dd>
        </div>
        <div className="col-span-2">
          <dt className="text-conteudo-suave">Cliente</dt>
          <dd className="text-conteudo">{transformador.cliente || "—"}</dd>
        </div>
      </dl>
    </Cartao>
  );
}

/* ------------------------------------------------------------------ *
 * Grupos de campos
 * ------------------------------------------------------------------ */

const TITULO_DO_GRUPO: Record<Veredito, string> = {
  divergente: "Divergentes — pare a peça",
  nao_conferivel: "Não conferíveis — precisam de olho humano",
  conforme: "Conformes",
};

function GrupoDeCampos({
  veredito,
  campos,
  recolhido,
}: {
  veredito: Veredito | null;
  campos: CampoExecutado[];
  recolhido: boolean;
}) {
  const titulo = veredito
    ? TITULO_DO_GRUPO[veredito]
    : "Campos sem veredito reconhecido";

  const lista = (
    <ul className="space-y-3">
      {campos.map((campo) => (
        <li key={campo.campoConferidoId}>
          <CartaoDeCampo campo={campo} />
        </li>
      ))}
    </ul>
  );

  if (!recolhido) {
    return (
      <section className="space-y-3">
        <h2 className="flex items-center gap-2 px-1 text-base font-semibold text-conteudo">
          {titulo}
          <Chip tom="neutro">{campos.length}</Chip>
        </h2>
        {lista}
      </section>
    );
  }

  return (
    <details className="rounded-2xl border border-borda bg-superficie p-3">
      <summary className="flex min-h-12 cursor-pointer list-none items-center gap-2 py-2 text-base font-semibold text-conteudo">
        {titulo}
        <Chip tom="neutro">{campos.length}</Chip>
        <span aria-hidden className="ml-auto text-conteudo-suave">
          ▾
        </span>
      </summary>
      <div className="mt-3">{lista}</div>
    </details>
  );
}

function CartaoDeCampo({ campo }: { campo: CampoExecutado }) {
  const classe = comoVeredito(campo.veredito);
  const motivo = explicarMotivo(campo.motivo);

  return (
    <Cartao compacto faixa={classe ?? undefined}>
      <div className="mb-2 flex items-start justify-between gap-2">
        <div className="min-w-0">
          <h3 className="font-semibold text-conteudo">
            {rotuloCampo(campo.campo)}
          </h3>
          <p className="font-mono text-xs break-words text-conteudo-suave">
            {campo.campo}
          </p>
        </div>
        <SeloVeredito veredito={campo.veredito} tamanho="pequeno" />
      </div>

      <div className="mb-3 flex flex-wrap gap-1.5">
        <Chip tom="neutro">{rotuloVista(campo.fonteFisica)}</Chip>
        <Chip tom="neutro">
          {campo.obrigatorio ? "Obrigatório" : "Opcional"}
        </Chip>
        <Chip tom="neutro" titulo="Score da leitura devolvido pela visão">
          Confiança {formatarConfianca(campo.confianca)}
        </Chip>
      </div>

      <dl className="grid grid-cols-2 gap-3">
        <div className="min-w-0">
          <dt className="text-xs text-conteudo-suave">Etiqueta (esperado)</dt>
          <dd className="numeros text-xl font-bold break-words text-conteudo">
            {campo.valorEsperado ?? "—"}
          </dd>
        </div>
        <div className="min-w-0">
          <dt className="text-xs text-conteudo-suave">Peça (lido)</dt>
          <dd
            className={juntarClasses(
              "numeros text-xl font-bold break-words",
              classe === "divergente" ? "text-divergente" : "text-conteudo",
            )}
          >
            {campo.valorLido ?? "não lido"}
          </dd>
        </div>
      </dl>

      {motivo ? (
        <div className="mt-3 rounded-xl border border-borda bg-superficie-2 p-3 text-sm">
          <p className="font-medium text-conteudo">
            {motivo.titulo}
            {campo.campoDaLeitura ? (
              <span className="font-normal text-conteudo-suave">
                {" "}
                (o número lido é de{" "}
                <code className="font-mono">{campo.campoDaLeitura}</code>)
              </span>
            ) : null}
          </p>
          <p className="mt-1 text-conteudo-suave">{motivo.acao}</p>
        </div>
      ) : null}

      <div className="mt-3">
        <EvidenciaDaLeitura
          foto={campo.fotoEvidencia}
          regiaoLeitura={campo.regiaoLeitura}
          legenda={campo.valorLido ?? rotuloVista(campo.fonteFisica)}
        />
      </div>
    </Cartao>
  );
}

/* ------------------------------------------------------------------ *
 * Incoerências entre campos irmãos (violeta)
 * ------------------------------------------------------------------ */

function BlocoDeIncoerencias({
  incoerencias,
}: {
  incoerencias: IncoerenciaEntreCampos[];
}) {
  return (
    <Cartao faixa="incoerencia">
      <CabecalhoCartao
        titulo="Posições da mesma marcação não concordam"
        descricao="A série é gravada mais de uma vez de propósito. Quando as posições leem números diferentes, a API rebaixa o campo — nunca promove, e não há voto da maioria."
        acao={<SeloIncoerencia tamanho="pequeno" />}
      />

      <ul className="space-y-3">
        {incoerencias.map((incoerencia) => (
          <li
            key={incoerencia.valorEsperado + incoerencia.campos.join("|")}
            className="rounded-xl border border-incoerencia/40 bg-incoerencia-fundo p-3"
          >
            <p className="text-sm text-incoerencia">
              Esperado pela etiqueta:{" "}
              <strong className="numeros">{incoerencia.valorEsperado}</strong>
            </p>

            <ul className="mt-2 space-y-1.5">
              {incoerencia.leituras.map((leitura) => (
                <li
                  key={leitura.campo}
                  className="flex flex-wrap items-baseline justify-between gap-2 border-t border-incoerencia/20 pt-1.5 text-sm"
                >
                  <span className="min-w-0">
                    <span className="font-medium text-conteudo">
                      {rotuloCampo(leitura.campo)}
                    </span>{" "}
                    <span className="text-conteudo-suave">
                      · {rotuloVista(leitura.fonteFisica)}
                    </span>
                  </span>
                  <span className="numeros font-bold text-conteudo">
                    {leitura.valorLido}
                    <span className="ml-2 text-xs font-normal text-conteudo-suave">
                      {formatarConfianca(leitura.confianca)}
                    </span>
                  </span>
                </li>
              ))}
            </ul>
          </li>
        ))}
      </ul>
    </Cartao>
  );
}

/* ------------------------------------------------------------------ *
 * Achados inconsistentes (âmbar — alarme, nunca veredito)
 * ------------------------------------------------------------------ */

function BlocoDeAchados({ achados }: { achados: AchadoInconsistente[] }) {
  return (
    <Cartao faixa="nao_conferivel">
      <CabecalhoCartao
        titulo="Textos na peça que a etiqueta não conhece"
        descricao="A visão leu estes números em algum lugar das fotos e nenhum deles bate com a etiqueta. É alarme: NÃO altera o veredito e não fica gravado — olhe as fotos antes de liberar."
      />

      <ul className="space-y-3">
        {achados.map((achado) => (
          <li
            key={achado.texto}
            className="rounded-xl border border-nao-conferivel/40 bg-nao-conferivel-fundo p-3"
          >
            <p className="numeros text-xl font-bold text-nao-conferivel">
              {achado.texto}
            </p>

            <ul className="mt-2 flex flex-wrap gap-3">
              {achado.ocorrencias.map((ocorrencia, indice) => (
                <li key={`${achado.texto}-${ocorrencia.fotoEvidenciaId ?? indice}`}>
                  <EvidenciaDaLeitura
                    foto={ocorrencia.foto}
                    regiaoLeitura={ocorrencia.regiaoLeitura}
                    legenda={`${achado.texto} · ${formatarConfianca(ocorrencia.confianca)}`}
                  />
                </li>
              ))}
            </ul>
          </li>
        ))}
      </ul>
    </Cartao>
  );
}

/* ------------------------------------------------------------------ *
 * O que a visão fez (transparência de custo)
 * ------------------------------------------------------------------ */

function ResumoDaExtracao({
  resultado,
}: {
  resultado: ResultadoExecucaoComExtracao;
}) {
  const { extracao } = resultado;

  return (
    <Cartao compacto>
      <div className="flex flex-wrap items-center gap-1.5">
        <span className="text-xs font-medium text-conteudo-suave">
          O que a visão fez:
        </span>
        <Chip
          tom={extracao.driver === "mock" ? "alerta" : "neutro"}
          titulo="Adapter de visão ativo no servidor"
        >
          {extracao.driver}
        </Chip>
        <Chip tom="neutro">{extracao.fotos} fotos lidas</Chip>
        <Chip tom="neutro">{extracao.leiturasProduzidas} leituras</Chip>
        <Chip tom="neutro">{extracao.achadosLivres} textos vistos</Chip>
        {extracao.fotosForaDoRecorte > 0 ? (
          <Chip tom="alerta">
            {extracao.fotosForaDoRecorte} fora do recorte
          </Chip>
        ) : null}
      </div>

      {extracao.driver === "mock" ? (
        <p className="mt-2 text-xs text-nao-conferivel">
          Servidor em modo simulado: as leituras são fixas de demonstração, não
          saíram destas fotos.
        </p>
      ) : null}

      {extracao.fotosForaDoRecorte > 0 ? (
        <p className="mt-2 text-xs text-conteudo-suave">
          {extracao.fotosForaDoRecorte} foto(s) não foram enviadas à visão
          porque nenhum campo desta etapa sai daquelas vistas — custo que deixou
          de ser pago. Se você fotografou algo que importa, a etapa pode estar
          errada.
        </p>
      ) : null}
    </Cartao>
  );
}
