import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddConferenciaEmPassagem1785098463527 implements MigrationInterface {
  name = 'AddConferenciaEmPassagem1785098463527';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "passagem" ADD "conferenciaId" uuid`);
    await queryRunner.query(
      `ALTER TABLE "passagem" ADD CONSTRAINT "FK_a1d2dde69d299bf3ec1a2619e0f" FOREIGN KEY ("conferenciaId") REFERENCES "conferencia"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "passagem" DROP CONSTRAINT "FK_a1d2dde69d299bf3ec1a2619e0f"`,
    );
    await queryRunner.query(
      `ALTER TABLE "passagem" DROP COLUMN "conferenciaId"`,
    );
  }
}
