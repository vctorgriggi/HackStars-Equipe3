import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Complemento da renomeacao evento_passagem -> passagem (auditoria da rodada
 * nomes-pt): o TypeORM deriva o nome do FK de um hash de (tabela, colunas),
 * entao os FKs criados sob o nome antigo ficaram orfaos — em runtime nada
 * muda, mas o proximo `migration:generate` emitiria 4 statements de
 * DROP/ADD espurios misturados a mudanca pretendida. Renomear as constraints
 * para os hashes que o TypeORM espera zera esse ruido.
 */
export class RenomeiaFksPassagem1785007000000 implements MigrationInterface {
  name = 'RenomeiaFksPassagem1785007000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "passagem" RENAME CONSTRAINT "FK_cc48648547146486a085e9fce57" TO "FK_1c3d0a33ee1f170a9491b143f8c"`,
    );
    await queryRunner.query(
      `ALTER TABLE "passagem" RENAME CONSTRAINT "FK_7052abef3776db8ea9b617c842e" TO "FK_115d41cb42bbb1f07286920dfb6"`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "passagem" RENAME CONSTRAINT "FK_115d41cb42bbb1f07286920dfb6" TO "FK_7052abef3776db8ea9b617c842e"`,
    );
    await queryRunner.query(
      `ALTER TABLE "passagem" RENAME CONSTRAINT "FK_1c3d0a33ee1f170a9491b143f8c" TO "FK_cc48648547146486a085e9fce57"`,
    );
  }
}
