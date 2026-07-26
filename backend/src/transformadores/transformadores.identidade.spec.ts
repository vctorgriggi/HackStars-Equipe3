import { UnprocessableEntityException } from '@nestjs/common';

import { ClientesService } from '../clientes/clientes.service';
import { ProjetosModeloService } from '../projetos-modelo/projetos-modelo.service';

import { Transformador } from './domain/transformador';
import { TransformadorRepository } from './infrastructure/persistence/transformador.repository';
import { TransformadoresService } from './transformadores.service';

// Nota de lint: a regra `no-restricted-syntax` do projeto exige que todo `it`
// comece com "should"; o restante da frase segue o vocabulario de dominio.
//
// Cobre a resolucao de IDENTIDADE que o registro de passagem (T4.1) passou a
// consumir: ler o QR e chegar na peca pela chave de negocio. Tudo dublado —
// nada aqui toca banco.

const AGORA = new Date('2026-07-25T12:00:00.000Z');

function peca(extra: Partial<Transformador> = {}): Transformador {
  return {
    id: 'transformador-1',
    numeroSerie: '847233',
    patrimonio: '251328',
    cliente: 'Energisa',
    pedido: null,
    seq: null,
    descricao: null,
    projetoModelo: null,
    createdAt: AGORA,
    updatedAt: AGORA,
    ...extra,
  } as Transformador;
}

function payloadQr(extra: Record<string, string> = {}): string {
  return JSON.stringify({
    numeroSerie: '847233',
    patrimonio: '251328',
    cliente: 'Energisa',
    ...extra,
  });
}

interface Bancada {
  service: TransformadoresService;
  findByNumeroSerie: jest.Mock;
  criar: jest.Mock;
  atualizar: jest.Mock;
  listar: jest.Mock;
  buscarOuCriarClientePorNome: jest.Mock;
}

function montarBancada(
  opcoes: {
    existente?: Transformador | null;
    erroAoCriar?: unknown;
  } = {},
): Bancada {
  const findByNumeroSerie = jest.fn(() =>
    Promise.resolve(opcoes.existente ?? null),
  );
  const criar = jest.fn(() => {
    if (opcoes.erroAoCriar) {
      return Promise.reject(opcoes.erroAoCriar);
    }
    return Promise.resolve(peca());
  });
  // O service monta o payload de update com todas as colunas (as ausentes
  // viram `undefined`); o dublê ignora as indefinidas, como o TypeORM faz.
  const atualizar = jest.fn((_id: string, payload: Record<string, unknown>) => {
    const definidos = Object.fromEntries(
      Object.entries(payload).filter(([, valor]) => valor !== undefined),
    );
    return Promise.resolve(peca(definidos as Partial<Transformador>));
  });
  const listar = jest.fn(() => Promise.resolve([]));

  const transformadorRepository = {
    findByNumeroSerie,
    create: criar,
    update: atualizar,
    findAllWithPagination: listar,
  } as unknown as TransformadorRepository;

  const projetoModeloService = {
    findById: jest.fn(() => Promise.resolve(null)),
  } as unknown as ProjetosModeloService;

  // Cadastro de cliente dublado: find-or-create devolve sempre o mesmo id,
  // e o findById (que o create/update do service usa para validar o vinculo)
  // ecoa o registro.
  const buscarOuCriarClientePorNome = jest.fn((nome: string) =>
    Promise.resolve({
      id: 'cliente-1',
      nome,
      createdAt: AGORA,
      updatedAt: AGORA,
    }),
  );
  const clienteService = {
    buscarOuCriarPorNome: buscarOuCriarClientePorNome,
    findById: jest.fn(() =>
      Promise.resolve({
        id: 'cliente-1',
        nome: 'Energisa',
        createdAt: AGORA,
        updatedAt: AGORA,
      }),
    ),
  } as unknown as ClientesService;

  return {
    service: new TransformadoresService(
      clienteService,
      projetoModeloService,
      transformadorRepository,
    ),
    findByNumeroSerie,
    criar,
    atualizar,
    listar,
    buscarOuCriarClientePorNome,
  };
}

describe('lerPayloadDoQr — parser do QR com erro tipado', () => {
  it('should devolver os campos esperados do payload completo', () => {
    const { service } = montarBancada();

    const payload = service.lerPayloadDoQr(payloadQr());

    expect(payload.numeroSerie).toBe('847233');
    expect(payload.patrimonio).toBe('251328');
    expect(payload.cliente).toBe('Energisa');
  });

  it('should recusar payload ilegivel com 422', () => {
    const { service } = montarBancada();

    expect(() => service.lerPayloadDoQr('   ')).toThrow(
      UnprocessableEntityException,
    );
  });

  it('should recusar payload que so traz codigo de lookup', () => {
    const { service } = montarBancada();

    expect(() => service.lerPayloadDoQr('TPD-408136')).toThrow(
      expect.objectContaining({
        response: {
          status: 422,
          errors: {
            payloadQr:
              'payload-somente-codigo: o QR traz apenas um codigo de lookup; ' +
              'digite os campos da etiqueta manualmente ' +
              '(lookup automatico e rodada futura)',
          },
        },
      }),
    );
  });
});

