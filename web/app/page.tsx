"use client";

/**
 * Home: as quatro coisas que se faz com o celular na mão — as três do operador
 * (conferir, registrar, buscar) e a leitura de linha —, mais a configuração da
 * etapa deste aparelho.
 *
 * Cartões grandes de propósito — a escolha é feita em pé, de luva, segurando a
 * peça. Uma coluna no celular; no desktop viram duas, senão quatro cartões
 * dessa altura empurram o seletor de etapa para fora da tela.
 */

import { CartaoAcao } from "@/components/ui";
import { SeletorDeEtapa } from "@/components/seletor-de-etapa";

export default function Home() {
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold text-conteudo">
          O que você vai fazer?
        </h1>
        <p className="mt-1 text-sm text-conteudo-suave">
          A conferência compara a peça com o QR da etiqueta. Quem decide o
          veredito é o servidor — a tela só mostra o resultado.
        </p>
      </div>

      <nav className="grid gap-3 sm:grid-cols-2">
        <CartaoAcao
          href="/conferencia"
          icone="📷"
          titulo="Conferir peça"
          descricao="Ler o QR, fotografar as vistas e receber o veredito campo a campo."
        />
        <CartaoAcao
          href="/passagem"
          icone="🏭"
          titulo="Registrar passagem"
          descricao="Scan do QR nesta etapa da linha, com alerta se a última conferência divergiu."
        />
        <CartaoAcao
          href="/peca"
          icone="🔎"
          titulo="Buscar peça"
          descricao="Histórico de trânsito e de conferências pelo número de série."
        />
        <CartaoAcao
          href="/indicadores"
          icone="📊"
          titulo="Indicadores da linha"
          descricao="Divergências por etapa e por campo, e onde cada peça está agora."
        />
      </nav>

      <SeletorDeEtapa />
    </div>
  );
}
