import {
  // common
  HttpStatus,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { CampoConferidoRepository } from '../../campos-conferidos/infrastructure/persistence/campo-conferido.repository';
import { ConferenciaRepository } from '../infrastructure/persistence/conferencia.repository';
import { Conferencia } from '../domain/conferencia';
import { paraFotoDaEvidencia } from '../dto/resumos-compartilhados.dto';
import {
  CampoVeredito,
  indexarChecklist,
  VereditoConferencia,
} from './veredito-conferencia';

/**
 * Releitura de conferencia ja emitida (gap 4 do CLAUDE.md). Consome os dois
 * repositorios direto — sao portas de persistencia, sem regra de dominio no
 * caminho — pelo mesmo motivo que `TransformadorConsultasService`.
 *
 * Nada aqui compara, deriva ou corrige veredito: le o que a engine gravou e
 * recorta o payload (as relacoes geradas sao `eager`, gap 3). A regra de ouro
 * continua valendo na leitura — o front renderiza este JSON como veio.
 */
@Injectable()
export class ConferenciaConsultasService {
  constructor(
    private readonly conferenciaRepository: ConferenciaRepository,

    private readonly campoConferidoRepository: CampoConferidoRepository,
  ) {}

  /**
   * Veredito campo a campo de UMA conferencia, com a evidencia de cada campo.
   *
   * E o que torna a tela de veredito remontavel sem a resposta do POST: um
   * refresh, uma navegacao entre telas (fotos numa, veredito noutra) ou a
   * abertura pelo historico da peca reconstroem tudo so com esta chamada.
   *
   * Conferencia inexistente e 404, nunca lista vazia: id errado devolvendo
   * `campos: []` passaria por "conferencia sem nenhuma divergencia" — falso OK,
   * exatamente o que a regra de ouro proibe.
   */
  async vereditoPorConferencia(
    conferenciaId: Conferencia['id'],
  ): Promise<VereditoConferencia> {
    const conferencia =
      await this.conferenciaRepository.findById(conferenciaId);
    if (!conferencia) {
      throw new NotFoundException({
        status: HttpStatus.NOT_FOUND,
        errors: {
          conferencia: `conferencia-inexistente: ${conferenciaId}`,
        },
      });
    }

    const camposConferidos =
      await this.campoConferidoRepository.findByConferencia({ conferenciaId });

    // `fonteFisica` e `obrigatorio` nao sao persistidos em CampoConferido:
    // voltam da checklist do ProjetoModelo da peca, que tambem define a ORDEM.
    const referencia = indexarChecklist(
      conferencia.transformador?.projetoModelo,
    );

    const campos: CampoVeredito[] = camposConferidos
      // A posicao no banco (createdAt ASC) e o desempate estavel de quem a
      // checklist nao conhece — sem ele, campo removido da checklist ficaria
      // saltando de lugar entre duas leituras da MESMA conferencia.
      .map((campoConferido, posicaoNoBanco) => ({
        campoConferido,
        posicaoNoBanco,
        naChecklist: referencia.get(campoConferido.nomeCampo),
      }))
      .sort((a, b) => {
        const ordemA = a.naChecklist?.ordem ?? Number.MAX_SAFE_INTEGER;
        const ordemB = b.naChecklist?.ordem ?? Number.MAX_SAFE_INTEGER;
        if (ordemA !== ordemB) {
          return ordemA - ordemB;
        }
        return a.posicaoNoBanco - b.posicaoNoBanco;
      })
      .map(({ campoConferido, naChecklist }) => ({
        id: campoConferido.id,
        campo: campoConferido.nomeCampo,
        fonteFisica: naChecklist?.fonteFisica ?? null,
        obrigatorio: naChecklist?.obrigatorio ?? null,
        valorEsperado: campoConferido.valorEsperado,
        valorLido: campoConferido.valorLido ?? null,
        confianca: campoConferido.confianca ?? null,
        veredito: campoConferido.veredito ?? null,
        regiaoLeitura: campoConferido.regiaoLeitura ?? null,
        // INSTANCIA, nunca objeto literal: e o que faz o
        // `@TransformUrlEvidencia()` disparar e a `url` chegar pronta ao front
        // (assinada sob s3, absoluta sob local).
        fotoEvidencia: paraFotoDaEvidencia(campoConferido.fotoEvidencia),
      }));

    return {
      conferencia: {
        id: conferencia.id,
        vereditoGeral: conferencia.vereditoGeral ?? null,
        createdAt: conferencia.createdAt,
        observacao: conferencia.observacao ?? null,
        checkpoint: conferencia.checkpoint
          ? {
              codigo: conferencia.checkpoint.codigo,
              nome: conferencia.checkpoint.nome,
              ordem: conferencia.checkpoint.ordem,
            }
          : null,
      },
      transformador: {
        id: conferencia.transformador.id,
        numeroSerie: conferencia.transformador.numeroSerie,
        patrimonio: conferencia.transformador.patrimonio,
        cliente: conferencia.transformador.cliente,
      },
      campos,
    };
  }
}
