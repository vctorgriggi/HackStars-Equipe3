"use client";

/**
 * Um campo como o BANCO guardou (`GET /conferencias/:id/campos`).
 *
 * O que a tela faz: mostra lado a lado o que a etiqueta mandava e o que a visão
 * leu, com o selo que a engine gravou. O que a tela NÃO faz: comparar os dois
 * textos para decidir a cor. A cor vem de `veredito`, sempre — se um dia os
 * dois valores parecerem iguais e o selo disser `divergente` (espaço invisível,
 * Unicode diferente), quem está certo é o selo, e a tela precisa mostrar isso
 * em vez de esconder.
 *
 * Diferenças da releitura em relação à resposta do POST, todas assumidas aqui:
 * `motivo` não é persistido (gap 22), `fonteFisica`/`obrigatorio` são
 * re-resolvidos da checklist e podem vir `null`, e `valorEsperado` é string
 * VAZIA (não `null`) quando não havia esperado.
 */

import { SeloVeredito, Chip } from "@/components/ui";
import { juntarClasses } from "@/lib/classes";
import {
  comoVeredito,
  interpretarRegiaoLeitura,
  type CampoVeredito,
} from "@/lib/tipos";

import { formatarConfianca, humanizarCampo, rotuloDaVista } from "./formato";

const COR_DO_LIDO: Record<string, string> = {
  conforme: "text-conforme",
  divergente: "text-divergente",
  nao_conferivel: "text-nao-conferivel",
};

function Valor({
  rotulo,
  titulo,
  valor,
  vazio,
  className,
}: {
  rotulo: string;
  /** Explicação completa do rótulo — o texto visível é curto de propósito:
   *  rótulo que quebra em duas linhas desalinha os dois valores lado a lado,
   *  e é justamente a comparação dígito a dígito que a tela existe para servir. */
  titulo: string;
  valor: string | null;
  vazio: string;
  className?: string;
}) {
  const temValor = Boolean(valor && valor.length > 0);

  return (
    <div className="min-w-0">
      <p
        title={titulo}
        className="text-xs font-medium tracking-wide text-conteudo-suave uppercase"
      >
        {rotulo}
      </p>
      <p
        className={juntarClasses(
          "truncate",
          temValor
            ? juntarClasses("numeros text-lg font-bold", className)
            : "text-sm text-conteudo-suave italic",
        )}
        title={valor ?? undefined}
      >
        {temValor ? valor : vazio}
      </p>
    </div>
  );
}

/** Miniatura da evidência com o recorte de onde o valor foi lido. */
function Evidencia({ campo }: { campo: CampoVeredito }) {
  const foto = campo.fotoEvidencia;
  if (!foto) return null;

  const caixa = interpretarRegiaoLeitura(campo.regiaoLeitura);

  return (
    <div className="mt-3">
      <a
        href={foto.url}
        target="_blank"
        rel="noreferrer"
        className="relative block min-h-24 w-40 max-w-full overflow-hidden rounded-lg border border-borda bg-superficie-2"
      >
        {/*
          `<img>` e não `next/image`: a URL é assinada pelo S3 e muda a cada
          leitura, então não há host fixo para configurar em `remotePatterns`
          (e `next.config.ts` é da fundação, que este agente não edita).
        */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={foto.url}
          alt={`Evidência do campo ${campo.campo}`}
          loading="lazy"
          className="block h-auto w-full"
        />
        {caixa ? (
          <span
            aria-hidden
            className="pointer-events-none absolute border-2 border-acento shadow-[0_0_0_9999px_rgba(0,0,0,0.25)]"
            style={{
              left: `${caixa.Left * 100}%`,
              top: `${caixa.Top * 100}%`,
              width: `${caixa.Width * 100}%`,
              height: `${caixa.Height * 100}%`,
            }}
          />
        ) : null}
      </a>
      <p className="mt-1 text-xs text-conteudo-suave">
        {rotuloDaVista(foto.fonteFisica) ?? foto.fonteFisica} · toque para abrir
        {caixa ? " · o retângulo marca onde o valor foi lido" : ""}
      </p>
    </div>
  );
}

export function CampoConferidoLinha({ campo }: { campo: CampoVeredito }) {
  const classe = comoVeredito(campo.veredito);
  const confianca = formatarConfianca(campo.confianca);
  const vista = rotuloDaVista(campo.fonteFisica);

  return (
    <li>
      <div
        className={juntarClasses(
          "rounded-xl border border-borda bg-superficie p-3",
          classe === "divergente" && "border-l-4 border-l-divergente",
          classe === "nao_conferivel" && "border-l-4 border-l-nao-conferivel",
          classe === "conforme" && "border-l-4 border-l-conforme",
        )}
      >
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="text-base font-semibold text-conteudo">
              {humanizarCampo(campo.campo)}
            </p>
            <p className="truncate text-xs text-conteudo-suave">
              <code>{campo.campo}</code>
            </p>
          </div>
          <SeloVeredito veredito={campo.veredito} tamanho="pequeno" />
        </div>

        <div className="mt-3 grid grid-cols-2 gap-3">
          <Valor
            rotulo="Esperado"
            titulo="Valor que o QR da etiqueta manda"
            valor={campo.valorEsperado}
            vazio="o QR não traz este dado"
          />
          <Valor
            rotulo="Lido na peça"
            titulo="Valor que a visão leu na foto"
            valor={campo.valorLido}
            vazio="sem leitura"
            className={classe ? COR_DO_LIDO[classe] : undefined}
          />
        </div>

        <div className="mt-3 flex flex-wrap gap-2">
          {vista ? <Chip titulo="Vista da peça de onde o campo sai">{vista}</Chip> : null}
          {campo.obrigatorio === true ? (
            <Chip titulo="Campo obrigatório: ilegível bloqueia o conforme geral">
              Obrigatório
            </Chip>
          ) : null}
          {campo.obrigatorio === false ? (
            <Chip titulo="Campo opcional: ilegível não bloqueia o conforme geral">
              Opcional
            </Chip>
          ) : null}
          {confianca ? (
            <Chip titulo="Confiança da leitura que lastreou este veredito">
              Confiança <span className="numeros">{confianca}</span>
            </Chip>
          ) : null}
          {campo.fonteFisica === null ? (
            <Chip
              tom="alerta"
              titulo="A vista é re-resolvida da checklist do projeto: null quando a peça não tem projeto ou o campo saiu da checklist"
            >
              Vista não resolvida
            </Chip>
          ) : null}
        </div>

        <Evidencia campo={campo} />
      </div>
    </li>
  );
}
