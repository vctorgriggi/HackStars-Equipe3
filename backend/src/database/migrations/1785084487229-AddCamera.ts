import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddCamera1785084487229 implements MigrationInterface {
  name = 'AddCamera1785084487229';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "camera" ("endpoint" character varying, "ativa" boolean NOT NULL, "fonteFisica" character varying NOT NULL, "nome" character varying NOT NULL, "id" uuid NOT NULL DEFAULT uuid_generate_v4(), "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "checkpointId" uuid, CONSTRAINT "PK_3e6992bc5e67b9f9a6f95a5fe6f" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `ALTER TABLE "camera" ADD CONSTRAINT "FK_13f7aeb5d98f42149bb0bc5a10b" FOREIGN KEY ("checkpointId") REFERENCES "checkpoint"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "camera" DROP CONSTRAINT "FK_13f7aeb5d98f42149bb0bc5a10b"`,
    );
    await queryRunner.query(`DROP TABLE "camera"`);
  }
}
