import {
  // common
  HttpStatus,
  Injectable,
  UnprocessableEntityException,
} from '@nestjs/common';

import { CheckpointsService } from '../checkpoints/checkpoints.service';
import { Checkpoint } from '../checkpoints/domain/checkpoint';
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
      checkpoint,
      transformador,
    });

    const [ultima] = await this.conferenciaRepository.findAllByTransformador({
      transformadorId: transformador.id,
      limit: 1,
    });

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
