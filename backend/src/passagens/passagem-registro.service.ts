import {
  // common
  HttpStatus,
  Injectable,
  UnprocessableEntityException,
} from '@nestjs/common';

import { ApiProperty } from '@nestjs/swagger';

import { CheckpointsService } from '../checkpoints/checkpoints.service';
import { Checkpoint } from '../checkpoints/domain/checkpoint';
import {
  EtapaResumo,
  TransformadorResumo,
} from '../conferencias/dto/resumos-compartilhados.dto';
import { ConferenciaRepository } from '../conferencias/infrastructure/persistence/conferencia.repository';
import { TransformadoresService } from '../transformadores/transformadores.service';
import {
  ConferenciaResumo,
  resumirConferencia,
} from '../transformadores/consultas/conferencia-resumo';

import { RegistrarPassagemDto } from './dto/registrar-passagem.dto';
import { PassagemRepository } from './infrastructure/persistence/passagem.repository';

/** O evento de transito recem-gravado. */
export class PassagemRegistrada {
  @ApiProperty({
    type: String,
    example: '7c2b9e10-4d5a-4b6c-8e9f-0a1b2c3d4e5f',
  })
  id: string;

  @ApiProperty({
    type: String,
    format: 'date-time',
    example: '2026-07-26T13:02:11.412Z',
    description: 'Timestamp da passagem, gravado pelo banco.',
  })
  createdAt: Date;

  @ApiProperty({
    type: String,
    nullable: true,
    example: null,
    description: 'Anotacao enviada no scan; `null` quando nao houve.',
  })
  observacao: string | null;
}

/**
 * Resposta de `POST /passagens/registrar`.
 *
 * CLASSE, nao interface: e daqui que sai o dado do ALERTA (criterio 6 do
 * SPEC), e sem classe o Swagger entregava a rota sem schema de resposta.
 */
export class ResultadoRegistroPassagem {
  @ApiProperty({ type: PassagemRegistrada })
  passagem: PassagemRegistrada;

  @ApiProperty({
    type: EtapaResumo,
    description:
      'Etapa em que o scan foi registrado, resolvida pelo `codigo` enviado.',
  })
  checkpoint: EtapaResumo;

  @ApiProperty({
    type: TransformadorResumo,
    description:
      'Peca resolvida por find-or-create pelo numero de serie do QR (a ' +
      'etiqueta e a fonte da verdade: patrimonio/cliente/pedido divergentes ' +
      'atualizam o registro).',
  })
  transformador: TransformadorResumo;

  @ApiProperty({
    type: ConferenciaResumo,
    nullable: true,
    description:
      'Ultimo veredito conhecido da peca; `null` quando ela nunca foi ' +
      'conferida. E O DADO DO ALERTA (criterio 6 do SPEC): scan de peca cuja ' +
      'ultima conferencia deu `divergente` deve exibir o alerta NO ATO, sem o ' +
      'operador abrir a tela de veredito. Leia `vereditoGeral` JUNTO de ' +
      '`checkpoint`: um `conforme` de gate parcial nao atesta a peca inteira ' +
      '(gap 14). Vem do banco como foi gravado; o front so renderiza.',
  })
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
