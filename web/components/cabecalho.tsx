"use client";

/**
 * Cabeçalho compacto e fixo: identidade do app, ALERTA DA LINHA, ETAPA
 * provisionada do aparelho e estado da sessão.
 *
 * A etapa fica sempre visível porque ela muda o significado de tudo que a tela
 * mostra: um `conforme` no gate da adesivação não é o mesmo `conforme` do gate
 * da placa (gap 14 do CLAUDE.md). Operador que não sabe em que etapa o aparelho
 * está tira as fotos erradas.
 *
 * O alerta fica aqui porque o critério 6 do SPEC pede divergência visível FORA
 * da tela de veredito: no fluxo TRAEL a divergência PARA a produção, e quem
 * está tirando foto de outra peça precisa saber que existe peça travada. O
 * cabeçalho é a única superfície que aparece em todas as telas.
 *
 * Regra de ouro: o badge não calcula veredito nenhum — ele mostra a contagem
 * que `useAlertaDaLinha` lê da resposta da API (ver o cabeçalho daquele
 * arquivo). Sem alerta, NADA é desenhado: nunca um selo verde de "linha limpa",
 * porque ausência de divergência conhecida não é atestado de conformidade.
 */

import Link from "next/link";

import { useAlertaDaLinha } from "@/components/alerta-da-linha";
import { useAutenticacao } from "@/components/providers";
import { useEtapa } from "@/lib/etapa";
import { Botao, Chip } from "@/components/ui";

function AlertaDaLinha() {
  const { quantidade, primeiroNumeroSerie, parcial } = useAlertaDaLinha();

  // Zero peças, erro na consulta ou dado ainda não carregado: nada na tela.
  if (quantidade === 0) return null;

  const uma = quantidade === 1;

  // Uma peça só → vai direto para o histórico dela (o operador quer VER a
  // peça). Mais de uma → o painel, que é onde elas cabem lado a lado.
  const destino =
    uma && primeiroNumeroSerie
      ? `/peca?numeroSerie=${encodeURIComponent(primeiroNumeroSerie)}`
      : "/indicadores";

  const frase = uma
    ? `1 peça com divergência aberta${primeiroNumeroSerie ? ` (série ${primeiroNumeroSerie})` : ""}`
    : `${quantidade} peças com divergência aberta`;

  const rotulo = `Alerta: ${frase}. ${
    uma && primeiroNumeroSerie
      ? "Abrir o histórico desta peça."
      : "Abrir o painel de indicadores."
  }`;

  return (
    // `role="alert"` no INVÓLUCRO, não no link: papel de alerta aplicado ao
    // próprio `<a>` apagaria o papel de link para quem usa leitor de tela.
    // Como o bloco só existe com `quantidade > 0`, a montagem dele É a
    // transição de 0 para >0 — que é exatamente quando o anúncio deve sair.
    <div role="alert" className="min-w-0">
      <Link
        href={destino}
        aria-label={rotulo}
        title={
          parcial
            ? `${frase}. Contagem sobre as peças de movimento mais recente que o painel lista — pode haver outras fora do corte.`
            : frase
        }
        className="inline-flex min-h-10 max-w-full shrink-0 items-center gap-1.5 rounded-full border-2 border-divergente bg-divergente-fundo px-2.5 text-xs font-bold text-divergente"
      >
        <span aria-hidden className="size-2 shrink-0 rounded-full bg-current" />
        <span aria-hidden className="numeros">
          {quantidade}
        </span>
        {/* O texto encolhe no celular; o `aria-label` acima carrega a frase
            inteira nos dois casos, então nada se perde no aperto. */}
        <span aria-hidden className="truncate sm:hidden">
          {uma ? "divergente" : "divergentes"}
        </span>
        <span aria-hidden className="hidden truncate sm:inline">
          {uma ? "peça com divergência" : "peças com divergência"}
        </span>
      </Link>
    </div>
  );
}

export function Cabecalho() {
  const { autenticado, email, sair } = useAutenticacao();
  const { codigo, nome, desconhecida, fixadaPelaUrl } = useEtapa();

  return (
    <header className="sticky top-0 z-20 border-b border-borda bg-superficie/95 backdrop-blur">
      <div className="mx-auto flex w-full max-w-3xl items-center gap-3 px-4 py-2">
        <Link href="/" className="flex min-w-0 flex-col leading-tight">
          <span className="text-sm font-bold tracking-wide text-acento">
            TRAEL
          </span>
          <span className="truncate text-xs text-conteudo-suave">
            Conferência
          </span>
        </Link>

        <div className="ml-auto flex min-w-0 items-center gap-2">
          {/* Primeiro item do grupo: peça parada vence etapa e sessão. */}
          <AlertaDaLinha />

          {codigo ? (
            <Chip
              tom={desconhecida ? "alerta" : "acento"}
              titulo={
                desconhecida
                  ? `A etapa "${codigo}" não existe na linha`
                  : `Etapa deste aparelho: ${codigo}${fixadaPelaUrl ? " (definida pela URL)" : ""}`
              }
            >
              {desconhecida ? "Etapa inválida: " : ""}
              {nome}
            </Chip>
          ) : (
            <Chip titulo="Nenhuma etapa provisionada neste aparelho">
              Sem etapa
            </Chip>
          )}

          {autenticado ? (
            <Botao
              variante="fantasma"
              onClick={sair}
              title={email}
              className="min-h-10 px-2 text-xs"
            >
              Sair
            </Botao>
          ) : null}
        </div>
      </div>
    </header>
  );
}
