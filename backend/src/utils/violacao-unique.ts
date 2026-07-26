/** Postgres: unique_violation. */
const CODIGO_VIOLACAO_UNIQUE = '23505';

/**
 * Reconhece a violacao de constraint UNIQUE do Postgres em erros do TypeORM,
 * para os find-or-create tratarem a corrida "outro request inseriu entre o
 * find e o insert" recuperando o registro concorrente em vez de estourar 500.
 */
export function ehViolacaoDeUnique(erro: unknown): boolean {
  const bruto = erro as
    | { code?: string; driverError?: { code?: string } }
    | null
    | undefined;

  return (
    bruto?.driverError?.code === CODIGO_VIOLACAO_UNIQUE ||
    bruto?.code === CODIGO_VIOLACAO_UNIQUE
  );
}
