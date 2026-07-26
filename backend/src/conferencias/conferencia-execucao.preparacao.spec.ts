import { UnprocessableEntityException } from '@nestjs/common';

import { CamposConferidosService } from '../campos-conferidos/campos-conferidos.service';
import { Checkpoint } from '../checkpoints/domain/checkpoint';
import { CheckpointsService } from '../checkpoints/checkpoints.service';
import { FotoEvidencia } from '../fotos-evidencia/domain/foto-evidencia';
import { FotosEvidenciaService } from '../fotos-evidencia/fotos-evidencia.service';
import { ProjetoModelo } from '../projetos-modelo/domain/projeto-modelo';
import { ProjetosModeloService } from '../projetos-modelo/projetos-modelo.service';
import { Transformador } from '../transformadores/domain/transformador';
import { TransformadoresService } from '../transformadores/transformadores.service';

import { ConferenciaExecucaoService } from './conferencia-execucao.service';
import { FotoDaEvidenciaResposta } from './dto/resumos-compartilhados.dto';
import { ConferenciaRepository } from './infrastructure/persistence/conferencia.repository';

// Nota de lint: a regra `no-restricted-syntax` do projeto exige que todo `it`
// comece com "should"; o restante da frase segue o vocabulario de dominio.
//
// Esta suite cobre a FASE BARATA da execucao (`prepararExecucao`) e a ordem
// entre ela e a primeira escrita — achados 4, 8 e 12 da revisao:
//   4. tudo que da 422 tem de acontecer antes de a visao ser paga;
//   8. `etapa-sem-campos-conferiveis` estourava DEPOIS de criar o
//      Transformador, contradizendo "etapa resolvida antes de qualquer
//      escrita";
//  12. a resolucao de ProjetoModelo tem de ser UMA so (QR -> vinculo da peca
//      -> unico do banco), compartilhada com o fluxo de fotos.
//
// Nada aqui toca banco, AWS ou disco: todos os colaboradores entram dublados.

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

/** Checklist do EPT-163-PI-676 com as etapas do fluxo. */
const CHECKLIST_DEMO = [
  {
    campo: 'serie-chumbada-topo',
    fonteFisica: 'topo',
    obrigatorio: true,
    etapa: 'adesivacao',
  },
  {
    campo: 'patrimonio-serigrafia-frente',
    fonteFisica: 'frente',
    obrigatorio: true,
    etapa: 'serigrafia',
  },
  {
    campo: 'serie-placa',
    fonteFisica: 'placa',
    obrigatorio: true,
    etapa: 'fixacao-placa',
  },
];

function projeto(codigo: string, checklist: unknown = CHECKLIST_DEMO) {
  return {
    id: `projeto-${codigo}`,
    codigo,
    descricao: codigo,
    checklist: JSON.stringify(checklist),
    createdAt: AGORA,
    updatedAt: AGORA,
  } satisfies ProjetoModelo;
}

const PROJETO_DEMO = projeto('EPT-163-PI-676');
const OUTRO_PROJETO = projeto('EPT-999-XX-000');

function payloadQr(extra: Record<string, string> = {}): string {
  return JSON.stringify({
    numeroSerie: '847233',
    patrimonio: '251328',
    cliente: 'Energisa',
    ...extra,
  });
}

function transformador(projetoModelo?: ProjetoModelo): Transformador {
  return {
    id: 'transformador-1',
    numeroSerie: '847233',
    patrimonio: '251328',
    cliente: 'Energisa',
    projetoModelo: projetoModelo ?? null,
    createdAt: AGORA,
    updatedAt: AGORA,
  } as Transformador;
}

/** Registro de evidencia como o banco devolve (url crua, sem assinar). */
function fotoEvidencia(id: string, fonteFisica: string): FotoEvidencia {
  return {
    id,
    url: `${id}.jpg`,
    fonteFisica,
    conferencia: null,
    createdAt: AGORA,
    updatedAt: AGORA,
  };
}

