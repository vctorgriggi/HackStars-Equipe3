// Don't forget to use the class-validator decorators in the DTO properties.
// import { Allow } from 'class-validator';

import { PartialType } from '@nestjs/swagger';
import { CreateConferenciaDto } from './create-conferencia.dto';

export class UpdateConferenciaDto extends PartialType(CreateConferenciaDto) {}
