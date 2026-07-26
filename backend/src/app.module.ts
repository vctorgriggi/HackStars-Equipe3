import { Module } from '@nestjs/common';
import { UsersModule } from './users/users.module';
import { FilesModule } from './files/files.module';
import { AuthModule } from './auth/auth.module';
import databaseConfig from './database/config/database.config';
import authConfig from './auth/config/auth.config';
import appConfig from './config/app.config';
import mailConfig from './mail/config/mail.config';
import fileConfig from './files/config/file.config';
import path from 'path';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HeaderResolver, I18nModule } from 'nestjs-i18n';
import { TypeOrmConfigService } from './database/typeorm-config.service';
import { MailModule } from './mail/mail.module';
import { HomeModule } from './home/home.module';
import { DataSource, DataSourceOptions } from 'typeorm';
import { AllConfigType } from './config/config.type';
import { SessionModule } from './session/session.module';
import { MailerModule } from './mailer/mailer.module';

const infrastructureDatabaseModule = TypeOrmModule.forRootAsync({
  useClass: TypeOrmConfigService,
  dataSourceFactory: async (options: DataSourceOptions) => {
    return new DataSource(options).initialize();
  },
});

import { TransformadoresModule } from './transformadores/transformadores.module';

import { CheckpointsModule } from './checkpoints/checkpoints.module';

import { FotosEvidenciaModule } from './fotos-evidencia/fotos-evidencia.module';

import { ConferenciasModule } from './conferencias/conferencias.module';

import { CamposConferidosModule } from './campos-conferidos/campos-conferidos.module';

import { PassagensModule } from './passagens/passagens.module';

import { ProjetosModeloModule } from './projetos-modelo/projetos-modelo.module';

import { ExtracaoModule } from './extracao/extracao.module';

// Temporário: página de demonstração servida em /demo (remover antes de prod).
import { DemoModule } from './demo/demo.module';

import { ClientesModule } from './clientes/clientes.module';
// Temporário, MESMO PRAZO DA /demo (gap 13 do CLAUDE.md): cena de apresentação
// servida em /esteira, para o telão da demo. Remover os DOIS logo após a
// apresentação — a página faz login sem guard, como a /demo.
import { EsteiraModule } from './esteira/esteira.module';
// O app de producao web/ e exportado estatico (next output: export) e servido
// pela PROPRIA API em /app: mesmo dominio HTTPS do App Runner (camera do
// celular exige origem segura) e nenhum servico novo. O diretorio web-app/ e
// artefato de build (fora do git); receita no docs/deploy.md.
import { ServeStaticModule } from '@nestjs/serve-static';
import { join } from 'path';

@Module({
  imports: [
    ClientesModule,
    DemoModule,
    EsteiraModule,
    ServeStaticModule.forRoot({
      rootPath: join(process.cwd(), 'web-app'),
      serveRoot: '/app',
    }),

    ExtracaoModule,

    ProjetosModeloModule,
    PassagensModule,
    CamposConferidosModule,
    ConferenciasModule,
    FotosEvidenciaModule,
    CheckpointsModule,
    TransformadoresModule,
    ConfigModule.forRoot({
      isGlobal: true,
      load: [databaseConfig, authConfig, appConfig, mailConfig, fileConfig],
      envFilePath: ['.env'],
    }),
    infrastructureDatabaseModule,
    I18nModule.forRootAsync({
      useFactory: (configService: ConfigService<AllConfigType>) => ({
        fallbackLanguage: configService.getOrThrow('app.fallbackLanguage', {
          infer: true,
        }),
        loaderOptions: { path: path.join(__dirname, '/i18n/'), watch: true },
      }),
      resolvers: [
        {
          use: HeaderResolver,
          useFactory: (configService: ConfigService<AllConfigType>) => {
            return [
              configService.get('app.headerLanguage', {
                infer: true,
              }),
            ];
          },
          inject: [ConfigService],
        },
      ],
      imports: [ConfigModule],
      inject: [ConfigService],
    }),
    UsersModule,
    FilesModule,
    AuthModule,
    SessionModule,
    MailModule,
    MailerModule,
    HomeModule,
  ],
})
export class AppModule {}
