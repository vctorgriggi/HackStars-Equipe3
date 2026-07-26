"use client";

/**
 * PASSO 3 — as fotos, GUIADAS PELA API.
 *
 * A lista de vistas a fotografar vem de `GET /conferencias/plano-de-fotos`, que
 * nasce das mesmas funções que a execução usa para recortar a checklist por
 * etapa. O cliente NÃO refaz esse recorte: se a tela pedisse uma lista e o gate
 * cobrasse outra, o operador fotografaria o que não é cobrado e faltaria o que
 * é — o falso `nao_conferivel` (e, pior, a marcação obrigatória esquecida).
 *
 * Cada cartão é UMA VISTA da peça, não uma marcação: é assim que a câmera fixa
 * vai enxergar em produção, e uma vista pode conter mais de um alvo (o topo tem
 * série chumbada e patrimônio serigrafado). Por isso o cartão lista os campos
 * que aquela foto resolve — o operador precisa ver as duas marcações no quadro.
 *
 * O upload acontece na hora, foto a foto. Nenhuma chamada de visão aqui: subir
 * a foto é barato, a visão é paga e roda uma vez só, no passo 4.
 */

import type { ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";

import { obterPlanoDeFotos } from "@/lib/api";
import { juntarClasses } from "@/lib/classes";
import {
  FONTES_FISICAS,
  MAX_FOTOS_POR_CONFERENCIA,
  type FonteFisica,
  type ItemDoPlano,
  type PlanoDaEtapa,
  type PlanoDeFotos,
} from "@/lib/tipos";
import {
  Aviso,
  AvisoDeErro,
  BarraDeProgresso,
  Botao,
  CabecalhoCartao,
  Carregando,
  Cartao,
  Chip,
} from "@/components/ui";

import { enviarFotoDaSessao, reenviarFotoDaSessao } from "./envio";
import {
  dicasDeCaptura,
  ehFonteFisica,
  ROTULO_MARCACAO,
  rotuloCampo,
  rotuloVista,
} from "./rotulos";
import {
  irParaPasso,
  removerFoto,
  temUploadEmCurso,
  type FotoDaSessao,
  type SessaoConferencia,
} from "./sessao";

export interface PassoFotosProps {
  sessao: SessaoConferencia;
  /** Nome exibível da etapa confirmada (vem do aparelho). */
  nomeDaEtapa: string | null;
}

/**
 * Escolhe o recorte que a API já calculou para esta etapa. Não é regra de
 * negócio recriada: é indexar a resposta pelo código do gate.
 */
function recorteDaEtapa(
  plano: PlanoDeFotos,
  etapaCodigo: string | null,
): PlanoDaEtapa | null {
  if (!etapaCodigo) return plano.pecaInteira;
  return (
    plano.etapas.find((item) => item.etapa?.codigo === etapaCodigo) ?? null
  );
}

export function PassoFotos({ sessao, nomeDaEtapa }: PassoFotosProps) {
  const consulta = useQuery({
    queryKey: ["plano-de-fotos"],
    queryFn: ({ signal }) => obterPlanoDeFotos({}, signal),
    staleTime: 5 * 60 * 1000,
  });

  const plano = consulta.data;
  const recorte = plano ? recorteDaEtapa(plano, sessao.etapaCodigo) : null;
  const vistas = recorte?.vistas ?? [];

  const fotosDaVista = (fonteFisica: string): FotoDaSessao[] =>
    sessao.fotos.filter((foto) => foto.fonteFisica === fonteFisica);

  const vistaCoberta = (fonteFisica: string): boolean =>
    fotosDaVista(fonteFisica).some((foto) => foto.estado === "enviada");

  const cobertas = vistas.filter((vista) => vistaCoberta(vista.fonteFisica)).length;
  const faltando = vistas.length - cobertas;

  const enviando = temUploadEmCurso(sessao);
  const prontas = sessao.fotos.filter((foto) => foto.estado === "enviada").length;

  // O teto conta o que a API vai receber: evidência já criada (`enviada`) mais
  // a que está a caminho (`enviando`). Foto em `erro` NÃO gerou FotoEvidencia
  // nenhuma — contá-la travava o envio com 10 falhas e zero evidência na mão.
  const ocupando =
    prontas + sessao.fotos.filter((foto) => foto.estado === "enviando").length;
  const restantes = MAX_FOTOS_POR_CONFERENCIA - ocupando;

  const outrasVistas = FONTES_FISICAS.filter(
    (fonte) => !vistas.some((vista) => vista.fonteFisica === fonte),
  );

  /**
   * Três estados, não dois. Sem recorte (etapa fora do plano) ou com recorte
   * vazio, NÃO existe completude a afirmar: dizer "as 0 vistas desta etapa
   * estão fotografadas" ao lado do aviso de que a API vai recusar é a tela
   * dando OK onde não há nada conferível.
   */
  const descricaoDoGate = sessao.etapaCodigo
    ? `Gate: ${nomeDaEtapa ?? sessao.etapaCodigo}. Inclui o que as etapas anteriores já gravaram.`
    : "Sem gate: a checklist inteira do projeto.";

  const cabecalho = !recorte
    ? {
        titulo: "Esta etapa não está no plano deste projeto",
        descricao:
          "Não há vistas a fotografar por aqui, e não há nada a dar por completo — veja o aviso abaixo.",
      }
    : vistas.length === 0
      ? {
          titulo: "Esta etapa não pede foto neste modelo",
          descricao: `${descricaoDoGate} Nenhuma vista da checklist tem campo neste recorte.`,
        }
      : {
          titulo:
            faltando > 0
              ? `Faltam ${faltando} de ${vistas.length} vistas`
              : `As ${vistas.length} vistas desta etapa estão fotografadas`,
          descricao: descricaoDoGate,
        };

  const receber = (arquivos: FileList | null, fonteFisica: FonteFisica) => {
    const lista = Array.from(arquivos ?? []).slice(0, Math.max(0, restantes));
    lista.forEach((arquivo) => void enviarFotoDaSessao(arquivo, fonteFisica));
  };

  return (
    <div className="space-y-4">
      {consulta.isLoading ? (
        <Cartao>
          <Carregando linhas={3} rotulo="Carregando o plano de fotos…" />
        </Cartao>
      ) : null}

      {consulta.error ? (
        <>
          <AvisoDeErro erro={consulta.error} />
          <Aviso tom="alerta">
            Sem o plano de fotos eu não sei quais vistas esta etapa cobra. Você
            ainda pode enviar fotos pelas vistas abaixo, mas confira a etapa
            antes de disparar.
          </Aviso>
        </>
      ) : null}

      {plano ? (
        <Cartao>
          <CabecalhoCartao
            titulo={cabecalho.titulo}
            descricao={cabecalho.descricao}
            acao={
              <Chip tom="neutro" titulo={plano.projeto.descricao ?? undefined}>
                {plano.projeto.codigo}
              </Chip>
            }
          />

          {/* Barra de 0 de 0 vistas seria completude inventada: sem vistas,
              não há progresso a mostrar. */}
          {vistas.length ? (
            <BarraDeProgresso
              fracao={cobertas / vistas.length}
              rotulo="Vistas cobertas"
            />
          ) : null}

          <p className="mt-3 text-xs text-conteudo-suave">
            {prontas} de {MAX_FOTOS_POR_CONFERENCIA} fotos enviadas nesta
            conferência. Uma foto resolve todos os campos da vista, desde que as
            marcações estejam legíveis no quadro.
          </p>
        </Cartao>
      ) : null}

      {plano && !recorte ? (
        <Aviso tom="erro">
          A etapa <code>{sessao.etapaCodigo}</code> não existe no plano deste
          projeto — a API vai recusar a conferência. Volte ao passo da etapa e
          escolha uma da linha.
        </Aviso>
      ) : null}

      {restantes <= 0 ? (
        <Aviso tom="alerta">
          Limite de {MAX_FOTOS_POR_CONFERENCIA} fotos por conferência atingido.
          Remova alguma foto para trocar por outra.
        </Aviso>
      ) : null}

      {vistas.map((vista) => (
        <CartaoDeVista
          key={vista.fonteFisica}
          fonteFisica={vista.fonteFisica}
          campos={vista.campos}
          fotos={fotosDaVista(vista.fonteFisica)}
          podeEnviar={restantes > 0}
          aoReceber={receber}
        />
      ))}

      {/* Enquanto o plano carrega, TODAS as vistas cairiam aqui — e a tela
          pediria fotos que a etapa talvez nem cobre. */}
      {!consulta.isLoading && outrasVistas.length ? (
        <details className="rounded-2xl border border-borda bg-superficie p-3">
          <summary className="min-h-12 cursor-pointer list-none py-2 text-sm font-medium text-conteudo-suave">
            Enviar foto de outra vista mesmo assim ▾
          </summary>

          <p className="mt-1 mb-3 text-xs text-conteudo-suave">
            Esta etapa não cobra nenhum campo destas vistas. A API descarta
            fotos fora do recorte sem mandá-las à visão (aparecem como
            <em> fotos fora do recorte</em> no resumo) — não custa crédito, mas
            também não vira veredito.
          </p>

          <div className="space-y-2">
            {outrasVistas.map((fonte) => (
              <LinhaDeOutraVista
                key={fonte}
                fonteFisica={fonte}
                fotos={fotosDaVista(fonte)}
                podeEnviar={restantes > 0}
                aoReceber={receber}
              />
            ))}
          </div>
        </details>
      ) : null}

      <div className="space-y-2">
        {faltando > 0 && prontas > 0 ? (
          <Aviso tom="alerta">
            Ainda faltam {faltando} vistas. Dá para conferir assim mesmo, mas o
            que não foi fotografado sai <strong>não conferível</strong> — e
            campo obrigatório não conferível impede o <strong>conforme</strong>.
          </Aviso>
        ) : null}

        <Botao
          tamanho="grande"
          disabled={prontas === 0 || enviando}
          onClick={() => irParaPasso("conferir")}
        >
          {enviando
            ? "Aguardando o envio das fotos…"
            : `Continuar com ${prontas} ${prontas === 1 ? "foto" : "fotos"}`}
        </Botao>

        <Botao
          variante="secundario"
          className="w-full"
          onClick={() => irParaPasso("etiqueta")}
        >
          Voltar para a etiqueta
        </Botao>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ *
 * Cartão de uma vista do gate
 * ------------------------------------------------------------------ */

const BOTAO_ARQUIVO =
  "inline-flex min-h-12 flex-1 cursor-pointer items-center justify-center gap-2 " +
  "rounded-xl px-4 text-base font-semibold transition-colors active:translate-y-px";

function EntradaDeFoto({
  fonteFisica,
  aoReceber,
  desabilitado,
  daCamera,
  rotuloAcessivel,
  children,
  className,
}: {
  fonteFisica: FonteFisica;
  aoReceber: (arquivos: FileList | null, fonteFisica: FonteFisica) => void;
  desabilitado: boolean;
  /** `capture` abre a câmera direto no celular; sem ele, a galeria. */
  daCamera: boolean;
  /**
   * Nome do controle para leitor de tela. O texto visível ("Tirar foto",
   * "Galeria") se repete em cada vista da lista: sem a vista no nome, o leitor
   * anuncia N botões idênticos e não dá para saber qual foto se está tirando.
   */
  rotuloAcessivel: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <label
      className={juntarClasses(
        BOTAO_ARQUIVO,
        desabilitado && "pointer-events-none opacity-50",
        className,
      )}
    >
      {children}
      <input
        type="file"
        accept="image/*"
        aria-label={rotuloAcessivel}
        multiple={!daCamera}
        {...(daCamera ? { capture: "environment" as const } : {})}
        disabled={desabilitado}
        className="sr-only"
        onChange={(evento) => {
          aoReceber(evento.target.files, fonteFisica);
          evento.target.value = "";
        }}
      />
    </label>
  );
}

function CartaoDeVista({
  fonteFisica,
  campos,
  fotos,
  podeEnviar,
  aoReceber,
}: {
  fonteFisica: string;
  campos: ItemDoPlano[];
  fotos: FotoDaSessao[];
  podeEnviar: boolean;
  aoReceber: (arquivos: FileList | null, fonteFisica: FonteFisica) => void;
}) {
  const coberta = fotos.some((foto) => foto.estado === "enviada");
  const dicas = Array.from(
    new Set(
      campos.flatMap((campo) =>
        dicasDeCaptura(campo.tipoMarcacao, fonteFisica),
      ),
    ),
  );

  // A vista veio da API; se um dia o vocabulário divergir, é melhor mostrar o
  // cartão sem upload do que travar a tela inteira.
  const fonteValida = ehFonteFisica(fonteFisica);

  return (
    <Cartao faixa={coberta ? "conforme" : "acento"}>
      <CabecalhoCartao
        titulo={rotuloVista(fonteFisica)}
        descricao={`${campos.length} ${campos.length === 1 ? "campo sai" : "campos saem"} desta foto`}
        acao={
          coberta ? (
            <Chip tom="acento">Foto enviada</Chip>
          ) : (
            <Chip tom="alerta">Falta</Chip>
          )
        }
      />

      <ul className="mb-3 space-y-2">
        {campos.map((campo) => (
          <li
            key={campo.campo}
            className="rounded-xl border border-borda bg-superficie-2 p-2.5"
          >
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-medium text-conteudo">
                {rotuloCampo(campo.campo)}
              </span>
              <Chip tom={campo.tipoMarcacao === "relevo" ? "alerta" : "neutro"}>
                {ROTULO_MARCACAO[campo.tipoMarcacao]}
              </Chip>
              <Chip tom="neutro">
                {campo.obrigatorio ? "Obrigatório" : "Opcional"}
              </Chip>
            </div>
            <p className="mt-1 font-mono text-xs text-conteudo-suave">
              {campo.campo}
            </p>
          </li>
        ))}
      </ul>

      {dicas.length ? (
        <ul className="mb-3 space-y-1">
          {dicas.map((dica) => (
            <li key={dica} className="flex gap-2 text-xs text-conteudo-suave">
              <span aria-hidden>•</span>
              <span>{dica}</span>
            </li>
          ))}
        </ul>
      ) : null}

      {fotos.length ? (
        <ul className="mb-3 space-y-2">
          {fotos.map((foto) => (
            <LinhaDeFoto key={foto.chave} foto={foto} />
          ))}
        </ul>
      ) : null}

      {fonteValida ? (
        <div className="flex gap-2">
          <EntradaDeFoto
            fonteFisica={fonteFisica}
            aoReceber={aoReceber}
            desabilitado={!podeEnviar}
            daCamera
            rotuloAcessivel={`${coberta ? "Tirar nova foto" : "Tirar foto"} da vista ${rotuloVista(fonteFisica)}`}
            className="bg-acento text-acento-contraste hover:bg-acento-forte"
          >
            {coberta ? "Nova foto" : "Tirar foto"}
          </EntradaDeFoto>

          <EntradaDeFoto
            fonteFisica={fonteFisica}
            aoReceber={aoReceber}
            desabilitado={!podeEnviar}
            daCamera={false}
            rotuloAcessivel={`Escolher da galeria uma foto da vista ${rotuloVista(fonteFisica)}`}
            className="border border-borda-forte bg-superficie text-conteudo hover:bg-superficie-2"
          >
            Galeria
          </EntradaDeFoto>
        </div>
      ) : (
        <Aviso tom="alerta">
          A checklist pede a vista <code>{fonteFisica}</code>, que este app não
          conhece. Avise o suporte: a grafia da vista precisa bater com a da
          API.
        </Aviso>
      )}
    </Cartao>
  );
}

function LinhaDeOutraVista({
  fonteFisica,
  fotos,
  podeEnviar,
  aoReceber,
}: {
  fonteFisica: FonteFisica;
  fotos: FotoDaSessao[];
  podeEnviar: boolean;
  aoReceber: (arquivos: FileList | null, fonteFisica: FonteFisica) => void;
}) {
  return (
    <div className="rounded-xl border border-borda p-2">
      <div className="flex items-center justify-between gap-2">
        <span className="text-sm text-conteudo">{rotuloVista(fonteFisica)}</span>
        <EntradaDeFoto
          fonteFisica={fonteFisica}
          aoReceber={aoReceber}
          desabilitado={!podeEnviar}
          daCamera
          rotuloAcessivel={`Enviar foto da vista ${rotuloVista(fonteFisica)} (fora do recorte desta etapa)`}
          className="max-w-40 border border-borda-forte bg-superficie text-sm text-conteudo-suave hover:bg-superficie-2"
        >
          Enviar
        </EntradaDeFoto>
      </div>

      {fotos.length ? (
        <ul className="mt-2 space-y-2">
          {fotos.map((foto) => (
            <LinhaDeFoto key={foto.chave} foto={foto} />
          ))}
        </ul>
      ) : null}
    </div>
  );
}

/* ------------------------------------------------------------------ *
 * Uma foto na fila
 * ------------------------------------------------------------------ */

function LinhaDeFoto({ foto }: { foto: FotoDaSessao }) {
  return (
    <li className="flex items-center gap-3 rounded-xl border border-borda bg-superficie p-2">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={foto.previaUrl}
        alt=""
        className="size-14 shrink-0 rounded-lg object-cover"
      />

      <div className="min-w-0 flex-1">
        {foto.estado === "enviando" ? (
          <BarraDeProgresso fracao={foto.progresso} rotulo="Enviando" />
        ) : foto.estado === "enviada" ? (
          <p className="text-sm text-conforme">Enviada ✓</p>
        ) : (
          <div className="space-y-1">
            <p className="text-sm text-divergente">
              {foto.erro?.mensagem ?? "Falha ao enviar esta foto."}
            </p>
            {foto.erro ? (
              <p className="font-mono text-[10px] break-words text-conteudo-suave">
                {foto.erro.detalhe}
              </p>
            ) : null}
          </div>
        )}
        <p className="mt-0.5 truncate text-xs text-conteudo-suave">
          {foto.arquivo.name}
        </p>
      </div>

      <div className="flex shrink-0 flex-col gap-1">
        {foto.estado === "erro" ? (
          <Botao
            variante="secundario"
            className="min-h-10 px-3 text-sm"
            onClick={() => void reenviarFotoDaSessao(foto.chave)}
          >
            Tentar de novo
          </Botao>
        ) : null}
        {foto.estado !== "enviando" ? (
          <Botao
            variante="fantasma"
            className="min-h-10 px-3 text-sm"
            onClick={() => removerFoto(foto.chave)}
          >
            Remover
          </Botao>
        ) : null}
      </div>
    </li>
  );
}
