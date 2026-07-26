import { HttpStatus, UnprocessableEntityException } from '@nestjs/common';

import { criarExtractor } from '../extracao/adapters/extractor.factory';
import {
  CONFIANCA_MOCK,
  LEITURAS_DEMO,
  MockExtractor,
} from '../extracao/adapters/mock.extractor';
import { ExtracaoService } from '../extracao/extracao.service';
import {
  CampoAlvo,
  ExtractorPort,
  FonteImagem,
  ResultadoExtracao,
} from '../extracao/ports/extractor.port';
import { FileDriver } from '../files/config/file-config.type';
import { FotoEvidencia } from '../fotos-evidencia/domain/foto-evidencia';
import {
  ConteudoEvidencia,
  ehCaminhoDeDisco,
  FotosEvidenciaService,
} from '../fotos-evidencia/fotos-evidencia.service';
import { ProjetoModelo } from '../projetos-modelo/domain/projeto-modelo';

import {
  ConferenciaExecucaoService,
  ContextoExecucao,
  ResultadoExecucao,
} from './conferencia-execucao.service';
import { ConferenciaExtracaoService } from './conferencia-extracao.service';
import { ConferenciasService } from './conferencias.service';
import { Conferencia } from './domain/conferencia';
import { ExecutarConferenciaDto } from './dto/executar-conferencia.dto';
import { ItemChecklist } from './engine/tipos';

// Nota de lint: a regra `no-restricted-syntax` do projeto exige que todo `it`
// comece com "should"; o restante da frase segue o vocabulario de dominio.
//
// Nenhum teste desta suite toca AWS, disco ou banco: FotosEvidenciaService,
// ConferenciasService e ConferenciaExecucaoService entram dublados, e a visao
// roda pelo MockExtractor (driver default do projeto).
//
// O que esta suite protege: a ORDEM do fluxo com fotos. Todo 422 barato
// (payload, etapa, projeto, recorte, lote de evidencias) tem de acontecer
// ANTES de qualquer chamada paga de visao, e a evidencia usada tem de acabar
// amarrada a conferencia que ela lastreia.

/**
 * Checklist do desenho da peca de demo (EPT-163-PI-676), como no seed:
 * `fonteFisica` e a VISTA da peca, e o topo carrega DUAS marcacoes (serie
 * chumbada e patrimonio serigrafado).
 */
const CHECKLIST: ItemChecklist[] = [
  { campo: 'serie-chumbada-topo', fonteFisica: 'topo', obrigatorio: true },
  {
    campo: 'serie-chumbada-lateral-direita',
    fonteFisica: 'lateral-direita',
    obrigatorio: true,
  },
  {
    campo: 'serie-chumbada-traseira',
    fonteFisica: 'traseira',
    obrigatorio: true,
  },
  {
    campo: 'patrimonio-serigrafia-topo',
    fonteFisica: 'topo',
    obrigatorio: true,
  },
  {
    campo: 'patrimonio-serigrafia-frente',
    fonteFisica: 'frente',
    obrigatorio: true,
  },
  {
    campo: 'cliente-serigrafia-frente',
    fonteFisica: 'frente',
    obrigatorio: true,
  },
  { campo: 'serie-placa', fonteFisica: 'placa', obrigatorio: true },
  { campo: 'patrimonio-placa', fonteFisica: 'placa', obrigatorio: true },
];

/**
 * Recorte do gate da adesivacao: so as series chumbadas existem na peca. O
 * filtro casa pelo NOME do campo, nao pela vista — desde que `fonteFisica`
 * virou orientacao, uma vista pode conter marcacoes de etapas diferentes (o
 * topo tem serie chumbada da adesivacao E patrimonio da serigrafia).
 */
const RECORTE_ADESIVACAO = CHECKLIST.filter((item) =>
  item.campo.startsWith('serie-chumbada-'),
);

const PROJETO_MODELO: ProjetoModelo = {
  id: 'projeto-1',
  codigo: 'EPT-163-PI-676',
  descricao: 'Peca de demo',
  checklist: JSON.stringify(CHECKLIST),
  createdAt: new Date(),
  updatedAt: new Date(),
};

/** Etiqueta da peca de demo: serie e patrimonio batem com o mock. */
const PAYLOAD_QR = JSON.stringify({
  numeroSerie: '847233',
  patrimonio: '251328',
  cliente: '143091 - Energisa Rondônia Distribuidora de Energia S.A',
  codigoProjeto: 'EPT-163-PI-676',
});

