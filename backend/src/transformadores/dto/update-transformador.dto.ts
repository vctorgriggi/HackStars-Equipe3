// Don't forget to use the class-validator decorators in the DTO properties.
// import { Allow } from 'class-validator';

import { PartialType } from '@nestjs/swagger';
import { CreateTransformadorDto } from './create-transformador.dto';

export class UpdateTransformadorDto extends PartialType(
  CreateTransformadorDto,
) {}
