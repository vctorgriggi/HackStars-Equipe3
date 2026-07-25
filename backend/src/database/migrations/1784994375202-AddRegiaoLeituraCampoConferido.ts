import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddRegiaoLeituraCampoConferido1784994375202 implements MigrationInterface {
  name = 'AddRegiaoLeituraCampoConferido1784994375202';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "campo_conferido" ADD "regiaoLeitura" character varying`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "campo_conferido" DROP COLUMN "regiaoLeitura"`,
    );
  }
}