const ID_PLACA = '11111111-1111-4111-8111-111111111111';
const ID_FRENTE = '22222222-2222-4222-8222-222222222222';
const ID_TOPO = '44444444-4444-4444-8444-444444444444';

const CONFERENCIA_CRIADA = { id: 'conferencia-1' } as Conferencia;

interface Chamada {
  fonteFisica: string;
  campos: string[];
  mimeType: string;
  bytes: string;
}

/** Dubla o adapter e registra as chamadas, delegando a leitura ao mock real. */
class ExtractorEspiao extends ExtractorPort {
  readonly nome = 'mock';

  readonly chamadas: Chamada[] = [];

  constructor(private readonly interno: MockExtractor = new MockExtractor()) {
    super();
  }

  extrair(fonte: FonteImagem, alvos: CampoAlvo[]): Promise<ResultadoExtracao> {
    this.chamadas.push({
      fonteFisica: fonte.fonteFisica,
      campos: alvos.map((alvo) => alvo.campo),
      mimeType: fonte.mimeType,
      bytes: fonte.imagem.toString(),
    });

    return this.interno.extrair(fonte, alvos);
  }
}

function foto(
  id: string,
  fonteFisica: string,
  conferencia: Conferencia | null = null,
): FotoEvidencia {
  return {
    id,
    url: `${id}.jpg`,
    fonteFisica,
    conferencia,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

const EVIDENCIAS_PADRAO: Record<string, FotoEvidencia | null> = {
  [ID_PLACA]: foto(ID_PLACA, 'placa'),
  [ID_FRENTE]: foto(ID_FRENTE, 'frente'),
};

interface Bancada {
  service: ConferenciaExtracaoService;
  espiao: ExtractorEspiao;
  prepararExecucao: jest.Mock<Promise<ContextoExecucao>, [unknown]>;
  executar: jest.Mock<
    Promise<ResultadoExecucao>,
    [ExecutarConferenciaDto, ContextoExecucao?]
  >;
  findById: jest.Mock<Promise<FotoEvidencia | null>, [string]>;
  lerConteudoDe: jest.Mock<Promise<ConteudoEvidencia>, [FotoEvidencia]>;
  vincularAConferencia: jest.Mock<Promise<number>, [string[], Conferencia]>;
  /** Ordem global das operacoes observaveis, para asserir "antes da visao". */
  trilha: string[];
}

function montarBancada(
  opcoes: {
    evidencias?: Record<string, FotoEvidencia | null>;
    extractor?: ExtractorPort;
    checklist?: ItemChecklist[];
    checkpointCodigo?: string;
    erroNaPreparacao?: unknown;
  } = {},
): Bancada {
  const evidencias = opcoes.evidencias ?? EVIDENCIAS_PADRAO;
  const extractor = opcoes.extractor ?? new ExtractorEspiao();
  const trilha: string[] = [];

  const findById = jest.fn((id: string) =>
    Promise.resolve(evidencias[id] ?? null),
  );

  const lerConteudoDe = jest.fn((registro: FotoEvidencia) => {
    trilha.push(`bytes:${registro.fonteFisica}`);
    return Promise.resolve({
      buffer: Buffer.from(`bytes-${registro.fonteFisica}`),
      mimeType: 'image/jpeg',
      fonteFisica: registro.fonteFisica,
    });
  });

  const vincularAConferencia = jest.fn<
    Promise<number>,
    [string[], Conferencia]
  >((ids) => {
    trilha.push(`vinculo:${ids.length}`);
    return Promise.resolve(ids.length);
  });

  const contexto: ContextoExecucao = {
    payload: {
      numeroSerie: '847233',
      patrimonio: '251328',
      cliente: 'Energisa',
    } as ContextoExecucao['payload'],
    checkpoint: opcoes.checkpointCodigo
      ? {
          id: 'checkpoint-1',
          codigo: opcoes.checkpointCodigo,
          nome: opcoes.checkpointCodigo,
          ordem: 1,
          createdAt: new Date(),
          updatedAt: new Date(),
        }
      : null,
    projetoModelo: PROJETO_MODELO,
    checklist: opcoes.checklist ?? CHECKLIST,
    transformadorExistente: null,
  };

  const prepararExecucao = jest.fn<Promise<ContextoExecucao>, [unknown]>(() => {
    trilha.push('preparacao');
    if (opcoes.erroNaPreparacao) {
      return Promise.reject(opcoes.erroNaPreparacao);
    }
    return Promise.resolve(contexto);
  });

  const resultadoExecucao: ResultadoExecucao = {
    conferencia: {
      id: CONFERENCIA_CRIADA.id,
      vereditoGeral: 'divergente',
      createdAt: new Date(),
      checkpoint: null,
    },
    transformador: {
      id: 'transformador-1',
      numeroSerie: '847233',
      patrimonio: '251328',
      cliente: 'Energisa',
      projetoModeloCodigo: 'EPT-163-PI-676',
    },
    etapaAvaliada: null,
    camposAvaliados: contexto.checklist.length,
    campos: [],
    incoerencias: [],
  };

  const executar = jest.fn<
    Promise<ResultadoExecucao>,
    [ExecutarConferenciaDto, ContextoExecucao?]
  >(() => {
    trilha.push('executar');
    return Promise.resolve(resultadoExecucao);
  });

  const service = new ConferenciaExtracaoService(
    {
      findById,
      lerConteudoDe,
      vincularAConferencia,
    } as unknown as FotosEvidenciaService,
    {
      findById: jest.fn(() => Promise.resolve(CONFERENCIA_CRIADA)),
    } as unknown as ConferenciasService,
    new ExtracaoService(extractor),
    { prepararExecucao, executar } as unknown as ConferenciaExecucaoService,
  );

  const espiao = extractor as ExtractorEspiao;
  const registrarChamada = espiao.extrair.bind(espiao);
  espiao.extrair = (fonte: FonteImagem, alvos: CampoAlvo[]) => {
    trilha.push(`visao:${fonte.fonteFisica}`);
    return registrarChamada(fonte, alvos);
  };

  return {
    service,
    espiao,
    prepararExecucao,
    executar,
    findById,
    lerConteudoDe,
    vincularAConferencia,
    trilha,
  };
}

describe('ConferenciaExtracaoService — visao plugada no fluxo', () => {
  it('should recusar com 422 quando a foto informada nao existe', async () => {
    const { service, espiao, executar } = montarBancada({
      evidencias: {
        [ID_PLACA]: foto(ID_PLACA, 'placa'),
        [ID_FRENTE]: null,
      },
    });

    await expect(
      service.executarComFotos({
        payloadQr: PAYLOAD_QR,
        fotoEvidenciaIds: [ID_PLACA, ID_FRENTE],
      }),
    ).rejects.toBeInstanceOf(UnprocessableEntityException);

    // Foto ausente derruba o lote ANTES de qualquer chamada paga de visao.
    expect(espiao.chamadas).toHaveLength(0);
    expect(executar).not.toHaveBeenCalled();
  });

  it('should apontar no erro qual foto nao existe', async () => {
    const { service } = montarBancada({ evidencias: { [ID_PLACA]: null } });

    await expect(
      service.executarComFotos({
        payloadQr: PAYLOAD_QR,
        fotoEvidenciaIds: [ID_PLACA],
      }),
    ).rejects.toMatchObject({
      response: {
        errors: {
          fotoEvidenciaIds: `foto-evidencia-inexistente: ${ID_PLACA}`,
        },
      },
    });
  });

  it('should chamar o extractor uma vez por foto, com os campos da fonte', async () => {
    const { service, espiao } = montarBancada();

    await service.executarComFotos({
      payloadQr: PAYLOAD_QR,
      fotoEvidenciaIds: [ID_PLACA, ID_FRENTE],
    });

    expect(espiao.chamadas).toHaveLength(2);
    expect(espiao.chamadas[0]).toMatchObject({
      fonteFisica: 'placa',
      campos: ['serie-placa', 'patrimonio-placa'],
      mimeType: 'image/jpeg',
      bytes: 'bytes-placa',
    });
    expect(espiao.chamadas[1].fonteFisica).toBe('frente');
  });

  it('should chamar a visao uma vez so quando o mesmo id vem repetido', async () => {
    const { service, espiao, findById } = montarBancada();

    await service.executarComFotos({
      payloadQr: PAYLOAD_QR,
      fotoEvidenciaIds: [ID_PLACA, ID_PLACA],
    });

    expect(findById).toHaveBeenCalledTimes(1);
    expect(espiao.chamadas).toHaveLength(1);
  });

  it('should repassar ao executar as leituras produzidas pela visao', async () => {
    const { service, executar } = montarBancada();

    await service.executarComFotos({
      payloadQr: PAYLOAD_QR,
      etapaCodigo: 'fixacao-placa',
      limiarConfianca: 0.7,
      fotoEvidenciaIds: [ID_PLACA, ID_FRENTE],
    });

    expect(executar).toHaveBeenCalledTimes(1);
    const dto = executar.mock.calls[0][0];

    expect(dto.payloadQr).toBe(PAYLOAD_QR);
    expect(dto.etapaCodigo).toBe('fixacao-placa');
    expect(dto.limiarConfianca).toBe(0.7);

    // Toda leitura chega com confianca e com o vinculo a foto de origem —
    // sem lastro, a conferencia nao seria auditavel (regra de ouro).
    expect(dto.leituras).toHaveLength(4);
    for (const leitura of dto.leituras) {
      expect(typeof leitura.confianca).toBe('number');
      expect(leitura.fotoEvidenciaId).toBeTruthy();
    }

    expect(
      dto.leituras.find((leitura) => leitura.campo === 'serie-placa'),
    ).toMatchObject({
      valorLido: LEITURAS_DEMO['serie-placa'],
      fotoEvidenciaId: ID_PLACA,
    });
    expect(
      dto.leituras.find(
        (leitura) => leitura.campo === 'cliente-serigrafia-frente',
      ),
    ).toMatchObject({ fotoEvidenciaId: ID_FRENTE });
  });

  it('should devolver o resultado do executar somado ao resumo da extracao', async () => {
    const { service } = montarBancada();

    const resultado = await service.executarComFotos({
      payloadQr: PAYLOAD_QR,
      fotoEvidenciaIds: [ID_PLACA, ID_FRENTE],
    });

    expect(resultado.conferencia.id).toBe('conferencia-1');
    expect(resultado.extracao).toEqual({
      driver: 'mock',
      fotos: 2,
      leiturasProduzidas: 4,
      fotosForaDoRecorte: 0,
      // Zero: achado livre e o texto que NAO virou leitura de campo, e neste
      // cenario todo texto do mock virou leitura (achado A4 — o mock ecoava os
      // proprios valores lidos, o oposto do que o Textract faz).
      achadosLivres: 0,
    });
  });

  it('should produzir as leituras da peca de demo com o driver default (mock)', async () => {
    // `criarExtractor()` sem EXTRACTOR_DRIVER e o caminho de producao em modo
    // mock: o sistema roda a conferencia ponta a ponta sem credencial AWS.
    const anterior = process.env.EXTRACTOR_DRIVER;
    delete process.env.EXTRACTOR_DRIVER;

    try {
      const { service, executar } = montarBancada({
        extractor: criarExtractor(),
      });

      const resultado = await service.executarComFotos({
        payloadQr: PAYLOAD_QR,
        fotoEvidenciaIds: [ID_PLACA, ID_FRENTE],
      });

      expect(resultado.extracao.driver).toBe('mock');

      const dto = executar.mock.calls[0][0];
      const porCampo = new Map(
        dto.leituras.map((leitura) => [leitura.campo, leitura.valorLido]),
      );

      // Cenario-ancora do SPEC: a placa mente (847833) e a serigrafia nao.
      expect(porCampo.get('serie-placa')).toBe('847833');
      expect(porCampo.get('patrimonio-placa')).toBe('251328');
      expect(porCampo.get('patrimonio-serigrafia-frente')).toBe('251328');
    } finally {
      if (anterior === undefined) {
        delete process.env.EXTRACTOR_DRIVER;
      } else {
        process.env.EXTRACTOR_DRIVER = anterior;
      }
    }
  });

  it('should seguir para o executar mesmo sem nenhuma leitura', async () => {
    // Foto de fonte fora do checklist nao gera chamada de visao; a conferencia
    // continua e a engine devolve nao_conferivel — nunca conforme.
    const ID_GERAL = '33333333-3333-4333-8333-333333333333';
    const { service, espiao, executar } = montarBancada({
      evidencias: { [ID_GERAL]: foto(ID_GERAL, 'geral') },
    });

    await service.executarComFotos({
      payloadQr: PAYLOAD_QR,
      fotoEvidenciaIds: [ID_GERAL],
    });

    expect(espiao.chamadas).toHaveLength(0);
    expect(executar).toHaveBeenCalledTimes(1);
    expect(executar.mock.calls[0][0].leituras).toEqual([]);
  });
});

describe('ConferenciaExtracaoService — 422 barato antes da visao (achado 4)', () => {
  it('should recusar etapa invalida sem ler bytes nem chamar o extractor', async () => {
    // '?etapa=Serigrafia' com S maiusculo: antes da correcao, as N chamadas de
    // Textract eram pagas e so entao vinha o 422.
    const { service, espiao, findById, lerConteudoDe, executar } =
      montarBancada({
        erroNaPreparacao: new UnprocessableEntityException({
          status: HttpStatus.UNPROCESSABLE_ENTITY,
          errors: { etapaCodigo: 'etapa-desconhecida: Serigrafia' },
        }),
      });

    await expect(
      service.executarComFotos({
        payloadQr: PAYLOAD_QR,
        etapaCodigo: 'Serigrafia',
        fotoEvidenciaIds: [ID_PLACA, ID_FRENTE],
      }),
    ).rejects.toMatchObject({
      response: { errors: { etapaCodigo: 'etapa-desconhecida: Serigrafia' } },
    });

    expect(findById).not.toHaveBeenCalled();
    expect(lerConteudoDe).not.toHaveBeenCalled();
    expect(espiao.chamadas).toHaveLength(0);
    expect(executar).not.toHaveBeenCalled();
  });

  it('should recusar recorte vazio sem chamar o extractor', async () => {
    const { service, espiao, executar } = montarBancada({
      erroNaPreparacao: new UnprocessableEntityException({
        status: HttpStatus.UNPROCESSABLE_ENTITY,
        errors: {
          etapaCodigo: 'etapa-sem-campos-conferiveis: nenhum item da checklist',
        },
      }),
    });

    await expect(
      service.executarComFotos({
        payloadQr: PAYLOAD_QR,
        etapaCodigo: 'adesivacao',
        fotoEvidenciaIds: [ID_PLACA],
      }),
    ).rejects.toMatchObject({
      response: {
        errors: {
          etapaCodigo: expect.stringContaining('etapa-sem-campos-conferiveis'),
        },
      },
    });

    expect(espiao.chamadas).toHaveLength(0);
    expect(executar).not.toHaveBeenCalled();
  });

  it('should preparar a conferencia antes de ler o primeiro byte', async () => {
    const { service, trilha } = montarBancada();

    await service.executarComFotos({
      payloadQr: PAYLOAD_QR,
      fotoEvidenciaIds: [ID_PLACA],
    });

    expect(trilha).toEqual([
      'preparacao',
      'bytes:placa',
      'visao:placa',
      'executar',
      'vinculo:1',
    ]);
  });

  it('should reutilizar no executar o MESMO contexto que guiou a visao', async () => {
    // Achado 12: a extracao lia a checklist por regra propria e a engine
    // avaliava outra resolucao de projeto. Agora e um contexto so.
    const { service, prepararExecucao, executar } = montarBancada();

    await service.executarComFotos({
      payloadQr: PAYLOAD_QR,
      etapaCodigo: 'fixacao-placa',
      fotoEvidenciaIds: [ID_PLACA],
    });

    expect(prepararExecucao).toHaveBeenCalledTimes(1);
    expect(prepararExecucao).toHaveBeenCalledWith({
      payloadQr: PAYLOAD_QR,
      etapaCodigo: 'fixacao-placa',
    });

    const contextoPreparado = await prepararExecucao.mock.results[0].value;
    expect(executar.mock.calls[0][1]).toBe(contextoPreparado);
  });
});

describe('ConferenciaExtracaoService — recorte da etapa filtra as fotos (achado 5)', () => {
  it('should nao pagar visao por foto cuja fonte esta fora do recorte', async () => {
    // Gate da adesivacao: so as series chumbadas existem na peca. A foto da
    // placa nao vira chamada — a engine descartaria a leitura de qualquer jeito.
    const { service, espiao, lerConteudoDe } = montarBancada({
      evidencias: {
        [ID_TOPO]: foto(ID_TOPO, 'topo'),
        [ID_PLACA]: foto(ID_PLACA, 'placa'),
      },
      checklist: RECORTE_ADESIVACAO,
      checkpointCodigo: 'adesivacao',
    });

    await service.executarComFotos({
      payloadQr: PAYLOAD_QR,
      etapaCodigo: 'adesivacao',
      fotoEvidenciaIds: [ID_TOPO, ID_PLACA],
    });

    expect(espiao.chamadas.map((chamada) => chamada.fonteFisica)).toEqual([
      'topo',
    ]);
    // Byte de foto fora do recorte nem sai do storage.
    expect(lerConteudoDe).toHaveBeenCalledTimes(1);
  });

  it('should contar no resumo so o que foi de fato enviado a visao', async () => {
    const { service } = montarBancada({
      evidencias: {
        [ID_TOPO]: foto(ID_TOPO, 'topo'),
        [ID_PLACA]: foto(ID_PLACA, 'placa'),
        [ID_FRENTE]: foto(ID_FRENTE, 'frente'),
      },
      checklist: RECORTE_ADESIVACAO,
      checkpointCodigo: 'adesivacao',
    });

    const resultado = await service.executarComFotos({
      payloadQr: PAYLOAD_QR,
      etapaCodigo: 'adesivacao',
      fotoEvidenciaIds: [ID_TOPO, ID_PLACA, ID_FRENTE],
    });

    expect(resultado.extracao.fotos).toBe(1);
    expect(resultado.extracao.fotosForaDoRecorte).toBe(2);
  });
});

describe('ConferenciaExtracaoService — evidencia amarrada a conferencia (achado 6)', () => {
  it('should recusar foto que ja pertence a OUTRA conferencia, antes da visao', async () => {
    const { service, espiao, lerConteudoDe, executar } = montarBancada({
      evidencias: {
        [ID_PLACA]: foto(ID_PLACA, 'placa', {
          id: 'conferencia-de-outra-peca',
        } as Conferencia),
      },
    });

    await expect(
      service.executarComFotos({
        payloadQr: PAYLOAD_QR,
        fotoEvidenciaIds: [ID_PLACA],
      }),
    ).rejects.toMatchObject({
      response: {
        errors: {
          fotoEvidenciaIds: `foto-evidencia-de-outra-conferencia: ${ID_PLACA}`,
        },
      },
    });

    expect(lerConteudoDe).not.toHaveBeenCalled();
    expect(espiao.chamadas).toHaveLength(0);
    expect(executar).not.toHaveBeenCalled();
  });

  it('should vincular a conferencia criada as fotos usadas', async () => {
    const { service, vincularAConferencia } = montarBancada();

    await service.executarComFotos({
      payloadQr: PAYLOAD_QR,
      fotoEvidenciaIds: [ID_PLACA, ID_FRENTE],
    });

    expect(vincularAConferencia).toHaveBeenCalledTimes(1);
    expect(vincularAConferencia.mock.calls[0][0]).toEqual([
      ID_PLACA,
      ID_FRENTE,
    ]);
    expect(vincularAConferencia.mock.calls[0][1]).toBe(CONFERENCIA_CRIADA);
  });

  it('should vincular so o que lastreou campo, deixando solta a foto fora do recorte', async () => {
    // A foto da placa segue reutilizavel no gate em que a placa passa a
    // existir na peca — ela nao lastreou campo nenhum aqui.
    const { service, vincularAConferencia } = montarBancada({
      evidencias: {
        [ID_TOPO]: foto(ID_TOPO, 'topo'),
        [ID_PLACA]: foto(ID_PLACA, 'placa'),
      },
      checklist: RECORTE_ADESIVACAO,
      checkpointCodigo: 'adesivacao',
    });

    await service.executarComFotos({
      payloadQr: PAYLOAD_QR,
      etapaCodigo: 'adesivacao',
      fotoEvidenciaIds: [ID_TOPO, ID_PLACA],
    });

    expect(vincularAConferencia.mock.calls[0][0]).toEqual([ID_TOPO]);
  });

  it('should vincular so DEPOIS de a conferencia existir', async () => {
    const { service, trilha } = montarBancada();

    await service.executarComFotos({
      payloadQr: PAYLOAD_QR,
      fotoEvidenciaIds: [ID_PLACA],
    });

    expect(trilha.indexOf('vinculo:1')).toBeGreaterThan(
      trilha.indexOf('executar'),
    );
  });

  it('should devolver o veredito mesmo se o vinculo da evidencia falhar', async () => {
    // O veredito ja esta gravado e e o produto do endpoint: derrubar a
    // resposta aqui perderia o resultado de uma visao ja paga.
    const { service, vincularAConferencia } = montarBancada();
    vincularAConferencia.mockRejectedValueOnce(new Error('banco fora do ar'));

    const resultado = await service.executarComFotos({
      payloadQr: PAYLOAD_QR,
      fotoEvidenciaIds: [ID_PLACA],
    });

    expect(resultado.conferencia.id).toBe('conferencia-1');
  });
});

// A conferencia de consistencia por achados livres (SPEC, Could): o extrator
// devolve TODO o texto que leu, o servico cruza contra o QR e alarma o que nao
// bate. A regra de ferro tem teste proprio aqui — alarme nunca vira veredito.
describe('ConferenciaExtracaoService — achados livres so alarmam', () => {
  /**
   * Mock que, alem das leituras da demo, "viu" na foto um texto que NENHUM
   * campo alvo consumiu — a definicao de achado livre nos dois adapters (no
   * Textract, `achadosDasLinhas` devolve exatamente as linhas nao consumidas).
   * Todo cenario de alarme precisa monta-lo explicitamente: valor que virou
   * leitura de campo nunca chega ao cruzamento (achado A4).
   */
  function espiaoComTextoExtra(texto: string): ExtractorEspiao {
    return new ExtractorEspiao(
      new MockExtractor(LEITURAS_DEMO, CONFIANCA_MOCK, [texto]),
    );
  }

  it('should devolver achadosInconsistentes vazio quando tudo bate com o QR', async () => {
    // A foto viu um numero a mais, mas ele e o patrimonio que a etiqueta
    // afirma: consistente com a fonte da verdade, nada a alarmar.
    const { service } = montarBancada({
      evidencias: { [ID_FRENTE]: foto(ID_FRENTE, 'frente') },
      extractor: espiaoComTextoExtra('251328'),
    });

    const resultado = await service.executarComFotos({
      payloadQr: PAYLOAD_QR,
      fotoEvidenciaIds: [ID_FRENTE],
    });

    expect(resultado.achadosInconsistentes).toEqual([]);
    // Vazio NAO e sinal de peca boa: o resumo mostra que houve texto lido.
    expect(resultado.extracao.achadosLivres).toBe(1);
  });

  it('should alarmar o numero que a visao viu e o QR nao conhece', async () => {
    const { service } = montarBancada({
      evidencias: { [ID_FRENTE]: foto(ID_FRENTE, 'frente') },
      extractor: espiaoComTextoExtra('999999'),
    });

    const resultado = await service.executarComFotos({
      payloadQr: PAYLOAD_QR,
      fotoEvidenciaIds: [ID_FRENTE],
    });

    expect(resultado.achadosInconsistentes).toEqual([
      {
        texto: '999999',
        ocorrencias: [
          {
            fotoEvidenciaId: ID_FRENTE,
            confianca: CONFIANCA_MOCK,
            regiaoLeitura: null,
          },
        ],
      },
    ]);
  });

  it('should alarmar a serie da placa da peca de demo, que diverge da etiqueta', async () => {
    // A peca fisica da demo tem placa 847833 contra etiqueta 847233. O alarme
    // pega o mesmo defeito que a checklist pega, mas por OUTRO caminho: o
    // 847833 aqui e um texto que a heuristica NAO consumiu como campo alvo
    // (ex.: a placa aparece de novo numa etiqueta interna da foto). Quando ele
    // vira a leitura de `serie-placa`, quem acusa e a engine — e o cenario e
    // montado explicitamente porque, no Textract, linha consumida por um alvo
    // nunca reaparece como achado livre (achado A4: antes o mock ecoava a
    // leitura e o teste passava so em modo mock).
    const { service } = montarBancada({
      evidencias: { [ID_PLACA]: foto(ID_PLACA, 'placa') },
      extractor: espiaoComTextoExtra('847833'),
    });

    const resultado = await service.executarComFotos({
      payloadQr: PAYLOAD_QR,
      fotoEvidenciaIds: [ID_PLACA],
    });

    expect(
      resultado.achadosInconsistentes.map((achado) => achado.texto),
    ).toEqual(['847833']);
  });

  it('should manter leituras e veredito IDENTICOS com e sem achado estranho', async () => {
    // Regra de ferro: achado livre nao entra na engine. As duas execucoes
    // diferem SO no texto extra que a visao viu.
    const semAchado = montarBancada({
      evidencias: { [ID_FRENTE]: foto(ID_FRENTE, 'frente') },
    });
    const comAchado = montarBancada({
      evidencias: { [ID_FRENTE]: foto(ID_FRENTE, 'frente') },
      extractor: espiaoComTextoExtra('999999'),
    });

    const antes = await semAchado.service.executarComFotos({
      payloadQr: PAYLOAD_QR,
      fotoEvidenciaIds: [ID_FRENTE],
    });
    const depois = await comAchado.service.executarComFotos({
      payloadQr: PAYLOAD_QR,
      fotoEvidenciaIds: [ID_FRENTE],
    });

    // O que a engine recebe e byte a byte o mesmo...
    expect(comAchado.executar.mock.calls[0][0].leituras).toEqual(
      semAchado.executar.mock.calls[0][0].leituras,
    );
    // ...e o que ela devolveu tambem.
    expect(depois.conferencia.vereditoGeral).toBe(
      antes.conferencia.vereditoGeral,
    );
    expect(depois.campos).toEqual(antes.campos);

    // A unica diferenca esta no canal de alarme.
    expect(antes.achadosInconsistentes).toEqual([]);
    expect(depois.achadosInconsistentes).toHaveLength(1);
  });

  it('should juntar em UM alarme o mesmo texto visto em duas fotos', async () => {
    const { service } = montarBancada({
      evidencias: {
        [ID_FRENTE]: foto(ID_FRENTE, 'frente'),
        [ID_TOPO]: foto(ID_TOPO, 'topo'),
      },
      extractor: espiaoComTextoExtra('999999'),
    });

    const resultado = await service.executarComFotos({
      payloadQr: PAYLOAD_QR,
      fotoEvidenciaIds: [ID_FRENTE, ID_TOPO],
    });

    expect(resultado.achadosInconsistentes).toHaveLength(1);
    expect(
      resultado.achadosInconsistentes[0].ocorrencias.map(
        (ocorrencia) => ocorrencia.fotoEvidenciaId,
      ),
    ).toEqual([ID_FRENTE, ID_TOPO]);
  });
});

// Vive nesta suite (e nao numa de fotos-evidencia) porque so existe para servir
// a extracao: e o que decide de onde vem o byte que a visao vai ler.
describe('ehCaminhoDeDisco — origem dos bytes da evidencia', () => {
  it('should ler do disco o caminho servido pelo modulo de files', () => {
    expect(ehCaminhoDeDisco('/api/v1/files/abc.jpg', FileDriver.LOCAL)).toBe(
      true,
    );
    expect(ehCaminhoDeDisco('files/abc.jpg', FileDriver.LOCAL)).toBe(true);
  });

  it('should ler do disco a evidencia anterior a virada para s3', () => {
    // Upload feito sob FILE_DRIVER=local: a key nao existe no bucket, e
    // decidir so pelo driver atual daria 500 nas fotos da peca de demo.
    expect(
      ehCaminhoDeDisco('/api/v1/files/07099539c76.webp', FileDriver.S3),
    ).toBe(true);
  });

  it('should tratar como key de bucket a evidencia enviada sob s3', () => {
    // multer-s3 nomeia a key com hash chapado, sem barra.
    expect(ehCaminhoDeDisco('c3ff4dbbf11b6d84e39.jpg', FileDriver.S3)).toBe(
      false,
    );
    expect(
      ehCaminhoDeDisco('c3ff4dbbf11b6d84e39.jpg', FileDriver.S3_PRESIGNED),
    ).toBe(false);
  });

  it('should tratar key de bucket como s3 mesmo sob FILE_DRIVER=local', () => {
    // Achado 13: dev local apontando para o RDS (cenario documentado) tem o
    // banco cheio de key S3; mandar hash chapado para o readFile e 500 certo.
    expect(ehCaminhoDeDisco('c3ff4dbbf11b.jpg', FileDriver.LOCAL)).toBe(false);
  });

  it('should deixar o driver desempatar so a forma ambigua de verdade', () => {
    // Caminho com diretorio que NAO e a pasta servida pelo modulo de files:
    // key com prefixo (s3) x caminho customizado (disco).
    expect(ehCaminhoDeDisco('evidencias/2026/abc.jpg', FileDriver.LOCAL)).toBe(
      true,
    );
    expect(ehCaminhoDeDisco('evidencias/2026/abc.jpg', FileDriver.S3)).toBe(
      false,
    );
  });
});
