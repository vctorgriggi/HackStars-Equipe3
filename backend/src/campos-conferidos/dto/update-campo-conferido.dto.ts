// Don't forget to use the class-validator decorators in the DTO properties.
// import { Allow } from 'class-validator';

import { PartialType } from '@nestjs/swagger';
import { CreateCampoConferidoDto } from './create-campo-conferido.dto';

export class UpdateCampoConferidoDto extends PartialType(
  CreateCampoConferidoDto,
) {}
