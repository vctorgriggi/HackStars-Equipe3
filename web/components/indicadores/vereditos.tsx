"use client";

/**
 * A BARRA de vereditos — o único "gráfico" desta tela, em CSS puro.
 *
 * Por que sem biblioteca: são três números por linha. Uma lib de gráfico
 * traria bundle, canvas e tooltip-only para desenhar o que um flex com três
 * divs resolve — e tooltip-only é justamente o que não pode acontecer aqui: a
 * contagem exata aparece SEMPRE ao lado da barra, em texto.
 *
 * O que este arquivo NÃO faz (regra de ouro): não classifica veredito, não
 * compara campo e não agrega nada. Recebe as três contagens que a API já
 * somou e as desenha. A ÚNICA aritmética é a soma que serve de denominador da
 * largura — geometria da barra, nunca um número exibido: mostrar esse total
 * inventaria o fechamento que a API de propósito não fecha (conferência sem
 * veredito não entra em nenhum dos três baldes).
 *
 * As cores são as SEMÂNTICAS do app (as mesmas do selo e da /demo): vermelho
 * divergente, âmbar não conferível, verde conforme. Elas são reservadas para
 * estado — nunca viram "série 1, 2, 3" de outra coisa.
 */

import { juntarClasses } from "@/lib/classes";
import type { ContagemPorVeredito } from "@/lib/tipos";

/** Ordem fixa em toda a tela: a mais grave primeiro (precedência da engine). */
const FATIAS = [
  {
    chave: "divergentes",
    plural: "divergentes",
    singular: "divergente",
    cor: "bg-divergente",
    titulo:
      "Peça gravada diferente da etiqueta — no fluxo TRAEL, para a produção até corrigir.",
  },
  {
    chave: "naoConferiveis",
    plural: "não conferíveis",
    singular: "não conferível",
    cor: "bg-nao-conferivel",
    titulo:
      "A API se recusou a afirmar: foto/leitura sem lastro esperando olho humano. Não é peça ruim.",
  },
  {
    chave: "conformes",
    plural: "conformes",
    singular: "conforme",
    cor: "bg-conforme",
    titulo: "Bateu com a etiqueta no recorte que aquela conferência cobriu.",
  },
] as const satisfies readonly {
  chave: keyof ContagemPorVeredito;
  plural: string;
  singular: string;
  cor: string;
  titulo: string;
}[];

/** `1 divergente, 8 não conferíveis, 16 conformes` — texto, não enfeite. */
export function descreverContagens(item: ContagemPorVeredito): string {
  return FATIAS.map((fatia) => {
    const valor = item[fatia.chave];
    return `${valor} ${valor === 1 ? fatia.singular : fatia.plural}`;
  }).join(", ");
}

/**
 * Barra empilhada 100%: a proporção entre os três vereditos de UM grupo
 * (etapa ou campo).
 *
 * Acessibilidade: a barra é `role="img"` com o texto completo em `aria-label`
 * (`"Serigrafia: 1 divergente, 8 não conferíveis, 16 conformes"`), então quem
 * usa leitor de tela recebe os números exatos, não "gráfico".
 */
export function BarraDeVereditos({
  item,
  rotulo,
  className,
}: {
  item: ContagemPorVeredito;
  /** Nome do grupo, para o `aria-label` (`Serigrafia`, `serie-placa`…). */
  rotulo: string;
  className?: string;
}) {
  const total = item.divergentes + item.naoConferiveis + item.conformes;

  if (total === 0) {
    return (
      <div
        role="img"
        aria-label={`${rotulo}: nenhuma conferência com veredito gravado`}
        className={juntarClasses(
          "h-3 w-full rounded-full bg-superficie-2",
          className,
        )}
      />
    );
  }

  return (
    // `gap-0.5` = os 2px de SUPERFÍCIE que separam as fatias. Separar com o
    // fundo (e não com borda em volta de cada fatia) mantém a tinta da barra
    // sendo só dado. `overflow-hidden` + `rounded-full` arredondam as pontas.
    <div
      role="img"
      aria-label={`${rotulo}: ${descreverContagens(item)}`}
      className={juntarClasses(
        "flex h-3 w-full gap-0.5 overflow-hidden rounded-full bg-superficie",
        className,
      )}
    >
      {FATIAS.map((fatia) => {
        const valor = item[fatia.chave];
        if (valor === 0) return null;

        return (
          <span
            key={fatia.chave}
            className={juntarClasses("block h-full min-w-[3px]", fatia.cor)}
            // O piso de 3px é deliberado: uma divergência em 83 conferências
            // daria menos de um pixel e sumiria da barra. Vale distorcer a
            // proporção da fatia mínima para que ela nunca desapareça — a
            // contagem exata está no texto ao lado de qualquer jeito.
            style={{ width: `${(valor / total) * 100}%` }}
          />
        );
      })}
    </div>
  );
}

/**
 * As contagens em texto, ao lado da barra.
 *
 * `aria-hidden` porque é a MESMA informação que o `aria-label` da barra já
 * anuncia, palavra por palavra — repetir só faria o leitor de tela ler tudo
 * duas vezes. Nada fica escondido: o que se esconde é a duplicata.
 */
export function ContagensDeVereditos({
  item,
  className,
}: {
  item: ContagemPorVeredito;
  className?: string;
}) {
  return (
    <ul
      aria-hidden
      className={juntarClasses(
        "flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-conteudo-suave",
        className,
      )}
    >
      {FATIAS.map((fatia) => {
        const valor = item[fatia.chave];

        return (
          <li key={fatia.chave} className="flex items-center gap-1.5">
            <span
              className={juntarClasses("size-2 shrink-0 rounded-full", fatia.cor)}
            />
            {/* O número em tinta de TEXTO, com o ponto colorido ao lado
                carregando a identidade — texto colorido em corpo 12 é o que
                falha contraste primeiro. */}
            <span className="numeros font-semibold text-conteudo">{valor}</span>
            <span>{valor === 1 ? fatia.singular : fatia.plural}</span>
          </li>
        );
      })}
    </ul>
  );
}

/** Legenda do cartão: o que cada cor significa, uma vez por bloco de barras. */
export function LegendaDeVereditos({ className }: { className?: string }) {
  return (
    <ul
      className={juntarClasses(
        "flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-conteudo-suave",
        className,
      )}
    >
      {FATIAS.map((fatia) => (
        <li
          key={fatia.chave}
          title={fatia.titulo}
          className="flex items-center gap-1.5"
        >
          <span
            aria-hidden
            className={juntarClasses("size-2 shrink-0 rounded-full", fatia.cor)}
          />
          {fatia.plural}
        </li>
      ))}
    </ul>
  );
}
