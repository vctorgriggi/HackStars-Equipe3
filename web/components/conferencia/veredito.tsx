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
 * 4. HIERARQUIA, NÃO COR (feedback do dono do produto, 2026-07-26: "âmbar
 *    demais assusta; o principal é se as letras e os números batem com o
 *    plano"). A tela abre com a síntese de contagem (`ResumoExecutivo`), o
 *    âmbar é enquadrado como "sem afirmação — não é defeito confirmado" e os
 *    achados livres viram bloco recolhido. Nada disso mexe em regra: o
 *    divergente continua dominando cor e primeira frase, âmbar nunca é
 *    apresentado como aprovado, e o obrigatório sem afirmação nunca fica
 *    atrás de um clique.
 */

import { useState } from "react";

import { gerarLaudo } from "@/lib/api";
import { juntarClasses } from "@/lib/classes";
import {
  comoVeredito,
  DISCLAIMER_LAUDO,
  type AchadoInconsistente,
  type CampoExecutado,
  type IncoerenciaEntreCampos,
  type LaudoDaConferencia,
  type ResultadoExecucaoComExtracao,
  type Veredito,
} from "@/lib/tipos";
import {
  Aviso,
  AvisoDeErro,
  Botao,
  BotaoLink,
  CabecalhoCartao,
  CarregandoAcao,
  Cartao,
  Chip,
  EXPLICACAO_VEREDITO,
  SeloIncoerencia,
  SeloVeredito,
} from "@/components/ui";

import { EvidenciaDaLeitura } from "./evidencia";
import {
  acaoDoCampo,
  CHIP_DA_CLASSE,
  classificarMotivo,
  explicarMotivo,
  formatarConfianca,
  formatarDataHora,
  RESUMO_DA_CLASSE,
  rotuloCampo,
  rotuloVista,
  type ClasseDoMotivo,
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

      <ResumoExecutivo campos={resultado.campos} />

      <CartaoDaPeca resultado={resultado} />

      {ORDEM_DOS_GRUPOS.map((veredito) => {
        const campos = porVeredito(veredito);
        if (!campos.length) return null;

        if (veredito === "nao_conferivel") {
          return <GruposSemAfirmacao key={veredito} campos={campos} />;
        }

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

      {resultado.conferencia.id ? (
        <BlocoDoLaudo conferenciaId={resultado.conferencia.id} />
      ) : null}

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
 * Resumo executivo — a pergunta do dono do produto, em uma linha
 * ------------------------------------------------------------------ */

/**
 * "As letras e os números batem com o plano?" é a pergunta que o produto faz;
 * a tela respondia com uma pilha de cartões e deixava o operador somar sozinho.
 * Este bloco responde antes de qualquer lista.
 *
 * O QUE ELE É: contagem dos vereditos e dos motivos que a API mandou, dita em
 * português. O QUE ELE NÃO É: comparação, limiar, promoção nem rebaixamento —
 * remova todos os campos daqui e o veredito da faixa acima continua o mesmo
 * (regra de ouro do CLAUDE.md). Duas travas de conteúdo:
 *
 * 1. DIVERGENTE DOMINA. Havendo divergência, ela é a cor do bloco e a primeira
 *    frase; nenhuma contagem de conformes aparece antes dela.
 * 2. ÂMBAR NUNCA VIRA APROVAÇÃO. "Sem afirmação" é dito com essas palavras,
 *    separado dos conformes, e a frase termina lembrando que não é liberação.
 *    Suavizar o âmbar é o objetivo; escondê-lo seria o falso OK do domínio.
 */

interface SinteseDoVeredito {
  conformes: number;
  divergentes: number;
  semAfirmacao: number;
  /** Veredito fora dos três conhecidos — nunca somado aos outros. */
  semClasse: number;
  porClasse: { classe: ClasseDoMotivo; quantos: number }[];
  /** Âmbar sem motivo na resposta (releitura antiga) não é contado como captura. */
  semMotivo: number;
}

/** Atenção primeiro: é o único âmbar em que a hipótese "é a peça" está viva. */
const ORDEM_DAS_CLASSES: ClasseDoMotivo[] = ["atencao", "captura", "cobertura"];

function sintetizar(campos: CampoExecutado[]): SinteseDoVeredito {
  const contagem = new Map<ClasseDoMotivo, number>();
  let semMotivo = 0;

  for (const campo of campos) {
    if (comoVeredito(campo.veredito) !== "nao_conferivel") continue;
    const classe = classificarMotivo(campo.motivo);
    if (!classe) {
      semMotivo += 1;
      continue;
    }
    contagem.set(classe, (contagem.get(classe) ?? 0) + 1);
  }

  const quantos = (veredito: Veredito) =>
    campos.filter((campo) => comoVeredito(campo.veredito) === veredito).length;

  return {
    conformes: quantos("conforme"),
    divergentes: quantos("divergente"),
    semAfirmacao: quantos("nao_conferivel"),
    semClasse: campos.filter((campo) => comoVeredito(campo.veredito) === null)
      .length,
    porClasse: ORDEM_DAS_CLASSES.filter((classe) => contagem.has(classe)).map(
      (classe) => ({ classe, quantos: contagem.get(classe) ?? 0 }),
    ),
    semMotivo,
  };
}

function ResumoExecutivo({ campos }: { campos: CampoExecutado[] }) {
  if (!campos.length) return null;

  const sintese = sintetizar(campos);

  const conferem =
    sintese.conformes === 1
      ? "1 marcação confere"
      : `${sintese.conformes} marcações conferem`;

  const divergem =
    sintese.divergentes === 0
      ? "nenhuma diverge"
      : sintese.divergentes === 1
        ? "1 diverge"
        : `${sintese.divergentes} divergem`;

  // A frase do âmbar só promete "limitação de captura" quando TODO o âmbar é de
  // captura. Com um `leitura-de-outro-campo` no meio, dizer isso seria mentir
  // para baixo — e é justamente o âmbar que pode ser a peça.
  const tudoCaptura =
    sintese.semAfirmacao > 0 &&
    sintese.porClasse.length === 1 &&
    sintese.porClasse[0].classe === "captura" &&
    sintese.semMotivo === 0;

  return (
    <Cartao faixa={sintese.divergentes ? "divergente" : undefined}>
      <p className="text-xs font-semibold tracking-widest text-conteudo-suave uppercase">
        Conteúdo × plano
      </p>

      {sintese.divergentes ? (
        <p className="mt-1 text-2xl font-extrabold text-divergente">
          {sintese.divergentes === 1
            ? "1 marcação não bate com o plano."
            : `${sintese.divergentes} marcações não batem com o plano.`}
        </p>
      ) : (
        <p className="mt-1 text-2xl font-bold text-conteudo">
          Nenhuma marcação lida diverge do plano.
        </p>
      )}

      <p className="mt-1 text-base text-conteudo">
        <strong className="text-conforme">{conferem}</strong>,{" "}
        <strong
          className={sintese.divergentes ? "text-divergente" : "text-conteudo"}
        >
          {divergem}
        </strong>
        .
      </p>

      {sintese.semAfirmacao ? (
        <div className="mt-3 border-t border-borda pt-3">
          <p className="text-sm text-conteudo">
            <strong className="text-nao-conferivel">
              {sintese.semAfirmacao === 1
                ? "1 sem afirmação"
                : `${sintese.semAfirmacao} sem afirmação`}
            </strong>{" "}
            {tudoCaptura
              ? "— limitação de captura, não defeito confirmado."
              : "— o sistema se recusou a afirmar; não é defeito confirmado."}{" "}
            <span className="text-conteudo-suave">
              Sem afirmação também não é aprovação: cada uma pede olho humano.
            </span>
          </p>

          <div className="mt-2 flex flex-wrap gap-1.5">
            {sintese.porClasse.map(({ classe, quantos }) => (
              <Chip key={classe} tom={classe === "atencao" ? "alerta" : "neutro"}>
                {quantos} {RESUMO_DA_CLASSE[classe]}
              </Chip>
            ))}
            {sintese.semMotivo ? (
              <Chip tom="neutro">
                {sintese.semMotivo} sem motivo informado
              </Chip>
            ) : null}
          </div>
        </div>
      ) : null}

      {sintese.semClasse ? (
        <p className="mt-2 text-sm text-conteudo-suave">
          {sintese.semClasse} campo(s) com veredito que esta tela não reconhece
          — abertos na lista abaixo, sem contagem.
        </p>
      ) : null}
    </Cartao>
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
  nao_conferivel: "Sem afirmação — exige olho humano (não é defeito confirmado)",
  conforme: "Conferem com o plano",
};

function GrupoDeCampos({
  veredito,
  campos,
  recolhido,
  titulo,
  descricao,
}: {
  veredito: Veredito | null;
  campos: CampoExecutado[];
  recolhido: boolean;
  /** Sobrescreve o título padrão do veredito (usado pelo recorte do âmbar). */
  titulo?: string;
  /** Uma frase de contexto abaixo do título — o porquê daquele grupo existir. */
  descricao?: string;
}) {
  const cabecalho =
    titulo ??
    (veredito ? TITULO_DO_GRUPO[veredito] : "Campos sem veredito reconhecido");

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
        <div className="px-1">
          <h2 className="flex items-center gap-2 text-base font-semibold text-conteudo">
            {cabecalho}
            <Chip tom="neutro">{campos.length}</Chip>
          </h2>
          {descricao ? (
            <p className="mt-1 text-sm text-conteudo-suave">{descricao}</p>
          ) : null}
        </div>
        {lista}
      </section>
    );
  }

  return (
    <details className="rounded-2xl border border-borda bg-superficie p-3">
      <summary className="flex min-h-12 cursor-pointer list-none items-center gap-2 py-2 text-base font-semibold text-conteudo">
        {cabecalho}
        <Chip tom="neutro">{campos.length}</Chip>
        <span aria-hidden className="ml-auto text-conteudo-suave">
          ▾
        </span>
      </summary>
      {descricao ? (
        <p className="px-1 text-sm text-conteudo-suave">{descricao}</p>
      ) : null}
      <div className="mt-3">{lista}</div>
    </details>
  );
}

/**
 * O âmbar em DOIS grupos, e a divisão não é estética: campo OBRIGATÓRIO sem
 * afirmação é o que segura a peça — ele fica sempre aberto, nunca atrás de um
 * clique. O opcional pode ficar recolhido com a contagem à mostra: ele não
 * trava nada (a API já contou isso no veredito geral) e é a maior parte do
 * âmbar que estava assustando o time.
 */
function GruposSemAfirmacao({ campos }: { campos: CampoExecutado[] }) {
  const obrigatorios = campos.filter((campo) => campo.obrigatorio);
  const opcionais = campos.filter((campo) => !campo.obrigatorio);

  return (
    <>
      {obrigatorios.length ? (
        <GrupoDeCampos
          veredito="nao_conferivel"
          campos={obrigatorios}
          recolhido={false}
          descricao="O sistema se recusou a afirmar. Quase sempre é enquadramento da foto, não defeito da peça — cada cartão diz que vista refotografar. Nenhum destes é acusação contra a peça; nenhum deles é liberação."
        />
      ) : null}

      {opcionais.length ? (
        <GrupoDeCampos
          veredito="nao_conferivel"
          campos={opcionais}
          recolhido
          titulo="Sem afirmação em campos opcionais"
          descricao="Opcional sem afirmação não trava a peça — a API já considerou isso no veredito acima."
        />
      ) : null}
    </>
  );
}

function CartaoDeCampo({ campo }: { campo: CampoExecutado }) {
  const classe = comoVeredito(campo.veredito);
  const motivo = explicarMotivo(campo.motivo);
  const classeDoMotivo = classificarMotivo(campo.motivo);
  const acao = acaoDoCampo(campo.motivo, campo.fonteFisica);

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
          <div className="flex items-start justify-between gap-2">
            <p className="min-w-0 font-medium text-conteudo">
              {motivo.titulo}
              {campo.campoDaLeitura ? (
                <span className="font-normal text-conteudo-suave">
                  {" "}
                  (o número lido é de{" "}
                  <code className="font-mono">{campo.campoDaLeitura}</code>)
                </span>
              ) : null}
            </p>
            {classeDoMotivo ? (
              <Chip
                tom={classeDoMotivo === "atencao" ? "alerta" : "neutro"}
                titulo="Que tipo de pendência é esta"
              >
                {CHIP_DA_CLASSE[classeDoMotivo]}
              </Chip>
            ) : null}
          </div>

          {/* A AÇÃO em destaque e com a vista dentro dela: é a linha que faz o
              operador levantar e resolver, e ela vinha em cinza no fim do
              bloco, do mesmo tamanho da explicação. */}
          {acao ? (
            <p className="mt-2 flex items-baseline gap-2 rounded-lg bg-superficie px-2.5 py-2 font-semibold text-conteudo">
              <span aria-hidden className="text-conteudo-suave">
                →
              </span>
              <span className="min-w-0">{acao}</span>
            </p>
          ) : null}

          <p className="mt-1.5 text-conteudo-suave">{motivo.acao}</p>
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
 * Achados inconsistentes (informativo — nunca veredito)
 * ------------------------------------------------------------------ */

/**
 * RECOLHIDO POR PADRÃO, e o motivo é medido: os códigos de barra da própria
 * etiqueta produzem 3 a 5 achados por rodada. Em bloco âmbar aberto, isso lê
 * como cinco alarmes numa peça sem defeito nenhum — e alarme que sempre toca
 * deixa de ser lido justamente no dia em que importa.
 *
 * O que NÃO muda: o conteúdo aberto é o mesmo de antes (número, ocorrências e
 * a foto de cada uma), e o título continua dizendo que a visão leu texto que a
 * etiqueta não conhece. Isto é rebaixamento de MOLDURA, não de informação — e
 * nada aqui jamais tocou veredito (é o canal de alarme da T2.8).
 */
function BlocoDeAchados({ achados }: { achados: AchadoInconsistente[] }) {
  const lista = (
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
  );

  return (
    <details className="rounded-2xl border border-borda bg-superficie p-3 shadow-cartao">
      <summary className="flex min-h-12 cursor-pointer list-none items-start gap-2 py-2">
        <span className="min-w-0">
          <span className="block text-base font-semibold text-conteudo">
            {achados.length === 1
              ? "1 texto lido que não bate com a etiqueta"
              : `${achados.length} textos lidos que não batem com a etiqueta`}
          </span>
          <span className="block text-sm text-conteudo-suave">
            Informativo — não altera o veredito.
          </span>
        </span>
        <span aria-hidden className="ml-auto text-conteudo-suave">
          ▾
        </span>
      </summary>

      <p className="mb-3 px-1 text-sm text-conteudo-suave">
        A visão leu estes números em algum lugar das fotos e nenhum deles bate
        com a etiqueta. Boa parte costuma ser código de barras da própria
        etiqueta. Não fica gravado e não entra no veredito — olhe as fotos se
        algum número parecer de outra peça.
      </p>

      {lista}
    </details>
  );
}

/* ------------------------------------------------------------------ *
 * Laudo por IA — redação sobre o veredito, nunca veredito
 * ------------------------------------------------------------------ */

/**
 * Três regras desta seção, e nenhuma é estética:
 *
 * 1. SÓ NO CLIQUE. Cada geração é uma chamada paga; nada de `useEffect`
 *    disparando laudo ao abrir a tela. O preço vai no rótulo do botão porque
 *    quem aperta tem de saber que apertou algo que custa.
 * 2. O DISCLAIMER É PARTE DA TELA, não do texto. A API garante a frase dentro
 *    do laudo; aqui ela é EXTRAÍDA da prosa e exibida em destaque, para não
 *    virar a última linha que ninguém lê num bloco de texto corrido.
 * 3. ERRO É ERRO. Serviço de redação fora do ar mostra o aviso vermelho e a
 *    lembrança de que o veredito acima continua valendo — nunca um texto vazio
 *    ou um "não foi possível analisar", que ao lado de uma peça divergente
 *    seriam lidos como "nada a relatar".
 */

/** Normaliza para comparar frase sem depender de acento, caixa ou pontuação. */
function achatar(valor: string): string {
  return valor
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

const DISCLAIMER_ACHATADO = achatar(DISCLAIMER_LAUDO);

/**
 * Separa o corpo do laudo do parágrafo de disclaimer.
 *
 * O disclaimer sai da prosa e vira bloco próprio. Se o modelo o parafraseou (a
 * API só garante que a frase ESTÁ lá, não que está idêntica), o parágrafo pode
 * escapar do filtro — por isso o bloco de destaque é renderizado SEMPRE, com o
 * texto canônico: no pior caso a advertência aparece duas vezes, nunca zero.
 */
function separarLaudo(texto: string): string[] {
  return texto
    .split(/\n\s*\n/)
    .map((paragrafo) => paragrafo.trim())
    .filter((paragrafo) => paragrafo.length > 0)
    .filter((paragrafo) => !achatar(paragrafo).includes(DISCLAIMER_ACHATADO));
}

function BlocoDoLaudo({ conferenciaId }: { conferenciaId: string }) {
  const [laudo, setLaudo] = useState<LaudoDaConferencia | null>(null);
  const [gerando, setGerando] = useState(false);
  const [erro, setErro] = useState<unknown>(null);

  async function aoGerar() {
    setGerando(true);
    setErro(null);
    try {
      setLaudo(await gerarLaudo(conferenciaId));
    } catch (falha) {
      setErro(falha);
      setLaudo(null);
    } finally {
      setGerando(false);
    }
  }

  if (gerando) {
    return (
      <CarregandoAcao mensagem="Redigindo o laudo desta conferência… isso leva alguns segundos." />
    );
  }

  if (!laudo) {
    return (
      <div className="space-y-2">
        <Botao variante="secundario" tamanho="grande" onClick={aoGerar}>
          Gerar laudo desta conferência (IA — ~US$ 0,01)
        </Botao>
        <p className="px-1 text-xs text-conteudo-suave">
          Um texto curto sobre o veredito acima, para anexar ou passar adiante.
          A IA apenas redige: ela não confere nada e não muda veredito nenhum.
        </p>
        {erro ? <AvisoDeErro erro={erro} /> : null}
      </div>
    );
  }

  const paragrafos = separarLaudo(laudo.laudo);

  return (
    <Cartao faixa="acento">
      <CabecalhoCartao
        titulo="Laudo da conferência"
        descricao="Redigido por IA a partir do veredito que a API já gravou."
        acao={<Chip tom={laudo.modelo === "mock" ? "alerta" : "neutro"}>IA</Chip>}
      />

      <div className="space-y-3 text-sm leading-relaxed text-conteudo">
        {paragrafos.map((paragrafo, indice) => (
          <p key={indice}>{paragrafo}</p>
        ))}
      </div>

      <Aviso tom="alerta" className="mt-4">
        {DISCLAIMER_LAUDO}
      </Aviso>

      {laudo.modelo === "mock" ? (
        <p className="mt-2 text-xs text-nao-conferivel">
          Servidor em modo simulado: este texto NÃO foi redigido por IA — é um
          exemplo fixo montado a partir dos mesmos dados.
        </p>
      ) : null}

      <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-borda pt-3">
        <p className="font-mono text-xs break-all text-conteudo-suave">
          {laudo.modelo} · {formatarDataHora(laudo.geradoEm)}
        </p>
        <Botao variante="fantasma" onClick={aoGerar}>
          Gerar de novo
        </Botao>
      </div>
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
