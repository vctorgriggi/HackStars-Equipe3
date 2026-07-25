import { MigrationInterface, QueryRunner } from 'typeorm';

export class AjustesAuditoria1784995679336 implements MigrationInterface {
  name = 'AjustesAuditoria1784995679336';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "checkpoint" ADD "codigo" character varying NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "checkpoint" ADD CONSTRAINT "UQ_59ebd20ab17420a3a1494c6238a" UNIQUE ("codigo")`,
    );
    await queryRunner.query(
      `ALTER TABLE "projeto_modelo" ADD CONSTRAINT "UQ_3dd988b82b81d8e4a8dcf982466" UNIQUE ("codigo")`,
    );
    await queryRunner.query(
      `ALTER TABLE "transformador" ADD CONSTRAINT "UQ_395878f460eb8c35d8b97121798" UNIQUE ("numeroSerie")`,
    );
    await queryRunner.query(
      `ALTER TABLE "foto_evidencia" ALTER COLUMN "fonteFisica" SET NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "campo_conferido" DROP COLUMN "confianca"`,
    );
    await queryRunner.query(
      `ALTER TABLE "campo_conferido" ADD "confianca" double precision`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "campo_conferido" DROP COLUMN "confianca"`,
    );
    await queryRunner.query(
      `ALTER TABLE "campo_conferido" ADD "confianca" integer`,
    );
    await queryRunner.query(
      `ALTER TABLE "foto_evidencia" ALTER COLUMN "fonteFisica" DROP NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "transformador" DROP CONSTRAINT "UQ_395878f460eb8c35d8b97121798"`,
    );
    await queryRunner.query(
      `ALTER TABLE "projeto_modelo" DROP CONSTRAINT "UQ_3dd988b82b81d8e4a8dcf982466"`,
    );
    await queryRunner.query(
      `ALTER TABLE "checkpoint" DROP CONSTRAINT "UQ_59ebd20ab17420a3a1494c6238a"`,
    );
    await queryRunner.query(`ALTER TABLE "checkpoint" DROP COLUMN "codigo"`);
  }
}