interface Bancada {
  service: ConferenciaExecucaoService;
  criarTransformador: jest.Mock;
  atualizarTransformador: jest.Mock;
  criarConferencia: jest.Mock;
  criarComVeredito: jest.Mock;
  validarEvidenciasDisponiveis: jest.Mock<Promise<void>, [string[]]>;
  findAllProjetos: jest.Mock;
  findByCodigoProjeto: jest.Mock;
  findByIdsEvidencias: jest.Mock<Promise<FotoEvidencia[]>, [string[]]>;
}

function montarBancada(
  opcoes: {
    projetos?: ProjetoModelo[];
    pecaExistente?: Transformador | null;
    validarEvidenciasDisponiveis?: jest.Mock<Promise<void>, [string[]]>;
    evidencias?: FotoEvidencia[];
  } = {},
): Bancada {
  const projetos = opcoes.projetos ?? [PROJETO_DEMO];
  const pecaExistente = opcoes.pecaExistente ?? null;

  const criarTransformador = jest.fn(() => Promise.resolve(transformador()));
  const atualizarTransformador = jest.fn(() =>
    Promise.resolve(transformador(PROJETO_DEMO)),
  );
  // `lerPayloadDoQr` e `buscarOuCriarPorPayload` sao os metodos REAIS do dono
  // da entidade (a execucao delega, nao reimplementa — a copia privada que
  // vivia aqui foi apagada). O duble usa as implementacoes verdadeiras com os
  // colaboradores dublados: e o parser e o find-or-create de producao que
  // rodam nestes testes, incluindo os 422 de payload.
  const transformadorService = {
    findByNumeroSerie: jest.fn(() => Promise.resolve(pecaExistente)),
    create: criarTransformador,
    update: atualizarTransformador,
    // O find-or-create real vincula o cadastro de Cliente pelo texto do QR;
    // aqui o cadastro e dublado (tem suite propria em transformadores).
    clienteService: {
      buscarOuCriarPorNome: jest.fn((nome: string) =>
        Promise.resolve({ id: 'cliente-1', nome }),
      ),
    },
  } as unknown as TransformadoresService;
  const serviceReal = TransformadoresService.prototype;
  transformadorService.lerPayloadDoQr =
    serviceReal.lerPayloadDoQr.bind(transformadorService);
  transformadorService.buscarOuCriarPorPayload =
    serviceReal.buscarOuCriarPorPayload.bind(transformadorService);

  const findAllProjetos = jest.fn(() => Promise.resolve(projetos));
  const findByCodigoProjeto = jest.fn((codigo: string) =>
    Promise.resolve(projetos.find((atual) => atual.codigo === codigo) ?? null),
  );
  const projetoModeloService = {
    findAll: findAllProjetos,
    findByCodigo: findByCodigoProjeto,
  } as unknown as ProjetosModeloService;

  const checkpointService = {
    findByCodigo: jest.fn((codigo: string) =>
      Promise.resolve(
        CHECKPOINTS.find((atual) => atual.codigo === codigo) ?? null,
      ),
    ),
  } as unknown as CheckpointsService;

  const criarComVeredito = jest.fn(() =>
    Promise.resolve({ id: 'campo-conferido-1' }),
  );
  // Recusa barata das evidencias (achado A2): por default nada a recusar; os
  // testes de evidencia emprestada trocam a implementacao.
  const validarEvidenciasDisponiveis =
    opcoes.validarEvidenciasDisponiveis ??
    jest.fn<Promise<void>, [string[]]>(() => Promise.resolve());
  const campoConferidoService = {
    criarComVeredito,
    validarEvidenciasDisponiveis,
  } as unknown as CamposConferidosService;

  const criarConferencia = jest.fn(() =>
    Promise.resolve({ id: 'conferencia-1', createdAt: AGORA }),
  );
  const conferenciaRepository = {
    create: criarConferencia,
  } as unknown as ConferenciaRepository;

  // Evidencias que a RESPOSTA cita (o lastro persistido segue por
  // `criarComVeredito`): leitura pura, um lote so.
  const evidencias = opcoes.evidencias ?? [];
  const findByIdsEvidencias = jest.fn<Promise<FotoEvidencia[]>, [string[]]>(
    (ids) =>
      Promise.resolve(evidencias.filter((foto) => ids.includes(foto.id))),
  );
  const fotosEvidenciaService = {
    findByIds: findByIdsEvidencias,
  } as unknown as FotosEvidenciaService;

  return {
    service: new ConferenciaExecucaoService(
      transformadorService,
      projetoModeloService,
      checkpointService,
      campoConferidoService,
      fotosEvidenciaService,
      conferenciaRepository,
    ),
    criarTransformador,
    atualizarTransformador,
    criarConferencia,
    criarComVeredito,
    validarEvidenciasDisponiveis,
    findAllProjetos,
    findByCodigoProjeto,
    findByIdsEvidencias,
  };
}

