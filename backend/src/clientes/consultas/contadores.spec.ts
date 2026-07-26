import { Conferencia } from '../../conferencias/domain/conferencia';
import { VinculoClienteTransformador } from '../../transformadores/infrastructure/persistence/transformador.repository';
import { contarPorCliente } from './contadores';

// Nota de lint: a regra `no-restricted-syntax` do projeto exige que todo `it`
// comece com "should"; o restante da frase segue o vocabulario de dominio.

const conferencia = (vereditoGeral: string | null): Conferencia =>
  ({ vereditoGeral }) as Conferencia;

const vinculo = (
  transformadorId: string,
  clienteId: string,
): VinculoClienteTransformador => ({ transformadorId, clienteId });

describe('contarPorCliente', () => {
  it('should devolver mapa vazio para cliente sem peca vinculada', () => {
    const contadores = contarPorCliente([], new Map());

    expect(contadores.size).toBe(0);
  });

  it('should contar peca sem conferencia no total, nunca como divergente', () => {
    const contadores = contarPorCliente(
      [vinculo('peca-1', 'cliente-a')],
      new Map(),
    );

    expect(contadores.get('cliente-a')).toEqual({
      totalPecas: 1,
      pecasDivergentes: 0,
    });
  });

  it('should contar como divergente a peca cujo veredito vigente e divergente', () => {
    const contadores = contarPorCliente(
      [vinculo('peca-1', 'cliente-a'), vinculo('peca-2', 'cliente-a')],
      new Map([
        ['peca-1', conferencia('divergente')],
        ['peca-2', conferencia('conforme')],
      ]),
    );

    expect(contadores.get('cliente-a')).toEqual({
      totalPecas: 2,
      pecasDivergentes: 1,
    });
  });

  it('should respeitar a VIGENCIA: conforme apos divergente nao conta', () => {
    // O mapa de vigentes ja traz so a ULTIMA conferencia por peca (DISTINCT ON
    // do repositorio) — se ela e conforme, a divergencia antiga nao aparece.
    const contadores = contarPorCliente(
      [vinculo('peca-1', 'cliente-a')],
      new Map([['peca-1', conferencia('conforme')]]),
    );

    expect(contadores.get('cliente-a')).toEqual({
      totalPecas: 1,
      pecasDivergentes: 0,
    });
  });

  it('should separar contadores por cliente', () => {
    const contadores = contarPorCliente(
      [
        vinculo('peca-1', 'cliente-a'),
        vinculo('peca-2', 'cliente-b'),
        vinculo('peca-3', 'cliente-b'),
      ],
      new Map([['peca-2', conferencia('divergente')]]),
    );

    expect(contadores.get('cliente-a')).toEqual({
      totalPecas: 1,
      pecasDivergentes: 0,
    });
    expect(contadores.get('cliente-b')).toEqual({
      totalPecas: 2,
      pecasDivergentes: 1,
    });
  });

  it('should tratar nao_conferivel como nao divergente', () => {
    const contadores = contarPorCliente(
      [vinculo('peca-1', 'cliente-a')],
      new Map([['peca-1', conferencia('nao_conferivel')]]),
    );

    expect(contadores.get('cliente-a')).toEqual({
      totalPecas: 1,
      pecasDivergentes: 0,
    });
  });
});