describe('buscarOuCriarPorPayload — chave de negocio e numeroSerie', () => {
  it('should criar a peca quando o numero de serie ainda nao existe', async () => {
    const { service, criar } = montarBancada({ existente: null });

    const resultado = await service.buscarOuCriarPorPayload(
      service.lerPayloadDoQr(payloadQr()),
    );

    expect(criar).toHaveBeenCalledTimes(1);
    expect(criar).toHaveBeenCalledWith(
      expect.objectContaining({ numeroSerie: '847233' }),
    );
    expect(resultado.numeroSerie).toBe('847233');
  });

  it('should reusar a peca existente sem criar outra', async () => {
    const { service, criar, atualizar } = montarBancada({
      existente: peca(),
    });

    const resultado = await service.buscarOuCriarPorPayload(
      service.lerPayloadDoQr(payloadQr()),
    );

    expect(criar).not.toHaveBeenCalled();
    expect(atualizar).not.toHaveBeenCalled();
    expect(resultado.id).toBe('transformador-1');
  });

  it('should nunca usar o patrimonio como chave', async () => {
    // Patrimonio e numeracao do CLIENTE (unico por cliente, nao globalmente):
    // duas pecas de clientes diferentes podem repeti-lo. So numeroSerie casa.
    const { service, findByNumeroSerie } = montarBancada({ existente: peca() });

    await service.buscarOuCriarPorPayload(service.lerPayloadDoQr(payloadQr()));

    expect(findByNumeroSerie).toHaveBeenCalledWith('847233');
  });

  it('should atualizar o registro quando o QR traz dado diferente', async () => {
    // O QR e a fonte da verdade (SPEC, constraint 5).
    const { service, atualizar } = montarBancada({ existente: peca() });

    const resultado = await service.buscarOuCriarPorPayload(
      service.lerPayloadDoQr(payloadQr({ cliente: 'CEMIG' })),
    );

    expect(atualizar).toHaveBeenCalledWith('transformador-1', {
      cliente: 'CEMIG',
      // Cliente novo no QR realinha o vinculo com o cadastro.
      clienteVinculado: expect.objectContaining({ id: 'cliente-1' }),
    });
    expect(resultado.cliente).toBe('CEMIG');
  });

  it('should vincular o cadastro de cliente pelo texto do QR ao criar a peca', async () => {
    const { service, criar, buscarOuCriarClientePorNome } = montarBancada({
      existente: null,
    });

    await service.buscarOuCriarPorPayload(service.lerPayloadDoQr(payloadQr()));

    expect(buscarOuCriarClientePorNome).toHaveBeenCalledWith('Energisa');
    expect(criar).toHaveBeenCalledWith(
      expect.objectContaining({
        clienteVinculado: expect.objectContaining({ id: 'cliente-1' }),
      }),
    );
  });

  it('should criar sem vinculo quando a etiqueta nao traz cliente', async () => {
    // Ausencia nao e afirmacao: sem cliente no payload, nenhum cadastro nasce.
    const { service, criar, buscarOuCriarClientePorNome } = montarBancada({
      existente: null,
    });

    await service.buscarOuCriarPorPayload(
      service.lerPayloadDoQr(
        JSON.stringify({ numeroSerie: '847233', patrimonio: '251328' }),
      ),
    );

    expect(buscarOuCriarClientePorNome).not.toHaveBeenCalled();
    expect(criar).toHaveBeenCalledWith(
      expect.objectContaining({ numeroSerie: '847233' }),
    );
  });

  it('should sobreviver a corrida de unique violation relendo a peca', async () => {
    // Dois celulares escaneando a mesma peca ao mesmo tempo: o insert perde a
    // corrida e o vencedor e relido, em vez de estourar 500.
    const bancada = montarBancada({
      existente: null,
      erroAoCriar: { code: '23505' },
    });
    bancada.findByNumeroSerie
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(peca({ id: 'transformador-concorrente' }));

    const resultado = await bancada.service.buscarOuCriarPorPayload(
      bancada.service.lerPayloadDoQr(payloadQr()),
    );

    expect(resultado.id).toBe('transformador-concorrente');
  });

  it('should aceitar a peca ja resolvida sem consultar o banco de novo', async () => {
    const { service, findByNumeroSerie, criar } = montarBancada();

    const resultado = await service.buscarOuCriarPorPayload(
      service.lerPayloadDoQr(payloadQr()),
      peca({ id: 'transformador-preresolvido' }),
    );

    expect(findByNumeroSerie).not.toHaveBeenCalled();
    expect(criar).not.toHaveBeenCalled();
    expect(resultado.id).toBe('transformador-preresolvido');
  });
});

describe('findAllWithPagination — filtros da listagem (gap 4)', () => {
  it('should repassar numeroSerie e pedido ao repositorio', async () => {
    const { service, listar } = montarBancada();

    await service.findAllWithPagination({
      filterOptions: { numeroSerie: '847233', pedido: '408136' },
      paginationOptions: { page: 1, limit: 10 },
    });

    expect(listar).toHaveBeenCalledWith({
      filterOptions: { numeroSerie: '847233', pedido: '408136' },
      paginationOptions: { page: 1, limit: 10 },
    });
  });

  it('should manter a listagem paginada quando nao ha filtro', async () => {
    const { service, listar } = montarBancada();

    await service.findAllWithPagination({
      paginationOptions: { page: 2, limit: 25 },
    });

    expect(listar).toHaveBeenCalledWith({
      filterOptions: undefined,
      paginationOptions: { page: 2, limit: 25 },
    });
  });
});
