import { Checkpoint } from '../../checkpoints/domain/checkpoint';

import { ApiProperty } from '@nestjs/swagger';

// Câmera fixa provisionada num gate da linha (SPEC, "Câmeras fixas na linha"):
// o vínculo amarra a câmera ao Checkpoint e a fonteFisica diz qual VISTA da
// peça o ponto de vista dela enxerga. Nesta rodada é só cadastro — os feeds
// são simulados no front; a captura automática é rodada futura.
export class Camera {
  @ApiProperty({
    type: () => Checkpoint,
    nullable: true,
    description:
      'Gate da linha em que a câmera está instalada; null = provisionada ' +
      'sem vínculo. Clientes agrupam pelo `codigo` do checkpoint (estável), ' +
      'nunca por nome ou ordem.',
  })
  checkpoint?: Checkpoint | null;

  @ApiProperty({
    type: () => String,
    nullable: true,
    description:
      'Endereço de provisionamento do stream (ex.: RTSP). Dado ' +
      'administrativo — nenhum serviço consome o stream nesta rodada.',
  })
  endpoint?: string | null;

  @ApiProperty({
    type: () => Boolean,
    nullable: false,
    description:
      'Estado administrativo do cadastro; não mede "online" (não há câmera ' +
      'física nesta rodada).',
  })
  ativa: boolean;

  @ApiProperty({
    type: () => String,
    nullable: false,
    example: 'topo',
    description:
      'VISTA da peça que a câmera enxerga (mesma whitelist canônica de ' +
      'fonteFisica das fotos-evidência).',
  })
  fonteFisica: string;

  @ApiProperty({
    type: () => String,
    nullable: false,
    example: 'CAM-01',
  })
  nome: string;

  @ApiProperty({
    type: String,
  })
  id: string;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;
}
