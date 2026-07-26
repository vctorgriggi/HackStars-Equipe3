"use client";

/**
 * Os números de capa: o que existe no banco, contado pela API.
 *
 * Cada tile é um `COUNT(*)` que veio pronto. A tela não soma, não divide e não
 * calcula porcentagem — em especial, NÃO mostra a diferença entre
 * `conferencias` e a soma dos três vereditos: conferência criada fora da engine
 * fica sem veredito, e um tile "sem veredito" derivado por subtração seria a
 * tela inventando um número que a API não deu. Em vez disso, a nota embaixo diz
 * o que a soma significa.
 *
 * A tela se recarrega sozinha a cada 5 s, então cada tile PISCA quando o texto
 * que ele exibe muda de uma carga para a outra (`ao-vivo.tsx`). É comparação de
 * exibição — "o que estava escrito aqui é diferente do que está escrito agora"
 * —, não de negócio: o tile não sabe o que conta, não compara com limiar nenhum
 * e não deriva veredito. O destaque some em `prefers-reduced-motion`.
 */

import { CabecalhoCartao, Cartao } from "@/components/ui";
import { juntarClasses } from "@/lib/classes";
import type { TotaisIndicadores } from "@/lib/tipos";

import {
  DestaqueDeMudanca,
  EstilosAoVivo,
  useDestaqueDeMudanca,
  type TomDoDestaque,
} from "./ao-vivo";
import { formatarInteiro } from "./formato";

type TomTile = TomDoDestaque;

const MOLDURA: Record<TomTile, string> = {
  neutro: "border-borda bg-superficie",
  divergente: "border-divergente/40 bg-divergente-fundo",
  nao_conferivel: "border-nao-conferivel/40 bg-nao-conferivel-fundo",
  conforme: "border-conforme/40 bg-conforme-fundo",
};

const VALOR: Record<TomTile, string> = {
  neutro: "text-conteudo",
  divergente: "text-divergente",
  nao_conferivel: "text-nao-conferivel",
  conforme: "text-conforme",
};

function Tile({
  rotulo,
  valor,
  tom = "neutro",
  titulo,
}: {
  rotulo: string;
  valor: number;
  tom?: TomTile;
  /** Explicação do que o número conta — o rótulo curto não cabe explicar. */
  titulo: string;
}) {
  const texto = formatarInteiro(valor);
  // O que se compara é o TEXTO já formatado, o mesmo que está na tela.
  const destaque = useDestaqueDeMudanca(texto);

  return (
    // `isolate` + `overflow-hidden` seguram a camada do destaque dentro do
    // tile e atrás do conteúdo — ver `DestaqueDeMudanca`.
    <div
      title={titulo}
      className={juntarClasses(
        "relative isolate overflow-hidden rounded-xl border p-3",
        MOLDURA[tom],
      )}
    >
      <DestaqueDeMudanca geracao={destaque} tom={tom} />

      <p className="text-xs font-medium tracking-wide text-conteudo-suave uppercase">
        {rotulo}
      </p>
      {/* `numeros` (tabular) de propósito: os tiles formam colunas, e número
          tabular alinha a casa dos milhares de um tile com a do de baixo. */}
      <p
        className={juntarClasses(
          "numeros mt-1 text-3xl leading-tight font-bold",
          VALOR[tom],
        )}
      >
        {texto}
      </p>
    </div>
  );
}

export function TilesDeTotais({ totais }: { totais: TotaisIndicadores }) {
  return (
    <Cartao>
      <EstilosAoVivo />

      <CabecalhoCartao
        titulo="Números da linha"
        descricao="Tudo o que a engine já gravou, contado pela API."
      />

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        <Tile
          rotulo="Conferências"
          valor={totais.conferencias}
          titulo="Conferências existentes no banco, com ou sem veredito."
        />
        <Tile
          rotulo="Divergentes"
          valor={totais.divergentes}
          tom="divergente"
          titulo="Conferências com veredito divergente: a peça estava gravada diferente da etiqueta. Cada uma delas parou (ou deveria ter parado) a produção até correção."
        />
        <Tile
          rotulo="Não conferíveis"
          valor={totais.naoConferiveis}
          tom="nao_conferivel"
          titulo="Conferências em que a API se recusou a afirmar. Não é sinônimo de peça ruim: é leitura sem lastro esperando olho humano."
        />
        <Tile
          rotulo="Conformes"
          valor={totais.conformes}
          tom="conforme"
          titulo="Conferências com veredito conforme. Leia junto das etapas: conforme de gate parcial não atesta a peça inteira."
        />
        <Tile
          rotulo="Peças"
          valor={totais.pecas}
          titulo="Transformadores cadastrados. A peça nasce no primeiro scan ou na primeira conferência."
        />
        <Tile
          rotulo="Passagens"
          valor={totais.passagens}
          titulo="Registros de peça × checkpoint × horário."
        />
      </div>

      <p className="mt-3 text-xs text-conteudo-suave">
        Divergentes, não conferíveis e conformes somam <strong>no máximo</strong>{" "}
        o total de conferências: linha criada fora da engine fica sem veredito e
        não entra em nenhum dos três. A tela mostra os quatro números como a API
        os contou, sem fechar a conta por dedução.
      </p>
    </Cartao>
  );
}
