import { NotFoundException } from '@nestjs/common';

import { Checkpoint } from '../../checkpoints/domain/checkpoint';
import { Conferencia } from '../../conferencias/domain/conferencia';
import { ConferenciaRepository } from '../../conferencias/infrastructure/persistence/conferencia.repository';
import { Passagem } from '../../passagens/domain/passagem';
import { PassagemRepository } from '../../passagens/infrastructure/persistence/passagem.repository';

import { Transformador } from '../domain/transformador';
import { TransformadorRepository } from '../infrastructure/persistence/transformador.repository';
import { TransformadorConsultasService } from './transformador-consultas.service';

// Nota de lint: a regra `no-restricted-syntax` do projeto exige que todo `it`
// comece com "should"; o restante da frase segue o vocabulario de dominio.
//
// Leituras centradas na peca (criterios 5 e 6 do SPEC): historico de transito
// em ordem cronologica e conferencias da mais recente para a mais antiga. A
// ORDEM e contrato do repositorio; o que esta suite fixa e que o service pede
// a consulta certa, recorta o payload (gap 3) e nao inventa dado nenhum.

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

function peca(): Transformador {
  return {
    id: 'transformador-1',
    numeroSerie: '847233',
    patrimonio: '251328',
    cliente: 'Energisa',
    createdAt: AGORA,
    updatedAt: AGORA,
  } as Transformador;
}

function passagem(
  id: string,
  etapa: Checkpoint,
  minutos: number,
  observacao: string | null = null,
): Passagem {
  return {
    id,
    checkpoint: etapa,
    transformador: peca(),
    observacao,
    createdAt: new Date(AGORA.getTime() + minutos * 60_000),
    updatedAt: AGORA,
  } as Passagem;
}

function conferencia(
  id: string,
  veredito: string,
  etapa: Checkpoint | null,
  minutos: number,
): Conferencia {
  return {
    id,
    vereditoGeral: veredito,
    checkpoint: etapa,
    transformador: peca(),
    createdAt: new Date(AGORA.getTime() + minutos * 60_000),
    updatedAt: AGORA,
  } as Conferencia;
}

interface Bancada {
  service: TransformadorConsultasService;
  listarPassagens: jest.Mock;
  listarConferencias: jest.Mock;
}

function montarBancada(
  opcoes: {
    pecaExiste?: boolean;
    passagens?: Passagem[];
    conferencias?: Conferencia[];
  } = {},
): Bancada {
  const transformadorRepository = {
    findById: jest.fn(() =>
      Promise.resolve(opcoes.pecaExiste === false ? null : peca()),
    ),
  } as unknown as TransformadorRepository;

  const listarPassagens = jest.fn(() =>
    Promise.resolve(opcoes.passagens ?? []),
  );
  const passagemRepository = {
    findAllByTransformador: listarPassagens,
  } as unknown as PassagemRepository;

  const listarConferencias = jest.fn(() =>
    Promise.resolve(opcoes.conferencias ?? []),
  );
  const conferenciaRepository = {
    findAllByTransformador: listarConferencias,
  } as unknown as ConferenciaRepository;

  return {
    service: new TransformadorConsultasService(
      transformadorRepository,
      passagemRepository,
      conferenciaRepository,
    ),
    listarPassagens,
    listarConferencias,
  };
}

