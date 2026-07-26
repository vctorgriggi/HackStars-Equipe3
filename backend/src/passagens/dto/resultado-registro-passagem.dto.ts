import { ApiProperty } from '@nestjs/swagger';

import {
  EtapaResumo,
  TransformadorResumo,
} from '../../conferencias/dto/resumos-compartilhados.dto';
import { ConferenciaResumo } from '../../transformadores/consultas/conferencia-resumo';

/**
 * Resposta de `POST /passagens/registrar` E payload do evento de tempo real
 * `passagem-registrada` (tempo-real/). Vive em arquivo FOLHA de dto/ — e nao
 * no service — porque o evento a importa: service → anuncio → dto do evento →
 * service seria ciclo de arquivo, e decorators avaliados no meio de um ciclo
 * enxergam a classe como `undefined`.
 */

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
