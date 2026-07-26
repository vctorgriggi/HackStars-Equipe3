import {
  // common
  HttpStatus,
  Injectable,
  UnprocessableEntityException,
} from '@nestjs/common';

import { CheckpointsService } from '../checkpoints/checkpoints.service';
import { Checkpoint } from '../checkpoints/domain/checkpoint';
import { ConferenciaRepository } from '../conferencias/infrastructure/persistence/conferencia.repository';
import { TransformadoresService } from '../transformadores/transformadores.service';
import {
  ConferenciaResumo,
  resumirConferencia,
} from '../transformadores/consultas/conferencia-resumo';

import { RegistrarPassagemDto } from './dto/registrar-passagem.dto';
import { PassagemRepository } from './infrastructure/persistence/passagem.repository';

export interface ResultadoRegistroPassagem {
  passagem: {
    id: string;
    createdAt: Date;
    observacao: string | null;
  };
  checkpoint: { codigo: string; nome: string; ordem: number };
  transformador: {
    id: string;
    numeroSerie: string;
    patrimonio: string;
    cliente: string;
  };
  /**
   * Ultimo veredito conhecido da peca — `null` quando ela nunca foi conferida.
   * E o que sustenta o criterio 6 do SPEC: o scan de uma peca cuja ultima
   * conferencia deu `divergente` exibe o alerta NO ATO, sem o operador abrir a
   * tela de veredito. Vem do banco como foi gravado; o front so renderiza.
   */
  ultimaConferencia: ConferenciaResumo | null;
}

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

    const passagem = await this.passagemRepository.create({
      observacao: dto.observacao ?? null,
      checkpoint,
      transformador,
    });

    const [ultima] = await this.conferenciaRepository.findAllByTransformador({
      transformadorId: transformador.id,
      limit: 1,
    });

    return {
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
