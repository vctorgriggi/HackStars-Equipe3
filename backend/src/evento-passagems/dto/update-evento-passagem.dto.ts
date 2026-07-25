// Don't forget to use the class-validator decorators in the DTO properties.
// import { Allow } from 'class-validator';

import { PartialType } from '@nestjs/swagger';
import { CreateEventoPassagemDto } from './create-evento-passagem.dto';

export class UpdateEventoPassagemDto extends PartialType(
  CreateEventoPassagemDto,
) {}
