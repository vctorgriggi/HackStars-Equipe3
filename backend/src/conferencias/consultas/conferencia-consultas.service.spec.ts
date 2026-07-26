import { NotFoundException } from '@nestjs/common';
import { instanceToPlain } from 'class-transformer';

import { CampoConferido } from '../../campos-conferidos/domain/campo-conferido';
import { CampoConferidoRepository } from '../../campos-conferidos/infrastructure/persistence/campo-conferido.repository';
import { Checkpoint } from '../../checkpoints/domain/checkpoint';
import { FotoEvidencia } from '../../fotos-evidencia/domain/foto-evidencia';
import { ProjetoModelo } from '../../projetos-modelo/domain/projeto-modelo';
import { Transformador } from '../../transformadores/domain/transformador';

import { Conferencia } from '../domain/conferencia';
import { ConferenciaRepository } from '../infrastructure/persistence/conferencia.repository';
import { ConferenciaConsultasService } from './conferencia-consultas.service';

// Nota de lint: a regra `no-restricted-syntax` do projeto exige que todo `it`
// comece com "should"; o restante da frase segue o vocabulario de dominio.
//
// RELEITURA do veredito (GET /conferencias/:id/campos): o veredito campo a
// campo so existia na resposta do POST, entao um refresh perdia a tela. O que
// esta suite fixa e que a releitura remonta o shape completo, traz a evidencia
// de cada campo (criterio 1 do SPEC), ordena pela checklist e NAO inventa nada
// que o banco nao guarda.

const AGORA = new Date('2026-07-25T12:00:00.000Z');

const CHECKLIST_DEMO = [
  { campo: 'serie-chumbada-topo', fonteFisica: 'topo', obrigatorio: true },
  {
    campo: 'cliente-serigrafia-frente',
    fonteFisica: 'frente',
    obrigatorio: false,
  },
  { campo: 'serie-placa', fonteFisica: 'placa', obrigatorio: true },
];

function projeto(checklist: unknown = CHECKLIST_DEMO): ProjetoModelo {
  return {
    id: 'projeto-1',
    codigo: 'EPT-163-PI-676',
    descricao: null,
    checklist:
      typeof checklist === 'string' ? checklist : JSON.stringify(checklist),
    createdAt: AGORA,
    updatedAt: AGORA,
  };
}

function peca(projetoModelo: ProjetoModelo | null = projeto()): Transformador {
  return {
    id: 'transformador-1',
    numeroSerie: '847233',
    patrimonio: '251328',
    cliente: 'Energisa',
    projetoModelo,
    createdAt: AGORA,
    updatedAt: AGORA,
  } as Transformador;
}

function etapa(): Checkpoint {
  return {
    id: 'checkpoint-1',
    codigo: 'fixacao-placa',
    nome: 'Fixacao da placa',
    ordem: 4,
    createdAt: AGORA,
    updatedAt: AGORA,
  };
}

function conferencia(overrides: Partial<Conferencia> = {}): Conferencia {
  return {
    id: 'conferencia-1',
    vereditoGeral: 'divergente',
    observacao: null,
    checkpoint: etapa(),
    transformador: peca(),
    createdAt: AGORA,
    updatedAt: AGORA,
    ...overrides,
  } as Conferencia;
}

function foto(id: string, fonteFisica: string): FotoEvidencia {
  return {
    id,
    url: '/api/v1/files/foto.jpg',
    fonteFisica,
    createdAt: AGORA,
    updatedAt: AGORA,
  } as FotoEvidencia;
}

function campo(
  nomeCampo: string,
  overrides: Partial<CampoConferido> = {},
): CampoConferido {
  return {
    id: `campo-${nomeCampo}`,
    nomeCampo,
    valorEsperado: '847233',
    valorLido: '847233',
    confianca: 0.99,
    veredito: 'conforme',
    regiaoLeitura: null,
    fotoEvidencia: null,
    createdAt: AGORA,
    updatedAt: AGORA,
    ...overrides,
  } as CampoConferido;
}

