import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddObservacaoConferencia1784996130541 implements MigrationInterface {
  name = 'AddObservacaoConferencia1784996130541';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "conferencia" ADD "observacao" character varying`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "conferencia" DROP COLUMN "observacao"`,
    );
  }
}
