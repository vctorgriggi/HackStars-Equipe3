"use client";

// Um campo do veredito como o BANCO gravou, com a foto-evidência ao lado
// (adaptação do padrão do app irmão `web/` para os tokens TRAEL Vision).
//
// O que esta linha NÃO faz: comparar `valorEsperado` × `valorLido` para
// decidir cor — a cor sai SEMPRE de `veredito` (regra de ouro). Se os dois
// textos parecerem iguais e o selo disser `divergente` (espaço invisível,
// Unicode diferente), quem está certo é o selo.

import { NeutralChip } from "@/components/ui/chip";
import { VereditoChip } from "@/components/vision/veredito-chip";
import {
  interpretarRegiaoLeitura,
  type CampoVereditoApi,
} from "@/lib/domain/transformador-api";

const COR_DO_LIDO: Record<string, string> = {
  conforme: "text-conforme",
  divergente: "text-divergente",
  nao_conferivel: "text-nao-conferivel",
};

const BORDA_DO_VEREDITO: Record<string, string> = {
  conforme: "border-l-conforme",
  divergente: "border-l-divergente",
  nao_conferivel: "border-l-nao-conferivel",
};

/** Miniatura da evidência com o recorte de onde o valor foi lido. */
function Evidencia({ campo }: { campo: CampoVereditoApi }) {
  const foto = campo.fotoEvidencia;
  if (!foto) {
    return (
      <p className="mt-2 text-xs text-text-3">
        Sem foto-evidência (leitura digitada ou campo sem leitura).
      </p>
    );
  }

  const caixa = interpretarRegiaoLeitura(campo.regiaoLeitura);

  return (
    <div className="mt-3">
      <a
        href={foto.url}
        target="_blank"
        rel="noreferrer"
        className="relative block min-h-20 w-44 max-w-full overflow-hidden rounded-md border border-line bg-surface-2"
      >
        {/* `<img>` e não `next/image`: URL assinada pelo S3, sem host fixo
            para `remotePatterns` (next.config.ts vazio de propósito). */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={foto.url}
          alt={`Evidência do campo ${campo.campo}`}
          loading="lazy"
          className="block h-auto w-full"
        />
        {caixa && (
          <span
            aria-hidden
            className="pointer-events-none absolute border-2 border-divergente"
            style={{
              left: `${caixa.left}%`,
              top: `${caixa.top}%`,
              width: `${caixa.width}%`,
              height: `${caixa.height}%`,
            }}
          />
        )}
      </a>
      <p className="mt-1 text-xs text-text-3">
        Vista: {foto.fonteFisica} · toque para abrir
        {caixa ? " · o retângulo marca onde o valor foi lido" : ""}
      </p>
    </div>
  );
}

export function CampoConferidoLinha({ campo }: { campo: CampoVereditoApi }) {
  const veredito = campo.veredito;

  return (
    <li
      className={`rounded-md border border-line bg-surface-2 p-3 ${
        veredito ? `border-l-4 ${BORDA_DO_VEREDITO[veredito] ?? ""}` : ""
      }`}
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <code className="t-mono text-sm font-semibold text-text-1">
          {campo.campo}
        </code>
        <VereditoChip veredito={veredito} />
      </div>

      <div className="mt-2 grid grid-cols-2 gap-3">
        <div className="min-w-0">
          <p className="t-caps text-2xs text-text-3">Esperado (QR)</p>
          <p
            className={`truncate ${campo.valorEsperado ? "t-mono text-base font-bold text-text-1" : "text-sm italic text-text-3"}`}
            title={campo.valorEsperado || undefined}
          >
            {campo.valorEsperado || "o QR não traz este dado"}
          </p>
        </div>
        <div className="min-w-0">
          <p className="t-caps text-2xs text-text-3">Lido na peça</p>
          <p
            className={`truncate ${
              campo.valorLido
                ? `t-mono text-base font-bold ${veredito ? COR_DO_LIDO[veredito] : "text-text-1"}`
                : "text-sm italic text-text-3"
            }`}
            title={campo.valorLido ?? undefined}
          >
            {campo.valorLido ?? "sem leitura"}
          </p>
        </div>
      </div>

      <div className="mt-2 flex flex-wrap gap-1.5">
        {campo.fonteFisica && <NeutralChip>{campo.fonteFisica}</NeutralChip>}
        {campo.obrigatorio === true && <NeutralChip>Obrigatório</NeutralChip>}
        {campo.obrigatorio === false && <NeutralChip>Opcional</NeutralChip>}
        {typeof campo.confianca === "number" && (
          <NeutralChip>
            Confiança {(campo.confianca * 100).toFixed(1)}%
          </NeutralChip>
        )}
      </div>

      <Evidencia campo={campo} />
    </li>
  );
}
