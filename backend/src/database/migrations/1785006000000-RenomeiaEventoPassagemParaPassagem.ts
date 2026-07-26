import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * A entidade EventoPassagem virou Passagem: o prefixo "Evento" era ruido de
 * log generico e a palavra do dominio TRAEL e "passagem" (peca x checkpoint x
 * timestamp). Renomeacao pura de tabela — nenhuma coluna, constraint ou dado
 * muda. As constraints mantem os nomes gerados na criacao (PK_cde458...,
 * FK_cc4864..., FK_7052ab...): renomea-las nao muda comportamento e so
 * inflaria a migration.
 */
export class RenomeiaEventoPassagemParaPassagem1785006000000 implements MigrationInterface {
  name = 'RenomeiaEventoPassagemParaPassagem1785006000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "evento_passagem" RENAME TO "passagem"`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "passagem" RENAME TO "evento_passagem"`,
    );
  }
}
