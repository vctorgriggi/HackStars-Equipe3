import {
  // common
  HttpStatus,
  Injectable,
  UnprocessableEntityException,
} from '@nestjs/common';

import { CheckpointsService } from '../checkpoints/checkpoints.service';
import { Checkpoint } from '../checkpoints/domain/checkpoint';
import { Conferencia } from '../conferencias/domain/conferencia';
import { EtapaResumo } from '../conferencias/dto/resumos-compartilhados.dto';
import { ConferenciaRepository } from '../conferencias/infrastructure/persistence/conferencia.repository';
import { AnuncioPassagemService } from '../tempo-real/anuncio-passagem.service';
import { TransformadoresService } from '../transformadores/transformadores.service';
import { resumirConferencia } from '../transformadores/consultas/conferencia-resumo';

import { RegistrarPassagemDto } from './dto/registrar-passagem.dto';
import { ResultadoRegistroPassagem } from './dto/resultado-registro-passagem.dto';
import { PassagemRepository } from './infrastructure/persistence/passagem.repository';

/**
 * Registro de passagem a partir do QR (T4.1). O `POST /passagens` gerado pede
 * dois UUIDs que o celular do operador nao tem; aqui a peca e resolvida pela
 * chave de negocio (`numeroSerie`, do QR) e a etapa pelo `codigo` do
 * Checkpoint — os dois identificadores estaveis do sistema.
 *
 * Fronteiras respeitadas: nada de comparacao de campo (a passagem nao emite
 * veredito, so LE o ultimo), nada de checklist/ProjetoModelo (registrar
 * transito nao pode falhar porque o projeto da peca esta indeterminado) e
 * nenhuma chamada de visao.
 */
@Injectable()
export class PassagemRegistroService {
  constructor(
    private readonly checkpointService: CheckpointsService,

    private readonly transformadorService: TransformadoresService,

    private readonly passagemRepository: PassagemRepository,

    private readonly conferenciaRepository: ConferenciaRepository,

    private readonly anuncioPassagem: AnuncioPassagemService,
  ) {}

  async registrar(
    dto: RegistrarPassagemDto,
  ): Promise<ResultadoRegistroPassagem> {
    // Fase barata primeiro: QR e etapa sao os dois 422 possiveis, e ambos saem
    // ANTES de qualquer escrita — etapa digitada errada na URL do celular nao
    // pode deixar peca orfa no banco (mesma garantia do /conferencias/executar).
    const payload = this.transformadorService.lerPayloadDoQr(dto.payloadQr);
    const checkpoint = await this.resolverCheckpoint(dto.etapaCodigo);

    // Vinculo de comprovacao (gate da estacao): validado ainda na fase barata
    // — os 422 daqui tambem nao podem deixar peca orfa.
    const conferenciaVinculada = await this.resolverConferenciaVinculada(
      dto,
      payload.numeroSerie,
    );

    const transformador =
      await this.transformadorService.buscarOuCriarPorPayload(payload);

    // Onde a peca estava ANTES deste scan — lido antes do INSERT, senao a
    // propria passagem nova viraria a "anterior". E o `from` da animacao do
    // tempo real, server-authoritative de proposito: o estado do cliente pode
    // ter perdido eventos.
    const checkpointAnterior = await this.lerCheckpointAnterior(
      transformador.id,
    );

    const passagem = await this.passagemRepository.create({
      observacao: dto.observacao ?? null,
      conferencia: conferenciaVinculada,
      checkpoint,
      transformador,
    });

    // Com vinculo, a conferencia da resposta e a que COMPROVOU este scan;
    // sem ele, mantem-se a ultima da peca (o veredito vigente do criterio 6).
    const ultima =
      conferenciaVinculada ??
      (
        await this.conferenciaRepository.findAllByTransformador({
          transformadorId: transformador.id,
          limit: 1,
        })
      )[0];

    const resultado: ResultadoRegistroPassagem = {
      passagem: {
        id: passagem.id,
        createdAt: passagem.createdAt,
        observacao: passagem.observacao ?? null,
      },
      checkpoint: {
        codigo: checkpoint.codigo,
        nome: checkpoint.nome,
        ordem: checkpoint.ordem,
      },
      transformador: {
        id: transformador.id,
        numeroSerie: transformador.numeroSerie,
        patrimonio: transformador.patrimonio,
        cliente: transformador.cliente,
      },
      ultimaConferencia: ultima ? resumirConferencia(ultima) : null,
    };

    // Difusao no canal de tempo real (esteira). NUNCA falha o scan: a
    // passagem ja esta gravada, e `anunciar()` engole o proprio erro.
    await this.anuncioPassagem.anunciar(resultado, checkpointAnterior);

    return resultado;
  }

