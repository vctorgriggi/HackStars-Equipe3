import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddObservacaoEventoPassagem1784994228174 implements MigrationInterface {
  name = 'AddObservacaoEventoPassagem1784994228174';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "evento_passagem" ADD "observacao" character varying`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "evento_passagem" DROP COLUMN "observacao"`,
    );
  }
}
