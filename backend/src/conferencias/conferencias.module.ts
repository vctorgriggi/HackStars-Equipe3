import { CamposConferidosModule } from '../campos-conferidos/campos-conferidos.module';
import { CheckpointsModule } from '../checkpoints/checkpoints.module';
import { ExtracaoModule } from '../extracao/extracao.module';
import { FotosEvidenciaModule } from '../fotos-evidencia/fotos-evidencia.module';
import { ProjetosModeloModule } from '../projetos-modelo/projetos-modelo.module';
import { TransformadoresModule } from '../transformadores/transformadores.module';
import {
  // do not remove this comment
  forwardRef,
  Module,
} from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CampoConferidoEntity } from '../campos-conferidos/infrastructure/persistence/relational/entities/campo-conferido.entity';
import { PassagemEntity } from '../passagens/infrastructure/persistence/relational/entities/passagem.entity';
import { TransformadorEntity } from '../transformadores/infrastructure/persistence/relational/entities/transformador.entity';
import { ConferenciasService } from './conferencias.service';
import { ConferenciaConsultasService } from './consultas/conferencia-consultas.service';
import { IndicadoresService } from './consultas/indicadores.service';
import { ConferenciaExecucaoService } from './conferencia-execucao.service';
import { ConferenciaExtracaoService } from './conferencia-extracao.service';
import { ConferenciaLaudoService } from './laudo/conferencia-laudo.service';
import { ConferenciaPlanoService } from './plano/conferencia-plano.service';
import { ConferenciasController } from './conferencias.controller';
import { ConferenciaEntity } from './infrastructure/persistence/relational/entities/conferencia.entity';
import { RelationalConferenciaPersistenceModule } from './infrastructure/persistence/relational/relational-persistence.module';

@Module({
  imports: [
    CheckpointsModule,

    TransformadoresModule,

    ProjetosModeloModule,

    // Sem ciclo: `extracao` e modulo de servico, nao conhece dominio.
    ExtracaoModule,

    // Ciclo inevitavel: CampoConferido aponta para Conferencia (filho -> pai)
    // e a execucao precisa gravar os campos do resultado da engine.
    forwardRef(() => CamposConferidosModule),

    // Ciclo inevitavel: FotosEvidenciaModule ja importava ConferenciasModule
    // (evidencia aponta para conferencia) e agora a extracao precisa ler os
    // bytes da evidencia. Quebrar isso exigiria um terceiro modulo so para
    // storage — custo que nao se paga nesta rodada.
    forwardRef(() => FotosEvidenciaModule),

    // Repositorios TypeORM crus para o LADO DE LEITURA (IndicadoresService):
    // dashboard e auditoria sao COUNT/GROUP BY no banco, e as portas de
    // persistencia so devolvem agregados de dominio com relacoes eager (gap 3)
    // — contar em memoria a fabrica inteira e o que este registro evita. Nada
    // aqui escreve: a escrita de veredito segue com um caminho unico.
    TypeOrmModule.forFeature([
      ConferenciaEntity,
      CampoConferidoEntity,
      PassagemEntity,
      TransformadorEntity,
    ]),

    // do not remove this comment
    RelationalConferenciaPersistenceModule,
  ],
  controllers: [ConferenciasController],
  providers: [
    ConferenciasService,
    ConferenciaExecucaoService,
    ConferenciaExtracaoService,
    ConferenciaConsultasService,
    ConferenciaLaudoService,
    ConferenciaPlanoService,
    IndicadoresService,
  ],
  exports: [
    ConferenciasService,
    ConferenciaExecucaoService,
    ConferenciaExtracaoService,
    ConferenciaConsultasService,
    ConferenciaLaudoService,
    ConferenciaPlanoService,
    IndicadoresService,
    RelationalConferenciaPersistenceModule,
  ],
})
export class ConferenciasModule {}
