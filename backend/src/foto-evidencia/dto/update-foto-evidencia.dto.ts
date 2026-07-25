// Don't forget to use the class-validator decorators in the DTO properties.
// import { Allow } from 'class-validator';

import { PartialType } from '@nestjs/swagger';
import { CreateFotoEvidenciaDto } from './create-foto-evidencia.dto';

export class UpdateFotoEvidenciaDto extends PartialType(
  CreateFotoEvidenciaDto,
) {}