describe('prepararExecucao — 422 barato, antes de escrever e antes da visao', () => {
  it('should recusar payload de QR ilegivel sem tocar o banco', async () => {
    const { service, criarTransformador, criarConferencia } = montarBancada();

    await expect(
      service.prepararExecucao({ payloadQr: '   ' }),
    ).rejects.toBeInstanceOf(UnprocessableEntityException);

    expect(criarTransformador).not.toHaveBeenCalled();
    expect(criarConferencia).not.toHaveBeenCalled();
  });

  it('should recusar payload que so traz codigo de lookup', async () => {
    const { service } = montarBancada();

    await expect(
      service.prepararExecucao({ payloadQr: 'TPD-408136' }),
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
  });

  it('should recusar etapa inexistente sem criar transformador', async () => {
    // Caso real: '?etapa=Serigrafia' com S maiusculo digitado na URL.
    const { service, criarTransformador } = montarBancada();

    await expect(
      service.prepararExecucao({
        payloadQr: payloadQr(),
        etapaCodigo: 'Serigrafia',
      }),
    ).rejects.toMatchObject({
      response: { errors: { etapaCodigo: 'etapa-desconhecida: Serigrafia' } },
    });

    expect(criarTransformador).not.toHaveBeenCalled();
  });

  it('should recusar recorte vazio sem criar transformador (achado 8)', async () => {
    // Checklist so com item da ultima etapa: no gate da adesivacao nao sobra
    // nada conferivel. Antes da correcao, o 422 saia DEPOIS do find-or-create.
    const { service, criarTransformador } = montarBancada({
      projetos: [
        projeto('SO-PLACA', [
          {
            campo: 'serie-placa',
            fonteFisica: 'placa',
            obrigatorio: true,
            etapa: 'fixacao-placa',
          },
        ]),
      ],
    });

    await expect(
      service.prepararExecucao({
        payloadQr: payloadQr(),
        etapaCodigo: 'adesivacao',
      }),
    ).rejects.toMatchObject({
      response: {
        errors: {
          etapaCodigo: expect.stringContaining('etapa-sem-campos-conferiveis'),
        },
      },
    });

    expect(criarTransformador).not.toHaveBeenCalled();
  });

  it('should recorte vazio no executar tambem nao deixar transformador orfao', async () => {
    // Mesma garantia pelo caminho publico do endpoint (achado 8).
    const { service, criarTransformador, criarConferencia } = montarBancada({
      projetos: [
        projeto('SO-PLACA', [
          {
            campo: 'serie-placa',
            fonteFisica: 'placa',
            obrigatorio: true,
            etapa: 'fixacao-placa',
          },
        ]),
      ],
    });

    await expect(
      service.executar({
        payloadQr: payloadQr(),
        etapaCodigo: 'adesivacao',
        leituras: [{ campo: 'serie-placa', valorLido: '847233', confianca: 1 }],
      }),
    ).rejects.toBeInstanceOf(UnprocessableEntityException);

    expect(criarTransformador).not.toHaveBeenCalled();
    expect(criarConferencia).not.toHaveBeenCalled();
  });

  it('should recusar projeto indeterminado sem criar transformador', async () => {
    const { service, criarTransformador } = montarBancada({
      projetos: [PROJETO_DEMO, OUTRO_PROJETO],
    });

    await expect(
      service.prepararExecucao({ payloadQr: payloadQr() }),
    ).rejects.toMatchObject({
      response: { errors: { projetoModelo: 'projeto-modelo-indeterminado' } },
    });

    expect(criarTransformador).not.toHaveBeenCalled();
  });
});

describe('prepararExecucao — resolucao UNICA de ProjetoModelo (achado 12)', () => {
  it('should resolver pelo codigo do projeto no QR', async () => {
    const { service } = montarBancada({
      projetos: [PROJETO_DEMO, OUTRO_PROJETO],
    });

    const contexto = await service.prepararExecucao({
      payloadQr: payloadQr({ codigoProjeto: 'EPT-999-XX-000' }),
    });

    expect(contexto.projetoModelo.codigo).toBe('EPT-999-XX-000');
  });

  it('should cair para o vinculo da peca quando o QR nao traz codigo', async () => {
    // Com 2 projetos cadastrados, a regra "unico do banco" nao resolve — e o
    // vinculo da peca que decide. A copia que vivia em conferencia-extracao
    // nao tinha este criterio e dava 422 aqui (achado 12).
    const { service, findAllProjetos } = montarBancada({
      projetos: [PROJETO_DEMO, OUTRO_PROJETO],
      pecaExistente: transformador(OUTRO_PROJETO),
    });

    const contexto = await service.prepararExecucao({
      payloadQr: payloadQr(),
    });

    expect(contexto.projetoModelo.codigo).toBe('EPT-999-XX-000');
    expect(findAllProjetos).not.toHaveBeenCalled();
  });

  it('should cair para o unico projeto do banco quando nao ha codigo nem vinculo', async () => {
    const { service } = montarBancada();

    const contexto = await service.prepararExecucao({
      payloadQr: payloadQr(),
    });

    expect(contexto.projetoModelo.codigo).toBe('EPT-163-PI-676');
    expect(contexto.transformadorExistente).toBeNull();
  });

  it('should devolver a checklist ja recortada pela etapa', async () => {
    const { service } = montarBancada();

    const contexto = await service.prepararExecucao({
      payloadQr: payloadQr(),
      etapaCodigo: 'serigrafia',
    });

    // Cumulativo: adesivacao + serigrafia; a placa ainda nem existe na peca.
    expect(contexto.checklist.map((item) => item.campo)).toEqual([
      'serie-chumbada-topo',
      'patrimonio-serigrafia-frente',
    ]);
    expect(contexto.checkpoint?.codigo).toBe('serigrafia');
  });
});

describe('executar — nada e gravado sem campo avaliado (achado A1)', () => {
  // Checklist SO com opcional sem valor esperado no QR: o recorte nao e vazio
  // (a guarda antiga media a lista de ENTRADA e deixava passar), mas a engine
  // omite o item e devolve `campos: []`. Antes, isso virava conferencia
  // gravada com veredito `conforme` e zero campo — o falso OK perfeito.
  const SO_OPCIONAL = [
    projeto('SO-OPCIONAL', [
      {
        campo: 'potencia-serigrafia-frente',
        fonteFisica: 'frente',
        obrigatorio: false,
      },
    ]),
  ];

  it('should recusar com 422 quando nenhum item da checklist e avaliavel', async () => {
    const { service } = montarBancada({ projetos: SO_OPCIONAL });

    await expect(
      service.executar({
        payloadQr: payloadQr(),
        leituras: [
          {
            campo: 'potencia-serigrafia-frente',
            valorLido: '10 kVA',
            confianca: 0.99,
          },
        ],
      }),
    ).rejects.toMatchObject({
      response: {
        errors: {
          checklist: expect.stringContaining('checklist-sem-campo-avaliavel'),
        },
      },
    });
  });

  it('should nao deixar transformador nem conferencia para tras', async () => {
    const { service, criarTransformador, criarConferencia, criarComVeredito } =
      montarBancada({ projetos: SO_OPCIONAL });

    await expect(
      service.executar({
        payloadQr: payloadQr(),
        leituras: [
          {
            campo: 'potencia-serigrafia-frente',
            valorLido: '10 kVA',
            confianca: 0.99,
          },
        ],
      }),
    ).rejects.toBeInstanceOf(UnprocessableEntityException);

    expect(criarTransformador).not.toHaveBeenCalled();
    expect(criarConferencia).not.toHaveBeenCalled();
    expect(criarComVeredito).not.toHaveBeenCalled();
  });
});

describe('executar — evidencia emprestada recusada antes da escrita (achado A2)', () => {
  function leituraComFoto(fotoEvidenciaId: string) {
    return {
      campo: 'serie-chumbada-topo',
      valorLido: '847233',
      confianca: 0.99,
      fotoEvidenciaId,
    };
  }

  it('should validar as fotos das leituras antes de qualquer escrita', async () => {
    const { service, validarEvidenciasDisponiveis, criarTransformador } =
      montarBancada();

    await service.executar({
      payloadQr: payloadQr(),
      etapaCodigo: 'adesivacao',
      leituras: [leituraComFoto('foto-1')],
    });

    expect(validarEvidenciasDisponiveis).toHaveBeenCalledWith(['foto-1']);
    expect(
      validarEvidenciasDisponiveis.mock.invocationCallOrder[0],
    ).toBeLessThan(criarTransformador.mock.invocationCallOrder[0]);
  });

  it('should nao gravar nada quando a foto pertence a outra conferencia', async () => {
    // Antes: o 422 vinha de `criarComVeredito`, no meio do laco de campos, com
    // a conferencia ja criada — sobrava conferencia orfa com campos parciais,
    // ainda lida como "ultima conferencia" da peca pelo scan de passagem.
    const recusa = jest.fn<Promise<void>, [string[]]>(() =>
      Promise.reject(
        new UnprocessableEntityException({
          status: 422,
          errors: {
            fotoEvidenciaId: 'foto-evidencia-de-outra-conferencia: foto-1',
          },
        }),
      ),
    );
    const { service, criarTransformador, criarConferencia, criarComVeredito } =
      montarBancada({ validarEvidenciasDisponiveis: recusa });

    await expect(
      service.executar({
        payloadQr: payloadQr(),
        etapaCodigo: 'adesivacao',
        leituras: [leituraComFoto('foto-1')],
      }),
    ).rejects.toMatchObject({
      response: {
        errors: {
          fotoEvidenciaId: 'foto-evidencia-de-outra-conferencia: foto-1',
        },
      },
    });

    expect(criarTransformador).not.toHaveBeenCalled();
    expect(criarConferencia).not.toHaveBeenCalled();
    expect(criarComVeredito).not.toHaveBeenCalled();
  });

  it('should nao consultar evidencia nenhuma quando as leituras vem sem foto', async () => {
    const { service, validarEvidenciasDisponiveis } = montarBancada();

    await service.executar({
      payloadQr: payloadQr(),
      etapaCodigo: 'adesivacao',
      leituras: [
        { campo: 'serie-chumbada-topo', valorLido: '847233', confianca: 0.99 },
      ],
    });

    expect(validarEvidenciasDisponiveis).toHaveBeenCalledWith([]);
  });
});

describe('executar — a resposta diz DE ONDE a leitura saiu', () => {
  const FOTO_TOPO = fotoEvidencia('foto-topo', 'topo');
  const REGIAO = '{"Width":0.12,"Height":0.04,"Left":0.31,"Top":0.62}';

  function leitura(extra: Record<string, unknown> = {}) {
    return {
      campo: 'serie-chumbada-topo',
      valorLido: '847233',
      confianca: 0.99,
      corroboracao: 'confirmada' as const,
      ...extra,
    };
  }

  it('should devolver a foto-evidencia e a regiao junto do campo', async () => {
    const { service } = montarBancada({ evidencias: [FOTO_TOPO] });

    const resultado = await service.executar({
      payloadQr: payloadQr(),
      etapaCodigo: 'adesivacao',
      leituras: [
        leitura({ fotoEvidenciaId: 'foto-topo', regiaoLeitura: REGIAO }),
      ],
    });

    expect(resultado.campos[0]).toMatchObject({
      campo: 'serie-chumbada-topo',
      regiaoLeitura: REGIAO,
      fotoEvidencia: {
        id: 'foto-topo',
        url: 'foto-topo.jpg',
        fonteFisica: 'topo',
      },
    });
  });

  it('should montar a foto como INSTANCIA, sem a qual a url nao e assinada', async () => {
    // Objeto literal nao carrega metadado de decorator: sob FILE_DRIVER=s3 o
    // front receberia a key crua do bucket e a evidencia nao abriria.
    const { service } = montarBancada({ evidencias: [FOTO_TOPO] });

    const resultado = await service.executar({
      payloadQr: payloadQr(),
      etapaCodigo: 'adesivacao',
      leituras: [leitura({ fotoEvidenciaId: 'foto-topo' })],
    });

    expect(resultado.campos[0].fotoEvidencia).toBeInstanceOf(
      FotoDaEvidenciaResposta,
    );
  });

  it('should lastrear a resposta e o CampoConferido na MESMA leitura', async () => {
    // Resposta e lastro saindo de resolucoes separadas apontariam o operador
    // para uma foto que nao e a do veredito.
    const { service, criarComVeredito } = montarBancada({
      evidencias: [FOTO_TOPO],
    });

    const resultado = await service.executar({
      payloadQr: payloadQr(),
      etapaCodigo: 'adesivacao',
      leituras: [
        leitura({ fotoEvidenciaId: 'foto-topo', regiaoLeitura: REGIAO }),
      ],
    });

    expect(criarComVeredito).toHaveBeenCalledWith(
      expect.objectContaining({
        nomeCampo: 'serie-chumbada-topo',
        regiaoLeitura: REGIAO,
        fotoEvidenciaId: 'foto-topo',
      }),
    );
    expect(resultado.campos[0].fotoEvidencia?.id).toBe('foto-topo');
    expect(resultado.campos[0].regiaoLeitura).toBe(REGIAO);
  });

  it('should devolver nulos quando a leitura foi digitada sem foto', async () => {
    const { service, findByIdsEvidencias } = montarBancada();

    const resultado = await service.executar({
      payloadQr: payloadQr(),
      etapaCodigo: 'adesivacao',
      leituras: [leitura()],
    });

    expect(resultado.campos[0].fotoEvidencia).toBeNull();
    expect(resultado.campos[0].regiaoLeitura).toBeNull();
    // Sem foto citada, nem consulta acontece.
    expect(findByIdsEvidencias).not.toHaveBeenCalled();
  });

  it('should devolver fotoEvidencia null quando o id citado nao existe mais', async () => {
    // Mesma tolerancia de `criarComVeredito`: a evidencia e complementar ao
    // veredito, e um id velho nao pode derrubar um veredito legitimo.
    const { service } = montarBancada({ evidencias: [] });

    const resultado = await service.executar({
      payloadQr: payloadQr(),
      etapaCodigo: 'adesivacao',
      leituras: [leitura({ fotoEvidenciaId: 'foto-que-sumiu' })],
    });

    expect(resultado.campos[0].fotoEvidencia).toBeNull();
  });

  it('should carregar as evidencias do lote em UMA consulta, sem repetir id', async () => {
    const { service, findByIdsEvidencias } = montarBancada({
      evidencias: [FOTO_TOPO, fotoEvidencia('foto-placa', 'placa')],
    });

    await service.executar({
      payloadQr: payloadQr(),
      leituras: [
        leitura({ fotoEvidenciaId: 'foto-topo' }),
        {
          campo: 'patrimonio-serigrafia-frente',
          valorLido: '251328',
          confianca: 0.99,
          fotoEvidenciaId: 'foto-topo',
        },
        {
          campo: 'serie-placa',
          valorLido: '847233',
          confianca: 0.99,
          fotoEvidenciaId: 'foto-placa',
        },
      ],
    });

    expect(findByIdsEvidencias).toHaveBeenCalledTimes(1);
    expect(findByIdsEvidencias).toHaveBeenCalledWith([
      'foto-topo',
      'foto-placa',
    ]);
  });
});

describe('executar — contexto preparado nao e resolvido duas vezes', () => {
  it('should reaproveitar o contexto recebido sem reler projeto nem checklist', async () => {
    const {
      service,
      findAllProjetos,
      findByCodigoProjeto,
      criarConferencia,
      criarComVeredito,
    } = montarBancada();

    const contexto = await service.prepararExecucao({
      payloadQr: payloadQr(),
      etapaCodigo: 'adesivacao',
    });

    findAllProjetos.mockClear();
    findByCodigoProjeto.mockClear();

    const resultado = await service.executar(
      {
        payloadQr: payloadQr(),
        etapaCodigo: 'adesivacao',
        leituras: [
          {
            campo: 'serie-chumbada-topo',
            valorLido: '847233',
            confianca: 0.99,
          },
        ],
      },
      contexto,
    );

    // A resolucao de projeto aconteceu UMA vez, na preparacao.
    expect(findAllProjetos).not.toHaveBeenCalled();
    expect(findByCodigoProjeto).not.toHaveBeenCalled();

    expect(criarConferencia).toHaveBeenCalledTimes(1);
    expect(criarComVeredito).toHaveBeenCalledTimes(1);
    expect(resultado.conferencia.vereditoGeral).toBe('conforme');
    expect(resultado.camposAvaliados).toBe(1);
  });

  it('should criar a peca so depois de a preparacao passar', async () => {
    const { service, criarTransformador } = montarBancada();

    await service.executar({
      payloadQr: payloadQr(),
      etapaCodigo: 'adesivacao',
      leituras: [
        { campo: 'serie-chumbada-topo', valorLido: '847233', confianca: 0.99 },
      ],
    });

    expect(criarTransformador).toHaveBeenCalledTimes(1);
  });
});

// A FIACAO do modo de comparacao: os testes puros provam a regra, este prova
// que o `executar` de verdade entrega o mapa de modos a engine. Sem ele,
// esquecer o `modosPorCampo` na chamada de `conferir` passaria despercebido.
describe('executar — modo de comparacao chega a engine (cliente-* por contencao)', () => {
  const RAZAO_SOCIAL =
    '143091 - Energisa Rondônia Distribuidora de Energia S.A';

  /** Gate onde a serigrafia ja existe: cliente + patrimonio na frente. */
  const PROJETO_CLIENTE = projeto('EPT-CLIENTE', [
    {
      campo: 'cliente-serigrafia-frente',
      fonteFisica: 'frente',
      obrigatorio: true,
      etapa: 'serigrafia',
    },
    {
      campo: 'patrimonio-serigrafia-frente',
      fonteFisica: 'frente',
      obrigatorio: true,
      etapa: 'serigrafia',
    },
  ]);

  async function conferirCliente(valorLido: string) {
    const { service } = montarBancada({ projetos: [PROJETO_CLIENTE] });

    return service.executar({
      payloadQr: payloadQr({ cliente: RAZAO_SOCIAL }),
      etapaCodigo: 'serigrafia',
      leituras: [
        {
          campo: 'cliente-serigrafia-frente',
          valorLido,
          confianca: 0.9967,
        },
        {
          campo: 'patrimonio-serigrafia-frente',
          valorLido: '251328',
          confianca: 0.984,
        },
      ],
    });
  }

  it('should aprovar a marca serigrafada contra a razao social do QR', async () => {
    // O divergente FALSO medido no ar em 2026-07-26 (gap 21).
    const resultado = await conferirCliente('energisa');

    expect(resultado.campos[0]).toMatchObject({
      campo: 'cliente-serigrafia-frente',
      veredito: 'conforme',
    });
    expect(resultado.conferencia.vereditoGeral).toBe('conforme');
  });

  it('should seguir acusando cliente que nao esta na etiqueta', async () => {
    const resultado = await conferirCliente('cemig');

    expect(resultado.campos[0].veredito).toBe('divergente');
    expect(resultado.conferencia.vereditoGeral).toBe('divergente');
  });

  it('should gravar o veredito do cliente com o valor CRU lido', async () => {
    // O modo muda a comparacao, nunca o lastro: o que vai ao banco continua
    // sendo o texto que a visao leu.
    const { service, criarComVeredito } = montarBancada({
      projetos: [PROJETO_CLIENTE],
    });

    await service.executar({
      payloadQr: payloadQr({ cliente: RAZAO_SOCIAL }),
      etapaCodigo: 'serigrafia',
      leituras: [
        {
          campo: 'cliente-serigrafia-frente',
          valorLido: 'ENERGISA',
          confianca: 0.9967,
        },
      ],
    });

    expect(criarComVeredito).toHaveBeenCalledWith(
      expect.objectContaining({
        nomeCampo: 'cliente-serigrafia-frente',
        valorEsperado: RAZAO_SOCIAL,
        valorLido: 'ENERGISA',
        veredito: 'conforme',
      }),
    );
  });
});