  /**
   * Resolve e valida a conferencia que comprova esta passagem (fluxo do gate).
   * Regras, todas 422 e todas ANTES de qualquer escrita:
   * - a conferencia precisa existir, ser da MESMA peca do QR e do MESMO
   *   checkpoint da passagem (sem checkpoint = checklist inteira, que nao
   *   comprova gate nenhum);
   * - conferencia nao-`conforme` vinculada e a REPROVA HUMANA da leitura:
   *   exige `observacao` — e o que torna a excecao auditavel por construcao
   *   (mesma convencao do aceite de excecao do SPEC).
   */
  private async resolverConferenciaVinculada(
    dto: RegistrarPassagemDto,
    numeroSerieDoQr: string,
  ): Promise<Conferencia | null> {
    if (!dto.conferenciaId) {
      return null;
    }

    const conferencia = await this.conferenciaRepository.findById(
      dto.conferenciaId,
    );
    if (!conferencia) {
      throw this.erroDeVinculo(`conferencia-inexistente: ${dto.conferenciaId}`);
    }

    if (conferencia.transformador.numeroSerie !== numeroSerieDoQr) {
      throw this.erroDeVinculo(
        `conferencia-de-outra-peca: ${dto.conferenciaId}`,
      );
    }

    if (conferencia.checkpoint?.codigo !== dto.etapaCodigo) {
      throw this.erroDeVinculo(
        `conferencia-de-outra-etapa: ${dto.conferenciaId}`,
      );
    }

    const liberacaoComExcecao = conferencia.vereditoGeral !== 'conforme';
    if (liberacaoComExcecao && !dto.observacao?.trim()) {
      throw this.erroDeVinculo('excecao-sem-observacao');
    }

    return conferencia;
  }

  private erroDeVinculo(mensagem: string): UnprocessableEntityException {
    return new UnprocessableEntityException({
      status: HttpStatus.UNPROCESSABLE_ENTITY,
      errors: {
        conferenciaId: mensagem,
      },
    });
  }

  private async lerCheckpointAnterior(
    transformadorId: string,
  ): Promise<EtapaResumo | null> {
    const ultimas = await this.passagemRepository.findUltimaPorTransformadores([
      transformadorId,
    ]);
    const anterior = ultimas.get(transformadorId)?.checkpoint;

    return anterior
      ? {
          codigo: anterior.codigo,
          nome: anterior.nome,
          ordem: anterior.ordem,
        }
      : null;
  }

  private async resolverCheckpoint(etapaCodigo: string): Promise<Checkpoint> {
    const checkpoint = await this.checkpointService.findByCodigo(etapaCodigo);
    if (!checkpoint) {
      // Mesmo codigo de erro do /conferencias/executar: um so contrato de
      // "etapa que nao existe" para o front tratar.
      throw new UnprocessableEntityException({
        status: HttpStatus.UNPROCESSABLE_ENTITY,
        errors: {
          etapaCodigo: `etapa-desconhecida: ${etapaCodigo}`,
        },
      });
    }

    return checkpoint;
  }
}
