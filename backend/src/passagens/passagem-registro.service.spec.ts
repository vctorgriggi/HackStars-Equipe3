import { UnprocessableEntityException } from '@nestjs/common';

import { Checkpoint } from '../checkpoints/domain/checkpoint';
import { CheckpointsService } from '../checkpoints/checkpoints.service';
import { Conferencia } from '../conferencias/domain/conferencia';
import { ConferenciaRepository } from '../conferencias/infrastructure/persistence/conferencia.repository';
import { ProjetosModeloService } from '../projetos-modelo/projetos-modelo.service';
import { Transformador } from '../transformadores/domain/transformador';
import { TransformadorRepository } from '../transformadores/infrastructure/persistence/transformador.repository';
import { ClientesService } from '../clientes/clientes.service';
import { TransformadoresService } from '../transformadores/transformadores.service';

import { AnuncioPassagemService } from '../tempo-real/anuncio-passagem.service';

import { PassagemRegistroService } from './passagem-registro.service';
import { Passagem } from './domain/passagem';
import { PassagemRepository } from './infrastructure/persistence/passagem.repository';

// Nota de lint: a regra `no-restricted-syntax` do projeto exige que todo `it`
// comece com "should"; o restante da frase segue o vocabulario de dominio.
//
// T4.1: o scan do QR em um checkpoint. O que esta suite protege:
//   - os 422 (QR ilegivel, etapa desconhecida) saem ANTES de qualquer escrita;
//   - a peca e resolvida por find-or-create pela chave de negocio;
//   - `ultimaConferencia` (criterio 6 do SPEC) e LEITURA do que a engine
//     gravou — o registro de passagem nao compara nem deriva veredito;
//   - scans repetidos na mesma etapa geram eventos distintos.
// Nada aqui toca banco: todos os colaboradores entram dublados.

const AGORA = new Date('2026-07-25T12:00:00.000Z');

function checkpoint(codigo: string, ordem: number): Checkpoint {
  return {
    id: `checkpoint-${codigo}`,
    codigo,
    nome: codigo,
    ordem,
    createdAt: AGORA,
    updatedAt: AGORA,
  };
}

/** Seed real da linha TRAEL. */
const CHECKPOINTS = [
  checkpoint('adesivacao', 1),
  checkpoint('serigrafia', 2),
  checkpoint('oleo-conferencia', 3),
  checkpoint('fixacao-placa', 4),
];

