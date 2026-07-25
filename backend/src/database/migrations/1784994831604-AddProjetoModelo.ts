import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddProjetoModelo1784994831604 implements MigrationInterface {
  name = 'AddProjetoModelo1784994831604';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "projeto_modelo" ("checklist" character varying NOT NULL, "descricao" character varying, "codigo" character varying NOT NULL, "id" uuid NOT NULL DEFAULT uuid_generate_v4(), "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_100433b9f199a8eaaa8b34ea655" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `ALTER TABLE "transformador" ADD "projetoModeloId" uuid`,
    );
    await queryRunner.query(
      `ALTER TABLE "transformador" ADD CONSTRAINT "FK_bbf69e201589953732f4fefcc87" FOREIGN KEY ("projetoModeloId") REFERENCES "projeto_modelo"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "transformador" DROP CONSTRAINT "FK_bbf69e201589953732f4fefcc87"`,
    );
    await queryRunner.query(
      `ALTER TABLE "transformador" DROP COLUMN "projetoModeloId"`,
    );
    await queryRunner.query(`DROP TABLE "projeto_modelo"`);
  }
}