function montar({
  conferenciaEncontrada = conferencia(),
  campos = [] as CampoConferido[],
}: {
  conferenciaEncontrada?: Conferencia | null;
  campos?: CampoConferido[];
} = {}) {
  const conferenciaRepository = {
    findById: jest.fn().mockResolvedValue(conferenciaEncontrada),
  } as unknown as ConferenciaRepository;

  const campoConferidoRepository = {
    findByConferencia: jest.fn().mockResolvedValue(campos),
  } as unknown as CampoConferidoRepository;

  return {
    service: new ConferenciaConsultasService(
      conferenciaRepository,
      campoConferidoRepository,
    ),
    conferenciaRepository,
    campoConferidoRepository,
  };
}

describe('ConferenciaConsultasService.vereditoPorConferencia', () => {
  it('should remontar a tela de veredito inteira a partir do id', async () => {
    const { service } = montar({
      campos: [
        campo('serie-placa', {
          valorLido: '847833',
          veredito: 'divergente',
          confianca: 0.998,
          regiaoLeitura: '{"left":0.1}',
          fotoEvidencia: foto('foto-placa', 'placa'),
        }),
      ],
    });

    const resposta = await service.vereditoPorConferencia('conferencia-1');

    expect(resposta.conferencia).toEqual({
      id: 'conferencia-1',
      vereditoGeral: 'divergente',
      createdAt: AGORA,
      observacao: null,
      checkpoint: {
        codigo: 'fixacao-placa',
        nome: 'Fixacao da placa',
        ordem: 4,
      },
    });
    expect(resposta.transformador).toEqual({
      id: 'transformador-1',
      numeroSerie: '847233',
      patrimonio: '251328',
      cliente: 'Energisa',
    });
    expect(resposta.campos).toHaveLength(1);
    expect(resposta.campos[0]).toEqual({
      id: 'campo-serie-placa',
      campo: 'serie-placa',
      // Nao persistidos em CampoConferido: voltam da checklist do projeto.
      fonteFisica: 'placa',
      obrigatorio: true,
      valorEsperado: '847233',
      valorLido: '847833',
      confianca: 0.998,
      veredito: 'divergente',
      regiaoLeitura: '{"left":0.1}',
      fotoEvidencia: expect.objectContaining({
        id: 'foto-placa',
        fonteFisica: 'placa',
      }),
    });
  });

  it('should devolver fotoEvidencia null no campo sem evidencia', async () => {
    const { service } = montar({
      campos: [
        campo('serie-chumbada-topo', {
          valorLido: null,
          confianca: null,
          veredito: 'nao_conferivel',
          fotoEvidencia: null,
        }),
      ],
    });

    const resposta = await service.vereditoPorConferencia('conferencia-1');

    expect(resposta.campos[0].fotoEvidencia).toBeNull();
    expect(resposta.campos[0].veredito).toBe('nao_conferivel');
    expect(resposta.campos[0].valorLido).toBeNull();
  });

  it('should entregar a url da evidencia PRONTA na serializacao', async () => {
    // O front recebe o JSON serializado, nao o objeto do service: e ai que
    // `@TransformUrlEvidencia` roda. Objeto literal no lugar da instancia
    // devolveria a key crua do bucket sob s3 — foto que nao abre, criterio 1
    // do SPEC quebrado no ambiente da demo.
    const anterior = {
      driver: process.env.FILE_DRIVER,
      dominio: process.env.BACKEND_DOMAIN,
    };
    process.env.FILE_DRIVER = 'local';
    process.env.BACKEND_DOMAIN = 'http://localhost:3001';

    try {
      const { service } = montar({
        campos: [
          campo('serie-placa', { fotoEvidencia: foto('foto-placa', 'placa') }),
        ],
      });

      const resposta = await service.vereditoPorConferencia('conferencia-1');
      const serializado = instanceToPlain(resposta) as {
        campos: { fotoEvidencia: { url: string } }[];
      };

      expect(serializado.campos[0].fotoEvidencia.url).toBe(
        'http://localhost:3001/api/v1/files/foto.jpg',
      );
    } finally {
      process.env.FILE_DRIVER = anterior.driver;
      process.env.BACKEND_DOMAIN = anterior.dominio;
    }
  });

  it('should ordenar os campos pela checklist, nao pela ordem do banco', async () => {
    const { service } = montar({
      campos: [
        campo('serie-placa'),
        campo('serie-chumbada-topo'),
        campo('cliente-serigrafia-frente'),
      ],
    });

    const resposta = await service.vereditoPorConferencia('conferencia-1');

    expect(resposta.campos.map((atual) => atual.campo)).toEqual([
      'serie-chumbada-topo',
      'cliente-serigrafia-frente',
      'serie-placa',
    ]);
  });

  it('should manter a ordem do banco para campo fora da checklist, no fim', async () => {
    const { service } = montar({
      campos: [
        campo('campo-aposentado-b'),
        campo('serie-placa'),
        campo('campo-aposentado-a'),
      ],
    });

    const resposta = await service.vereditoPorConferencia('conferencia-1');

    expect(resposta.campos.map((atual) => atual.campo)).toEqual([
      'serie-placa',
      'campo-aposentado-b',
      'campo-aposentado-a',
    ]);
  });

  it('should degradar para null sem derrubar a tela quando a checklist esta ilegivel', async () => {
    // Checklist quebrada nao pode impedir a leitura de um veredito ja emitido:
    // a tela que mostra a nao conformidade e justamente a que nao pode cair.
    const { service } = montar({
      conferenciaEncontrada: conferencia({
        transformador: peca(projeto('{ nao e json')),
      }),
      campos: [campo('serie-placa')],
    });

    const resposta = await service.vereditoPorConferencia('conferencia-1');

    expect(resposta.campos[0].fonteFisica).toBeNull();
    expect(resposta.campos[0].obrigatorio).toBeNull();
    expect(resposta.campos[0].veredito).toBe('conforme');
  });

  it('should degradar para null quando a peca nao tem projeto vinculado', async () => {
    const { service } = montar({
      conferenciaEncontrada: conferencia({ transformador: peca(null) }),
      campos: [campo('serie-placa')],
    });

    const resposta = await service.vereditoPorConferencia('conferencia-1');

    expect(resposta.campos[0].fonteFisica).toBeNull();
    expect(resposta.campos[0].obrigatorio).toBeNull();
  });

  it('should devolver lista vazia, nao 404, para conferencia sem campos', async () => {
    const { service } = montar({ campos: [] });

    const resposta = await service.vereditoPorConferencia('conferencia-1');

    expect(resposta.campos).toEqual([]);
    expect(resposta.conferencia.id).toBe('conferencia-1');
  });

  it('should responder 404 conferencia-inexistente em vez de lista vazia', async () => {
    // Id errado devolvendo `campos: []` passaria por "conferencia sem nenhuma
    // divergencia" — o falso OK que a regra de ouro proibe.
    const { service, campoConferidoRepository } = montar({
      conferenciaEncontrada: null,
    });

    await expect(
      service.vereditoPorConferencia('nao-existe'),
    ).rejects.toBeInstanceOf(NotFoundException);

    await expect(
      service.vereditoPorConferencia('nao-existe'),
    ).rejects.toMatchObject({
      response: {
        errors: { conferencia: 'conferencia-inexistente: nao-existe' },
      },
    });

    expect(campoConferidoRepository.findByConferencia).not.toHaveBeenCalled();
  });

  it('should pedir ao repositorio apenas os campos daquela conferencia', async () => {
    const { service, campoConferidoRepository } = montar({ campos: [] });

    await service.vereditoPorConferencia('conferencia-1');

    expect(campoConferidoRepository.findByConferencia).toHaveBeenCalledWith({
      conferenciaId: 'conferencia-1',
    });
  });

  it('should aceitar conferencia sem checkpoint', async () => {
    const { service } = montar({
      conferenciaEncontrada: conferencia({ checkpoint: null }),
      campos: [],
    });

    const resposta = await service.vereditoPorConferencia('conferencia-1');

    expect(resposta.conferencia.checkpoint).toBeNull();
  });
});
