import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddDomainEntities1784993216684 implements MigrationInterface {
  name = 'AddDomainEntities1784993216684';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "transformador" ("descricao" character varying, "cliente" character varying NOT NULL, "seq" character varying, "pedido" character varying, "patrimonio" character varying NOT NULL, "numeroSerie" character varying NOT NULL, "id" uuid NOT NULL DEFAULT uuid_generate_v4(), "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_ff9524e64fceca6e12d390d71c5" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "checkpoint" ("ordem" integer NOT NULL, "nome" character varying NOT NULL, "id" uuid NOT NULL DEFAULT uuid_generate_v4(), "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_fea86db187949398f8b614f730a" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "conferencia" ("vereditoGeral" character varying, "id" uuid NOT NULL DEFAULT uuid_generate_v4(), "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "checkpointId" uuid, "transformadorId" uuid NOT NULL, CONSTRAINT "PK_3a09f3acd681030ab8d026c6fb9" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "foto_evidencia" ("fonteFisica" character varying, "url" character varying NOT NULL, "id" uuid NOT NULL DEFAULT uuid_generate_v4(), "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "conferenciaId" uuid, CONSTRAINT "PK_bbfbcee38f9daf00cd0cbca84b9" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "evento_passagem" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "checkpointId" uuid NOT NULL, "transformadorId" uuid NOT NULL, CONSTRAINT "PK_cde45884087136beac19cc177a5" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "campo_conferido" ("veredito" character varying, "confianca" integer, "valorLido" character varying, "valorEsperado" character varying NOT NULL, "nomeCampo" character varying NOT NULL, "id" uuid NOT NULL DEFAULT uuid_generate_v4(), "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "fotoEvidenciaId" uuid, "conferenciaId" uuid NOT NULL, CONSTRAINT "PK_121e7eb3f4acfa48552e4fcd5a0" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `ALTER TABLE "conferencia" ADD CONSTRAINT "FK_d0c2af64a0594ef35822c4d45c7" FOREIGN KEY ("checkpointId") REFERENCES "checkpoint"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "conferencia" ADD CONSTRAINT "FK_1e2de7f079905d3604bc32d7dd5" FOREIGN KEY ("transformadorId") REFERENCES "transformador"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "foto_evidencia" ADD CONSTRAINT "FK_bc465937706c0323d8469cdcdf9" FOREIGN KEY ("conferenciaId") REFERENCES "conferencia"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "evento_passagem" ADD CONSTRAINT "FK_cc48648547146486a085e9fce57" FOREIGN KEY ("checkpointId") REFERENCES "checkpoint"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "evento_passagem" ADD CONSTRAINT "FK_7052abef3776db8ea9b617c842e" FOREIGN KEY ("transformadorId") REFERENCES "transformador"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "campo_conferido" ADD CONSTRAINT "FK_64fa52db40ee47056e0a2b2ec5c" FOREIGN KEY ("fotoEvidenciaId") REFERENCES "foto_evidencia"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "campo_conferido" ADD CONSTRAINT "FK_7ace7dd0e6963a9a995bcb62e5c" FOREIGN KEY ("conferenciaId") REFERENCES "conferencia"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "campo_conferido" DROP CONSTRAINT "FK_7ace7dd0e6963a9a995bcb62e5c"`,
    );
    await queryRunner.query(
      `ALTER TABLE "campo_conferido" DROP CONSTRAINT "FK_64fa52db40ee47056e0a2b2ec5c"`,
    );
    await queryRunner.query(
      `ALTER TABLE "evento_passagem" DROP CONSTRAINT "FK_7052abef3776db8ea9b617c842e"`,
    );
    await queryRunner.query(
      `ALTER TABLE "evento_passagem" DROP CONSTRAINT "FK_cc48648547146486a085e9fce57"`,
    );
    await queryRunner.query(
      `ALTER TABLE "foto_evidencia" DROP CONSTRAINT "FK_bc465937706c0323d8469cdcdf9"`,
    );
    await queryRunner.query(
      `ALTER TABLE "conferencia" DROP CONSTRAINT "FK_1e2de7f079905d3604bc32d7dd5"`,
    );
    await queryRunner.query(
      `ALTER TABLE "conferencia" DROP CONSTRAINT "FK_d0c2af64a0594ef35822c4d45c7"`,
    );
    await queryRunner.query(`DROP TABLE "campo_conferido"`);
    await queryRunner.query(`DROP TABLE "evento_passagem"`);
    await queryRunner.query(`DROP TABLE "foto_evidencia"`);
    await queryRunner.query(`DROP TABLE "conferencia"`);
    await queryRunner.query(`DROP TABLE "checkpoint"`);
    await queryRunner.query(`DROP TABLE "transformador"`);
  }
}
