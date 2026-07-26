import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddClienteEVinculo1785063218667 implements MigrationInterface {
  name = 'AddClienteEVinculo1785063218667';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "cliente" ("nome" character varying NOT NULL, "id" uuid NOT NULL DEFAULT uuid_generate_v4(), "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "UQ_75b48abff126710b0c726dcd518" UNIQUE ("nome"), CONSTRAINT "PK_18990e8df6cf7fe71b9dc0f5f39" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `ALTER TABLE "transformador" ADD "clienteVinculadoId" uuid`,
    );
    await queryRunner.query(
      `ALTER TABLE "transformador" ADD CONSTRAINT "FK_e28f652503465baf61483f13a9e" FOREIGN KEY ("clienteVinculadoId") REFERENCES "cliente"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    // Backfill idempotente das pecas ja cadastradas: um Cliente por texto
    // distinto vindo do QR. A sentinela '' (etiqueta sem cliente) nunca vira
    // cadastro — ausencia nao e afirmacao.
    await queryRunner.query(
      `INSERT INTO "cliente" ("nome") SELECT DISTINCT "cliente" FROM "transformador" WHERE "cliente" <> '' ON CONFLICT ("nome") DO NOTHING`,
    );
    await queryRunner.query(
      `UPDATE "transformador" t SET "clienteVinculadoId" = c."id" FROM "cliente" c WHERE t."cliente" = c."nome" AND t."clienteVinculadoId" IS NULL`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "transformador" DROP CONSTRAINT "FK_e28f652503465baf61483f13a9e"`,
    );
    await queryRunner.query(
      `ALTER TABLE "transformador" DROP COLUMN "clienteVinculadoId"`,
    );
    await queryRunner.query(`DROP TABLE "cliente"`);
  }
}
