"use client";

/**
 * O veredito campo a campo de UMA conferência do histórico
 * (`GET /conferencias/:id/campos`), carregado só quando o operador abre o item
 * — a lista pode ter 20 conferências e nenhuma delas precisa ser buscada antes
 * de alguém querer ver.
 *
 * HONESTIDADE OBRIGATÓRIA (gap 22 do CLAUDE.md): a releitura devolve o
 * veredito, não o PORQUÊ dele. `motivo` (`sem-leitura`,
 * `confianca-abaixo-do-limiar`, `leitura-nao-corroborada`…), as `incoerencias`
 * entre campos irmãos e os `achadosInconsistentes` só existem na resposta do
 * POST da conferência e não são persistidos. A tela diz isso em vez de deixar o
 * operador achar que um `nao_conferivel` sem explicação é a explicação inteira.
 */

import { useQuery } from "@tanstack/react-query";

import { lerVeredito } from "@/lib/api";
import { Aviso, AvisoDeErro, Carregando } from "@/components/ui";

import { CampoConferidoLinha } from "./campo-conferido-linha";
import { formatarDataHora } from "./formato";

export function DetalheDaConferencia({
  conferenciaId,
  ativo,
}: {
  conferenciaId: string;
  /** A consulta só sai quando o item está aberto. */
  ativo: boolean;
}) {
  const consulta = useQuery({
    queryKey: ["conferencia", conferenciaId, "campos"],
    queryFn: ({ signal }) => lerVeredito(conferenciaId, signal),
    enabled: ativo,
    // A URL assinada da foto expira em 1 h: manter em cache por muito tempo
    // devolveria link morto. 5 min é folga suficiente para o operador olhar.
    staleTime: 5 * 60 * 1000,
  });

  if (!ativo) return null;

  if (consulta.isPending) {
    return <Carregando linhas={3} rotulo="Carregando o veredito campo a campo…" />;
  }

  if (consulta.error) {
    return <AvisoDeErro erro={consulta.error} />;
  }

  const { conferencia, campos } = consulta.data;
  const temFoto = campos.some((campo) => campo.fotoEvidencia !== null);

  return (
    <div className="space-y-3">
      {conferencia.observacao ? (
        <Aviso tom="alerta">
          <span className="block text-xs font-semibold uppercase">
            Exceção anotada nesta conferência
          </span>
          {conferencia.observacao}
        </Aviso>
      ) : null}

      {campos.length > 0 ? (
        <p className="text-xs text-conteudo-suave">
          <strong>Esperado</strong> é o que o QR da etiqueta manda;{" "}
          <strong>lido na peça</strong> é o que a visão leu na foto. O selo é o
          que a engine gravou — não é a tela que compara os dois.
        </p>
      ) : null}

      {campos.length === 0 ? (
        <Aviso tom="neutro">
          Esta conferência não tem campos gravados.
        </Aviso>
      ) : (
        <ul className="space-y-2">
          {campos.map((campo) => (
            <CampoConferidoLinha key={campo.id} campo={campo} />
          ))}
        </ul>
      )}

      <p className="text-xs text-conteudo-suave">
        Releitura de {formatarDataHora(conferencia.createdAt)}. O{" "}
        <strong>detalhe do motivo</strong> (por que um campo ficou não
        conferível, incoerência entre posições irmãs e achados inconsistentes)
        está disponível apenas no momento da conferência — o banco guarda o
        veredito, não a explicação.
        {temFoto
          ? " Os links das fotos são assinados e expiram em 1 hora: se uma imagem não abrir, recarregue esta tela."
          : ""}
      </p>
    </div>
  );
}