function peca(): Transformador {
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

function conferencia(veredito: string, etapa?: Checkpoint): Conferencia {
  return {
    id: 'conferencia-1',
    vereditoGeral: veredito,
    checkpoint: etapa ?? null,
    transformador: peca(),
    createdAt: new Date('2026-07-25T11:00:00.000Z'),
    updatedAt: AGORA,
  } as Conferencia;
}

interface Bancada {
  service: PassagemRegistroService;
  buscarOuCriar: jest.SpyInstance;
  criarPassagem: jest.Mock;
  ultimasConferencias: jest.Mock;
  buscarConferencia: jest.Mock;
  anunciar: jest.Mock;
}

function montarBancada(
  opcoes: {
    conferencias?: Conferencia[];
    /** Onde a peca estava ANTES do scan (ultima passagem existente). */
    ultimaPassagemEm?: Checkpoint;
    /** O que `conferenciaRepository.findById` devolve para o vinculo. */
    conferenciaVinculavel?: Conferencia | null;
  } = {},
): Bancada {
  const checkpointService = {
    findByCodigo: jest.fn((codigo: string) =>
      Promise.resolve(
        CHECKPOINTS.find((atual) => atual.codigo === codigo) ?? null,
      ),
    ),
  } as unknown as CheckpointsService;

  // Service REAL com repositorio dublado: o parser do QR (e portanto o 422 de
  // payload) e exatamente o mesmo que o endpoint de conferencia usa. So o
  // find-or-create vira espiao, porque tem suite propria.
  const transformadorService = new TransformadoresService(
    {
      buscarOuCriarPorNome: jest.fn((nome: string) =>
        Promise.resolve({ id: 'cliente-1', nome }),
      ),
      findById: jest.fn(() => Promise.resolve({ id: 'cliente-1' })),
    } as unknown as ClientesService,
    { findById: jest.fn() } as unknown as ProjetosModeloService,
    {
      findByNumeroSerie: jest.fn(() => Promise.resolve(null)),
    } as unknown as TransformadorRepository,
  );
  const buscarOuCriar = jest
    .spyOn(transformadorService, 'buscarOuCriarPorPayload')
    .mockResolvedValue(peca());

  let sequencia = 0;
  const criarPassagem = jest.fn((dados: Record<string, unknown>) => {
    sequencia += 1;
    return Promise.resolve({
      ...dados,
      id: `passagem-${sequencia}`,
      createdAt: new Date(AGORA.getTime() + sequencia * 1000),
      updatedAt: AGORA,
    });
  });
  const passagemRepository = {
    create: criarPassagem,
    findUltimaPorTransformadores: jest.fn(() =>
      Promise.resolve(
        opcoes.ultimaPassagemEm
          ? new Map<string, Passagem>([
              [peca().id, { checkpoint: opcoes.ultimaPassagemEm } as Passagem],
            ])
          : new Map<string, Passagem>(),
      ),
    ),
  } as unknown as PassagemRepository;

  const ultimasConferencias = jest.fn(() =>
    Promise.resolve(opcoes.conferencias ?? []),
  );
  const buscarConferencia = jest.fn(() =>
    Promise.resolve(opcoes.conferenciaVinculavel ?? null),
  );
  const conferenciaRepository = {
    findAllByTransformador: ultimasConferencias,
    findById: buscarConferencia,
  } as unknown as ConferenciaRepository;

  const anunciar = jest.fn(() => Promise.resolve());
  const anuncioPassagem = {
    anunciar,
  } as unknown as AnuncioPassagemService;

  return {
    service: new PassagemRegistroService(
      checkpointService,
      transformadorService,
      passagemRepository,
      conferenciaRepository,
      anuncioPassagem,
    ),
    buscarOuCriar,
    criarPassagem,
    ultimasConferencias,
    buscarConferencia,
    anunciar,
  };
}

describe('registrar — 422 barato, antes de escrever', () => {
  it('should recusar etapa inexistente sem criar passagem nem peca', async () => {
    // Caso real: '?etapa=Serigrafia' com S maiusculo digitado na URL.
    const { service, buscarOuCriar, criarPassagem, anunciar } = montarBancada();

    await expect(
      service.registrar({
        payloadQr: payloadQr(),
        etapaCodigo: 'Serigrafia',
      }),
    ).rejects.toMatchObject({
      response: { errors: { etapaCodigo: 'etapa-desconhecida: Serigrafia' } },
    });

    expect(buscarOuCriar).not.toHaveBeenCalled();
    expect(criarPassagem).not.toHaveBeenCalled();
    // O tempo real so anuncia o que FOI gravado: 422 nao vira evento.
    expect(anunciar).not.toHaveBeenCalled();
  });

  it('should recusar payload de QR ilegivel sem tocar o banco', async () => {
    const { service, buscarOuCriar, criarPassagem, anunciar } = montarBancada();

    await expect(
      service.registrar({ payloadQr: '   ', etapaCodigo: 'serigrafia' }),
    ).rejects.toBeInstanceOf(UnprocessableEntityException);

    expect(buscarOuCriar).not.toHaveBeenCalled();
    expect(criarPassagem).not.toHaveBeenCalled();
    expect(anunciar).not.toHaveBeenCalled();
  });

  it('should recusar payload que so traz codigo de lookup', async () => {
    const { service, criarPassagem, anunciar } = montarBancada();

    await expect(
      service.registrar({
        payloadQr: 'TPD-408136',
        etapaCodigo: 'serigrafia',
      }),
    ).rejects.toMatchObject({
      response: {
        errors: {
          payloadQr:
            'payload-somente-codigo: o QR traz apenas um codigo de lookup; ' +
            'digite os campos da etiqueta manualmente ' +
            '(lookup automatico e rodada futura)',
        },
      },
    });

    expect(criarPassagem).not.toHaveBeenCalled();
    expect(anunciar).not.toHaveBeenCalled();
  });
});

describe('registrar — peca resolvida pelo QR', () => {
  it('should registrar a passagem na etapa do dispositivo', async () => {
    const { service, criarPassagem } = montarBancada();

    const resultado = await service.registrar({
      payloadQr: payloadQr(),
      etapaCodigo: 'serigrafia',
    });

    expect(criarPassagem).toHaveBeenCalledTimes(1);
    expect(resultado.checkpoint).toEqual({
      codigo: 'serigrafia',
      nome: 'serigrafia',
      ordem: 2,
    });
    expect(resultado.transformador).toEqual({
      id: 'transformador-1',
      numeroSerie: '847233',
      patrimonio: '251328',
      cliente: 'Energisa',
    });
    expect(resultado.passagem.id).toBe('passagem-1');
    expect(resultado.passagem.observacao).toBeNull();
  });

  it('should delegar o find-or-create ao dono da chave de negocio', async () => {
    // A peca sai de `numeroSerie` (unico do fabricante), nunca do patrimonio.
    const { service, buscarOuCriar } = montarBancada();

    await service.registrar({
      payloadQr: payloadQr(),
      etapaCodigo: 'adesivacao',
    });

    expect(buscarOuCriar).toHaveBeenCalledWith(
      expect.objectContaining({ numeroSerie: '847233' }),
    );
  });

  it('should gravar a observacao da excecao aceita pelo time', async () => {
    const { service } = montarBancada();

    const resultado = await service.registrar({
      payloadQr: payloadQr(),
      etapaCodigo: 'oleo-conferencia',
      observacao: 'parou por erro aceito pelo time',
    });

    expect(resultado.passagem.observacao).toBe(
      'parou por erro aceito pelo time',
    );
  });

  it('should gerar eventos distintos em scans repetidos na mesma etapa', async () => {
    // Aceitacao da T4.1: repetir o scan nao corrompe o historico.
    const { service, criarPassagem } = montarBancada();

    const primeiro = await service.registrar({
      payloadQr: payloadQr(),
      etapaCodigo: 'serigrafia',
    });
    const segundo = await service.registrar({
      payloadQr: payloadQr(),
      etapaCodigo: 'serigrafia',
    });

    expect(criarPassagem).toHaveBeenCalledTimes(2);
    expect(primeiro.passagem.id).not.toBe(segundo.passagem.id);
    expect(segundo.passagem.createdAt.getTime()).toBeGreaterThan(
      primeiro.passagem.createdAt.getTime(),
    );
  });
});

describe('registrar — anuncio no canal de tempo real', () => {
  it('should anunciar a passagem com o checkpoint anterior da peca', async () => {
    // Peca que estava na adesivacao e escaneada na serigrafia: o evento leva
    // o `from` server-authoritative da animacao.
    const { service, anunciar } = montarBancada({
      ultimaPassagemEm: CHECKPOINTS[0],
    });

    const resultado = await service.registrar({
      payloadQr: payloadQr(),
      etapaCodigo: 'serigrafia',
    });

    expect(anunciar).toHaveBeenCalledTimes(1);
    expect(anunciar).toHaveBeenCalledWith(resultado, {
      codigo: 'adesivacao',
      nome: 'adesivacao',
      ordem: 1,
    });
  });

  it('should anunciar checkpoint anterior null para peca entrando na linha', async () => {
    const { service, anunciar } = montarBancada();

    const resultado = await service.registrar({
      payloadQr: payloadQr(),
      etapaCodigo: 'adesivacao',
    });

    expect(anunciar).toHaveBeenCalledWith(resultado, null);
  });
});

describe('registrar — ultimaConferencia sustenta o alerta no ato (criterio 6)', () => {
  it('should devolver null quando a peca nunca foi conferida', async () => {
    const { service } = montarBancada({ conferencias: [] });

    const resultado = await service.registrar({
      payloadQr: payloadQr(),
      etapaCodigo: 'adesivacao',
    });

    expect(resultado.ultimaConferencia).toBeNull();
  });

  it('should devolver o veredito divergente com a etapa em que ele saiu', async () => {
    const { service, ultimasConferencias } = montarBancada({
      conferencias: [conferencia('divergente', CHECKPOINTS[3])],
    });

    const resultado = await service.registrar({
      payloadQr: payloadQr(),
      etapaCodigo: 'oleo-conferencia',
    });

    // Uma consulta so, ja limitada: e o veredito VIGENTE, nao o historico.
    expect(ultimasConferencias).toHaveBeenCalledWith({
      transformadorId: 'transformador-1',
      limit: 1,
    });
    expect(resultado.ultimaConferencia).toEqual({
      id: 'conferencia-1',
      vereditoGeral: 'divergente',
      createdAt: new Date('2026-07-25T11:00:00.000Z'),
      checkpoint: { codigo: 'fixacao-placa', nome: 'fixacao-placa' },
    });
  });

  it('should devolver checkpoint null quando a conferencia nao fixou etapa', async () => {
    const { service } = montarBancada({
      conferencias: [conferencia('conforme')],
    });

    const resultado = await service.registrar({
      payloadQr: payloadQr(),
      etapaCodigo: 'adesivacao',
    });

    expect(resultado.ultimaConferencia?.vereditoGeral).toBe('conforme');
    expect(resultado.ultimaConferencia?.checkpoint).toBeNull();
  });
});

describe('registrar — vinculo de comprovacao (gate da estacao)', () => {
  const ID_CONFERENCIA = 'conferencia-1';

  it('should recusar conferenciaId inexistente sem criar passagem', async () => {
    const { service, criarPassagem, anunciar } = montarBancada({
      conferenciaVinculavel: null,
    });

    await expect(
      service.registrar({
        payloadQr: payloadQr(),
        etapaCodigo: 'serigrafia',
        conferenciaId: ID_CONFERENCIA,
      }),
    ).rejects.toMatchObject({
      response: {
        errors: {
          conferenciaId: `conferencia-inexistente: ${ID_CONFERENCIA}`,
        },
      },
    });

    expect(criarPassagem).not.toHaveBeenCalled();
    expect(anunciar).not.toHaveBeenCalled();
  });

  it('should recusar conferencia de outra peca', async () => {
    const deOutraPeca = conferencia('conforme', CHECKPOINTS[1]);
    deOutraPeca.transformador = {
      ...peca(),
      numeroSerie: '999999',
    } as Transformador;

    const { service, criarPassagem } = montarBancada({
      conferenciaVinculavel: deOutraPeca,
    });

    await expect(
      service.registrar({
        payloadQr: payloadQr(),
        etapaCodigo: 'serigrafia',
        conferenciaId: ID_CONFERENCIA,
      }),
    ).rejects.toMatchObject({
      response: {
        errors: {
          conferenciaId: `conferencia-de-outra-peca: ${ID_CONFERENCIA}`,
        },
      },
    });

    expect(criarPassagem).not.toHaveBeenCalled();
  });

  it('should recusar conferencia de outra etapa', async () => {
    const { service, criarPassagem } = montarBancada({
      conferenciaVinculavel: conferencia('conforme', CHECKPOINTS[3]),
    });

    await expect(
      service.registrar({
        payloadQr: payloadQr(),
        etapaCodigo: 'serigrafia',
        conferenciaId: ID_CONFERENCIA,
      }),
    ).rejects.toMatchObject({
      response: {
        errors: {
          conferenciaId: `conferencia-de-outra-etapa: ${ID_CONFERENCIA}`,
        },
      },
    });

    expect(criarPassagem).not.toHaveBeenCalled();
  });

  it('should recusar conferencia sem checkpoint (checklist inteira)', async () => {
    // Passagem e de um GATE: conferencia da peca inteira nao comprova etapa.
    const { service } = montarBancada({
      conferenciaVinculavel: conferencia('conforme'),
    });

    await expect(
      service.registrar({
        payloadQr: payloadQr(),
        etapaCodigo: 'serigrafia',
        conferenciaId: ID_CONFERENCIA,
      }),
    ).rejects.toMatchObject({
      response: {
        errors: {
          conferenciaId: `conferencia-de-outra-etapa: ${ID_CONFERENCIA}`,
        },
      },
    });
  });

  it('should recusar reprova de conferencia nao-conforme sem observacao', async () => {
    // A liberacao com excecao e AUDITAVEL por construcao: sem justificativa,
    // nao passa.
    const { service, criarPassagem, anunciar } = montarBancada({
      conferenciaVinculavel: conferencia('divergente', CHECKPOINTS[1]),
    });

    await expect(
      service.registrar({
        payloadQr: payloadQr(),
        etapaCodigo: 'serigrafia',
        conferenciaId: ID_CONFERENCIA,
      }),
    ).rejects.toMatchObject({
      response: {
        errors: { conferenciaId: 'excecao-sem-observacao' },
      },
    });

    expect(criarPassagem).not.toHaveBeenCalled();
    expect(anunciar).not.toHaveBeenCalled();
  });

  it('should recusar observacao so de espacos como justificativa', async () => {
    const { service } = montarBancada({
      conferenciaVinculavel: conferencia('nao_conferivel', CHECKPOINTS[1]),
    });

    await expect(
      service.registrar({
        payloadQr: payloadQr(),
        etapaCodigo: 'serigrafia',
        conferenciaId: ID_CONFERENCIA,
        observacao: '   ',
      }),
    ).rejects.toMatchObject({
      response: {
        errors: { conferenciaId: 'excecao-sem-observacao' },
      },
    });
  });

  it('should registrar a reprova humana com a excecao anotada e a conferencia vinculada', async () => {
    const divergente = conferencia('divergente', CHECKPOINTS[1]);
    const { service, criarPassagem, ultimasConferencias, anunciar } =
      montarBancada({
        conferenciaVinculavel: divergente,
        // Se o fallback rodasse, devolveria OUTRA conferencia — o teste pega
        // resposta montada da fonte errada.
        conferencias: [conferencia('conforme', CHECKPOINTS[0])],
      });

    const resultado = await service.registrar({
      payloadQr: payloadQr(),
      etapaCodigo: 'serigrafia',
      conferenciaId: ID_CONFERENCIA,
      observacao: 'leitura errada da IA, peca conferida no olho',
    });

    expect(criarPassagem).toHaveBeenCalledWith(
      expect.objectContaining({
        conferencia: divergente,
        observacao: 'leitura errada da IA, peca conferida no olho',
      }),
    );
    // `ultimaConferencia` e a VINCULADA, nao a mais recente da peca.
    expect(ultimasConferencias).not.toHaveBeenCalled();
    expect(resultado.ultimaConferencia).toMatchObject({
      id: ID_CONFERENCIA,
      vereditoGeral: 'divergente',
    });
    expect(anunciar).toHaveBeenCalledTimes(1);
  });

  it('should aceitar conferencia conforme vinculada sem exigir observacao', async () => {
    // Caminho do gate automatico: conforme passa limpo, sem excecao.
    const { service, criarPassagem } = montarBancada({
      conferenciaVinculavel: conferencia('conforme', CHECKPOINTS[1]),
    });

    const resultado = await service.registrar({
      payloadQr: payloadQr(),
      etapaCodigo: 'serigrafia',
      conferenciaId: ID_CONFERENCIA,
    });

    expect(criarPassagem).toHaveBeenCalledTimes(1);
    expect(resultado.ultimaConferencia?.vereditoGeral).toBe('conforme');
    expect(resultado.passagem.observacao).toBeNull();
  });

  it('should manter o fallback da ultima conferencia quando nao ha vinculo', async () => {
    const { service, buscarConferencia, ultimasConferencias } = montarBancada({
      conferencias: [conferencia('divergente', CHECKPOINTS[3])],
    });

    const resultado = await service.registrar({
      payloadQr: payloadQr(),
      etapaCodigo: 'serigrafia',
    });

    expect(buscarConferencia).not.toHaveBeenCalled();
    expect(ultimasConferencias).toHaveBeenCalledTimes(1);
    expect(resultado.ultimaConferencia?.vereditoGeral).toBe('divergente');
  });
});
