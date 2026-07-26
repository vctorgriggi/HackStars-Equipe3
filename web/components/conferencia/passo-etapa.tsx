"use client";

/**
 * PASSO 1 — em qual etapa da linha esta conferência acontece.
 *
 * Não é burocracia: a etapa RECORTA o que a API vai cobrar (semântica
 * cumulativa — o gate N reconfere o que ele e os anteriores gravaram).
 * Conferir na etapa errada produz `nao_conferivel` em marcação que ainda nem
 * existe na peça, ou deixa de cobrar a que existe. E, do outro lado, um
 * `conforme` de gate parcial NÃO atesta a peça inteira (gap 14) — por isso a
 * etapa aparece grande e é confirmada, nunca assumida em silêncio.
 *
 * O valor já vem provisionado do aparelho (`?etapa=` na URL ou memória), como
 * numa câmera fixa: o caminho normal é um toque em "Continuar". Trocar aqui
 * troca a etapa DO APARELHO — é o mesmo provisionamento da home, não um ajuste
 * só desta conferência.
 */

import { useState } from "react";

import { useEtapa } from "@/lib/etapa";
import { juntarClasses } from "@/lib/classes";
import {
  Aviso,
  AvisoDeErro,
  Botao,
  CabecalhoCartao,
  Cartao,
  Carregando,
  Chip,
} from "@/components/ui";

import { confirmarEtapa } from "./sessao";

/** `null` é uma opção legítima: conferir a peça inteira, sem gate. */
const PECA_INTEIRA = "";

export function PassoEtapa() {
  const {
    codigo,
    etapa,
    etapas,
    carregandoEtapas,
    erroEtapas,
    desconhecida,
    fixadaPelaUrl,
    definirEtapa,
  } = useEtapa();

  const [trocando, setTrocando] = useState(false);
  const [escolha, setEscolha] = useState<string | null>(null);

  const selecionada = escolha ?? codigo ?? PECA_INTEIRA;

  const confirmar = (valor: string | null) => {
    // A etapa é do APARELHO: gravar aqui mantém home, passagem e conferência
    // falando da mesma câmera.
    definirEtapa(valor);
    confirmarEtapa(valor);
  };

  // Aparelho já provisionado numa etapa que existe na linha: um toque basta.
  if (etapa && !trocando) {
    return (
      <Cartao faixa="acento">
        <CabecalhoCartao
          titulo="Este aparelho é a câmera desta etapa"
          descricao="A conferência vai cobrar o que este gate e os anteriores gravaram na peça."
          acao={<Chip tom="acento">{etapa.ordem}ª etapa</Chip>}
        />

        <p className="text-2xl font-semibold text-conteudo">{etapa.nome}</p>
        <p className="font-mono text-xs text-conteudo-suave">{etapa.codigo}</p>

        {fixadaPelaUrl ? (
          <p className="mt-2 text-xs text-conteudo-suave">
            Recebida pelo link de provisionamento (<code>?etapa=</code>) e salva
            neste aparelho.
          </p>
        ) : null}

        <div className="mt-4 space-y-2">
          <Botao tamanho="grande" onClick={() => confirmar(etapa.codigo)}>
            Continuar
          </Botao>
          <Botao
            variante="secundario"
            className="w-full"
            onClick={() => setTrocando(true)}
          >
            Conferir em outra etapa
          </Botao>
        </div>
      </Cartao>
    );
  }

  return (
    <Cartao>
      <CabecalhoCartao
        titulo="Onde você está na linha?"
        descricao="A etapa define o que esta conferência cobra: o gate confere o que ele e as etapas anteriores gravaram na peça."
      />

      {erroEtapas ? <AvisoDeErro erro={erroEtapas} className="mb-3" /> : null}

      {carregandoEtapas ? (
        <Carregando linhas={4} rotulo="Carregando as etapas da linha…" />
      ) : (
        <fieldset className="space-y-2">
          <legend className="sr-only">Etapa desta conferência</legend>

          {etapas.map((item) => (
            <OpcaoDeEtapa
              key={item.codigo}
              valor={item.codigo}
              selecionado={selecionada === item.codigo}
              aoSelecionar={setEscolha}
              titulo={`${item.ordem}. ${item.nome}`}
              descricao={item.codigo}
            />
          ))}

          <OpcaoDeEtapa
            valor={PECA_INTEIRA}
            selecionado={selecionada === PECA_INTEIRA}
            aoSelecionar={setEscolha}
            titulo="Peça inteira"
            descricao="Confere a checklist toda do projeto, sem recorte de etapa."
          />
        </fieldset>
      )}

      {desconhecida ? (
        <Aviso tom="alerta" className="mt-3">
          Este aparelho está configurado com a etapa <code>{codigo}</code>, que
          não existe na linha. Escolha uma da lista — senão a API recusa a
          conferência.
        </Aviso>
      ) : null}

      <div className="mt-4">
        <Botao
          tamanho="grande"
          onClick={() =>
            confirmar(selecionada === PECA_INTEIRA ? null : selecionada)
          }
        >
          Continuar
        </Botao>
      </div>
    </Cartao>
  );
}

function OpcaoDeEtapa({
  valor,
  selecionado,
  aoSelecionar,
  titulo,
  descricao,
}: {
  valor: string;
  selecionado: boolean;
  aoSelecionar: (valor: string) => void;
  titulo: string;
  descricao: string;
}) {
  return (
    <label
      className={juntarClasses(
        "flex min-h-14 cursor-pointer items-center gap-3 rounded-xl border p-3 transition-colors",
        selecionado
          ? "border-acento bg-acento-fundo"
          : "border-borda bg-superficie hover:bg-superficie-2",
      )}
    >
      <input
        type="radio"
        name="etapa-da-conferencia"
        value={valor}
        checked={selecionado}
        onChange={() => aoSelecionar(valor)}
        className="size-5 accent-[var(--acento)]"
      />
      <span className="min-w-0">
        <span className="block font-semibold text-conteudo">{titulo}</span>
        <span className="block truncate font-mono text-xs text-conteudo-suave">
          {descricao}
        </span>
      </span>
    </label>
  );
}