describe('historicoDePassagens — criterio 5 do SPEC', () => {
  it('should listar os eventos na ordem cronologica recebida do repositorio', async () => {
    const { service } = montarBancada({
      passagens: [
        passagem('passagem-1', checkpoint('adesivacao', 1), 0),
        passagem('passagem-2', checkpoint('serigrafia', 2), 30),
        // Scan repetido na mesma etapa: evento distinto, nao sobrescreve.
        passagem('passagem-3', checkpoint('serigrafia', 2), 45),
      ],
    });

    const historico = await service.historicoDePassagens({
      transformadorId: 'transformador-1',
      paginationOptions: { page: 1, limit: 10 },
    });

    expect(historico.map((evento) => evento.id)).toEqual([
      'passagem-1',
      'passagem-2',
      'passagem-3',
    ]);
    const instantes = historico.map((evento) => evento.createdAt.getTime());
    expect(instantes[0]).toBeLessThan(instantes[1]);
    expect(instantes[1]).toBeLessThan(instantes[2]);
  });

  it('should devolver etapa e observacao de cada evento, sem a peca inteira', async () => {
    // gap 3: as relacoes geradas sao eager; a resposta e recortada de proposito.
    const { service } = montarBancada({
      passagens: [
        passagem(
          'passagem-1',
          checkpoint('oleo-conferencia', 3),
          0,
          'parou por erro aceito pelo time',
        ),
      ],
    });

    const [evento] = await service.historicoDePassagens({
      transformadorId: 'transformador-1',
      paginationOptions: { page: 1, limit: 10 },
    });

    expect(evento).toEqual({
      id: 'passagem-1',
      createdAt: AGORA,
      observacao: 'parou por erro aceito pelo time',
      checkpoint: {
        codigo: 'oleo-conferencia',
        nome: 'oleo-conferencia',
        ordem: 3,
      },
    });
    expect(evento).not.toHaveProperty('transformador');
  });

  it('should repassar a paginacao ao repositorio', async () => {
    const { service, listarPassagens } = montarBancada();

    await service.historicoDePassagens({
      transformadorId: 'transformador-1',
      paginationOptions: { page: 2, limit: 25 },
    });

    expect(listarPassagens).toHaveBeenCalledWith({
      transformadorId: 'transformador-1',
      paginationOptions: { page: 2, limit: 25 },
    });
  });

  it('should acusar peca inexistente em vez de devolver historico vazio', async () => {
    // Id errado devolvendo [] passaria por "peca que nunca passou por lugar
    // nenhum" — silencio perigoso numa tela de rastreabilidade.
    const { service, listarPassagens } = montarBancada({ pecaExiste: false });

    await expect(
      service.historicoDePassagens({
        transformadorId: 'nao-existe',
        paginationOptions: { page: 1, limit: 10 },
      }),
    ).rejects.toBeInstanceOf(NotFoundException);

    expect(listarPassagens).not.toHaveBeenCalled();
  });
});

describe('historicoDeConferencias — fonte do alerta (criterio 6)', () => {
  it('should devolver o veredito como a engine gravou, com a etapa', async () => {
    const { service } = montarBancada({
      conferencias: [
        conferencia(
          'conferencia-2',
          'divergente',
          checkpoint('fixacao-placa', 4),
          60,
        ),
        conferencia(
          'conferencia-1',
          'conforme',
          checkpoint('serigrafia', 2),
          10,
        ),
      ],
    });

    const historico = await service.historicoDeConferencias({
      transformadorId: 'transformador-1',
      limit: 10,
    });

    expect(historico[0]).toEqual({
      id: 'conferencia-2',
      vereditoGeral: 'divergente',
      createdAt: new Date(AGORA.getTime() + 60 * 60_000),
      checkpoint: { codigo: 'fixacao-placa', nome: 'fixacao-placa' },
    });
    expect(historico[1].vereditoGeral).toBe('conforme');
  });

  it('should aceitar conferencia sem etapa fixada', async () => {
    const { service } = montarBancada({
      conferencias: [conferencia('conferencia-1', 'nao_conferivel', null, 0)],
    });

    const [resumo] = await service.historicoDeConferencias({
      transformadorId: 'transformador-1',
      limit: 10,
    });

    expect(resumo.checkpoint).toBeNull();
    expect(resumo.vereditoGeral).toBe('nao_conferivel');
  });

  it('should repassar o limite ao repositorio', async () => {
    const { service, listarConferencias } = montarBancada();

    await service.historicoDeConferencias({
      transformadorId: 'transformador-1',
      limit: 1,
    });

    expect(listarConferencias).toHaveBeenCalledWith({
      transformadorId: 'transformador-1',
      limit: 1,
    });
  });

  it('should acusar peca inexistente', async () => {
    const { service, listarConferencias } = montarBancada({
      pecaExiste: false,
    });

    await expect(
      service.historicoDeConferencias({
        transformadorId: 'nao-existe',
        limit: 10,
      }),
    ).rejects.toBeInstanceOf(NotFoundException);

    expect(listarConferencias).not.toHaveBeenCalled();
  });
});
