import { Conferencia } from '../../conferencias/domain/conferencia';
import { Passagem } from '../../passagens/domain/passagem';
import { VinculoLoteTransformador } from '../infrastructure/persistence/transformador.repository';
import { resumirLotes } from './lotes';

// Nota de lint: a regra `no-restricted-syntax` do projeto exige que todo `it`
// comece com "should"; o restante da frase segue o vocabulario de dominio.

const conferencia = (vereditoGeral: string | null): Conferencia =>
  ({ vereditoGeral }) as Conferencia;

const passagem = (ordem: number): Passagem =>
  ({ checkpoint: { ordem } }) as Passagem;

const vinculo = (
  transformadorId: string,
  pedido: string,
  cliente = 'Energisa',
  projetoCodigo: string | null = 'EPT-163-PI-676',
): VinculoLoteTransformador => ({
  transformadorId,
  pedido,
  cliente,
  projetoCodigo,
});

const ORDEM_MAXIMA = 4;

describe('resumirLotes', () => {
  it('should devolver mapa vazio sem pecas', () => {
    const resumos = resumirLotes([], new Map(), new Map(), ORDEM_MAXIMA);

    expect(resumos.size).toBe(0);
  });

  it('should contar pecas e divergentes por pedido, separando pedidos', () => {
    const resumos = resumirLotes(
      [
        vinculo('peca-1', 'pedido-a'),
        vinculo('peca-2', 'pedido-a'),
        vinculo('peca-3', 'pedido-b'),
      ],
      new Map([
        ['peca-1', conferencia('divergente')],
        ['peca-2', conferencia('conforme')],
      ]),
      new Map(),
      ORDEM_MAXIMA,
    );

    expect(resumos.get('pedido-a')).toMatchObject({
      totalPecas: 2,
      pecasDivergentes: 1,
    });
    expect(resumos.get('pedido-b')).toMatchObject({
      totalPecas: 1,
      pecasDivergentes: 0,
    });
  });

  it('should nunca contar como divergente a peca sem conferencia ou nao_conferivel', () => {
    const resumos = resumirLotes(
      [vinculo('peca-1', 'pedido-a'), vinculo('peca-2', 'pedido-a')],
      new Map([['peca-2', conferencia('nao_conferivel')]]),
      new Map(),
      ORDEM_MAXIMA,
    );

    expect(resumos.get('pedido-a')?.pecasDivergentes).toBe(0);
  });

  it('should manter cliente e projeto quando as pecas do pedido concordam', () => {
    const resumos = resumirLotes(
      [vinculo('peca-1', 'pedido-a'), vinculo('peca-2', 'pedido-a')],
      new Map(),
      new Map(),
      ORDEM_MAXIMA,
    );

    expect(resumos.get('pedido-a')).toMatchObject({
      cliente: 'Energisa',
      projetoCodigo: 'EPT-163-PI-676',
    });
  });

  it('should anular cliente e projeto MISTOS em vez de eleger um', () => {
    const resumos = resumirLotes(
      [
        vinculo('peca-1', 'pedido-a', 'Energisa', 'EPT-163-PI-676'),
        vinculo('peca-2', 'pedido-a', 'Coopercel', 'TPD-408136'),
      ],
      new Map(),
      new Map(),
      ORDEM_MAXIMA,
    );

    expect(resumos.get('pedido-a')).toMatchObject({
      cliente: null,
      projetoCodigo: null,
    });
  });

  it('should tratar o sentinela vazio de cliente como null (T1.3)', () => {
    const resumos = resumirLotes(
      [vinculo('peca-1', 'pedido-a', '', null)],
      new Map(),
      new Map(),
      ORDEM_MAXIMA,
    );

    expect(resumos.get('pedido-a')).toMatchObject({
      cliente: null,
      projetoCodigo: null,
    });
  });

  it('should medir progresso como media da ordem da ultima passagem', () => {
    // peca-1 na etapa 4 de 4 (100%), peca-2 sem passagem (0%) → 50%.
    const resumos = resumirLotes(
      [vinculo('peca-1', 'pedido-a'), vinculo('peca-2', 'pedido-a')],
      new Map(),
      new Map([['peca-1', passagem(4)]]),
      ORDEM_MAXIMA,
    );

    expect(resumos.get('pedido-a')?.progressoPct).toBe(50);
  });

  it('should chegar a 100 so com todas as pecas na ultima etapa', () => {
    const resumos = resumirLotes(
      [vinculo('peca-1', 'pedido-a'), vinculo('peca-2', 'pedido-a')],
      new Map(),
      new Map([
        ['peca-1', passagem(4)],
        ['peca-2', passagem(4)],
      ]),
      ORDEM_MAXIMA,
    );

    expect(resumos.get('pedido-a')?.progressoPct).toBe(100);
  });

  it('should devolver progresso 0 quando a linha nao tem etapas', () => {
    // ordemMaxima 0 (sem checkpoints) nunca divide por zero.
    const resumos = resumirLotes(
      [vinculo('peca-1', 'pedido-a')],
      new Map(),
      new Map([['peca-1', passagem(2)]]),
      0,
    );

    expect(resumos.get('pedido-a')?.progressoPct).toBe(0);
  });
});
